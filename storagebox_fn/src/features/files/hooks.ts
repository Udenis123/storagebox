import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { StoredFile } from "@/lib/types";
import {
  createCollection,
  createSignedLink,
  deleteCollection,
  deleteFiles,
  getFile,
  listCollections,
  listFiles,
  updateCollection,
  updateFile,
  type CollectionInput,
  type FileListParams,
  type UpdateFileInput,
} from "./api";

const SIGNED_PREVIEW_SECONDS = 3600;
const SIGNED_PREVIEW_STALE_MS = 50 * 60 * 1000;

const assetQueries = [queryKeys.files, queryKeys.collections, queryKeys.usage];

export function useFiles(params: FileListParams) {
  return useQuery({
    queryKey: queryKeys.fileList(params),
    queryFn: async () => (await listFiles(params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useFile(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.files, "detail", id],
    queryFn: async () => (await getFile(id!)).data,
    enabled: Boolean(id),
  });
}

export function useCollections() {
  return useQuery({ queryKey: queryKeys.collections, queryFn: async () => (await listCollections()).data });
}

/**
 * URL the browser can load for a file: the permanent link for public files, a short-lived signed
 * link for private ones. `transform` is applied to images only (thumbnails).
 */
export function useViewUrl(file: StoredFile | null, transform = "") {
  const isTransformed = Boolean(transform) && file?.kind === "image" && file.ext !== "svg";
  const appliedTransform = isTransformed ? transform : "";
  const publicUrl = file?.url && appliedTransform ? file.url.replace(/\/([^/]+)$/, `/${appliedTransform}/$1`) : file?.url;

  const signed = useQuery({
    queryKey: queryKeys.signedLink(file?.id ?? "", appliedTransform, SIGNED_PREVIEW_SECONDS),
    queryFn: async () =>
      (await createSignedLink(file!.id, { expiresIn: SIGNED_PREVIEW_SECONDS, transform: appliedTransform || undefined })).data.url,
    enabled: Boolean(file) && !file?.url,
    staleTime: SIGNED_PREVIEW_STALE_MS,
  });
  return { url: publicUrl ?? signed.data, isLoading: !publicUrl && signed.isLoading };
}

export const useUpdateFile = (onSuccess?: (file: StoredFile) => void) =>
  useApiMutation(({ id, input }: { id: string; input: UpdateFileInput }) => updateFile(id, input), {
    invalidate: assetQueries,
    onSuccess,
  });

export const useDeleteFiles = (onSuccess?: () => void) =>
  useApiMutation((ids: string[]) => deleteFiles(ids), { invalidate: assetQueries, onSuccess });

export const useCreateCollection = (onSuccess?: () => void) =>
  useApiMutation((input: CollectionInput) => createCollection(input), { invalidate: [queryKeys.collections], onSuccess });

export const useUpdateCollection = (onSuccess?: () => void) =>
  useApiMutation(({ id, name, access }: { id: string; name?: string; access?: "PUBLIC" | "PRIVATE" }) => updateCollection(id, { name, access }), {
    invalidate: assetQueries,
    onSuccess,
  });

export const useDeleteCollection = (onSuccess?: () => void) =>
  useApiMutation(({ id, isForced }: { id: string; isForced: boolean }) => deleteCollection(id, isForced), {
    invalidate: assetQueries,
    onSuccess,
  });
