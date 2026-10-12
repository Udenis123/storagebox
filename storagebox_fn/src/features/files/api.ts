import { apiFetch, jsonBody, queryString } from "@/lib/api";
import type { Collection, FileAccess, FileKind, Paginated, StoredFile } from "@/lib/types";

export type FileSort = "newest" | "oldest" | "name" | "largest" | "smallest";

export type FileListParams = {
  collectionId?: string;
  search?: string;
  kind?: FileKind;
  access?: FileAccess;
  sort: FileSort;
  page: number;
  pageSize: number;
};

export type UpdateFileInput = {
  originalName?: string;
  publicId?: string;
  collectionId?: string | null;
  access?: FileAccess;
  tags?: string[];
};

export type SignedLinkInput = { expiresIn: number; transform?: string; download?: boolean };
export type SignedLink = { url: string; expiresAt: string };

export const listFiles = (params: FileListParams) => apiFetch<Paginated<StoredFile>>(`/files${queryString(params)}`);

export const getFile = (id: string) => apiFetch<StoredFile>(`/files/${id}`);

export const updateFile = (id: string, input: UpdateFileInput) =>
  apiFetch<StoredFile>(`/files/${id}`, { method: "PATCH", body: jsonBody(input) });

export const deleteFiles = (ids: string[]) =>
  apiFetch<{ deleted: number }>("/files/bulk-delete", { method: "POST", body: jsonBody({ ids }) });

export const createSignedLink = (id: string, input: SignedLinkInput) =>
  apiFetch<SignedLink>(`/files/${id}/signed-url`, { method: "POST", body: jsonBody(input) });

export type CollectionInput = { name: string; parentId?: string; access?: FileAccess };

export const listCollections = () => apiFetch<Collection[]>("/collections");

export const createCollection = (input: CollectionInput) =>
  apiFetch<Collection>("/collections", { method: "POST", body: jsonBody(input) });

export const setFilesAccess = (ids: string[], access: FileAccess) =>
  apiFetch<{ updated: number }>("/files/bulk-access", { method: "POST", body: jsonBody({ ids, access }) });

/** `applyToFiles` also sets `access` on every file in the collection and its sub-collections. */
export type UpdateCollectionInput = { name?: string; access?: FileAccess; applyToFiles?: boolean };

export const updateCollection = (id: string, input: UpdateCollectionInput) =>
  apiFetch<Collection>(`/collections/${id}`, { method: "PATCH", body: jsonBody(input) });

export const deleteCollection = (id: string, isForced: boolean) =>
  apiFetch<{ deletedFiles: number }>(`/collections/${id}${queryString({ force: isForced ? "true" : undefined })}`, {
    method: "DELETE",
  });
