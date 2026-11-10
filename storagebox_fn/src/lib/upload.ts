import { ApiRequestError, refreshSessionOnce, type ApiResult } from "./api";
import { DASHBOARD_API_URL } from "./constants";
import { sessionStore } from "./session";
import type { FileAccess, StoredFile } from "./types";

export type UploadOptions = {
  collectionId?: string;
  /** Collection path such as `photos/2026`; missing collections are created. Takes priority over `collectionId`. */
  collection?: string;
  access?: FileAccess;
  tags?: string;
};

const UNAUTHORIZED = 401;

function postFormWithProgress(
  path: string,
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${DASHBOARD_API_URL}${path}`);
    const token = sessionStore.get()?.accessToken;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new ApiRequestError("Upload failed — check your connection", 0));
    xhr.send(form);
  });
}

async function postAuthenticatedForm<T>(
  path: string,
  form: FormData,
  onProgress: (percent: number) => void,
  fallbackMessage: string,
): Promise<ApiResult<T>> {
  let result = await postFormWithProgress(path, form, onProgress);
  if (result.status === UNAUTHORIZED && (await refreshSessionOnce())) {
    result = await postFormWithProgress(path, form, onProgress);
  }

  const envelope = result.body as { status?: string; message?: string; data?: T; errorCode?: string } | null;
  if (result.status >= 300 || envelope?.status !== "success") {
    throw new ApiRequestError(envelope?.message ?? `${fallbackMessage} (${result.status})`, result.status, envelope?.errorCode);
  }
  return { message: envelope.message ?? fallbackMessage, data: envelope.data as T };
}

/** fetch() cannot report upload progress, so file uploads go through XHR with the same refresh-on-401 rule. */
export async function uploadFile(
  file: File,
  options: UploadOptions,
  onProgress: (percent: number) => void,
): Promise<ApiResult<StoredFile[]>> {
  const form = new FormData();
  form.append("file", file);
  if (options.collection) form.append("collection", options.collection);
  else if (options.collectionId) form.append("collectionId", options.collectionId);
  if (options.access) form.append("access", options.access);
  if (options.tags) form.append("tags", options.tags);

  return postAuthenticatedForm<StoredFile[]>("/files", form, onProgress, "Upload failed");
}

/** Replace stored bytes while keeping the same publicId and share URL (same extension required). */
export async function replaceFileContent(
  fileId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<ApiResult<StoredFile>> {
  const form = new FormData();
  form.append("file", file);
  return postAuthenticatedForm<StoredFile>(`/files/${encodeURIComponent(fileId)}/replace`, form, onProgress, "Replace failed");
}
