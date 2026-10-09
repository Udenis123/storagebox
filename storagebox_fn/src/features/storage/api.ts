import { apiFetch, jsonBody } from "@/lib/api";
import type { AdminStorageRequest, RequestStorageInput, ReviewStorageRequestInput, StorageRequest } from "@/lib/types";

export const getLatestStorageRequest = () => apiFetch<StorageRequest | null>("/storage-requests/latest");
export const requestStorage = (input: RequestStorageInput) =>
  apiFetch<StorageRequest>("/storage-requests", { method: "POST", body: jsonBody(input) });

export const listStorageRequests = () => apiFetch<AdminStorageRequest[]>("/admin/storage-requests");
export const reviewStorageRequest = (id: string, input: ReviewStorageRequestInput) =>
  apiFetch<StorageRequest>(`/admin/storage-requests/${id}`, { method: "PATCH", body: jsonBody(input) });
