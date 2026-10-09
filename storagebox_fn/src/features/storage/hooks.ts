import { useQuery } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useUsage } from "@/features/developer/hooks";
import { percentOf } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import type { RequestStorageInput, ReviewStorageRequestInput } from "@/lib/types";
import { getLatestStorageRequest, listStorageRequests, requestStorage, reviewStorageRequest } from "./api";

export const STORAGE_WARNING_PERCENT = 80;
export const STORAGE_CRITICAL_PERCENT = 95;

export type StorageLevel = "ok" | "warning" | "critical" | "full";

const levelOf = (percent: number): StorageLevel =>
  percent >= 100 ? "full" : percent >= STORAGE_CRITICAL_PERCENT ? "critical" : percent >= STORAGE_WARNING_PERCENT ? "warning" : "ok";

/** Current usage against quota, plus how urgent it is to ask for more space. */
export function useStorageHealth() {
  const { data: usage } = useUsage();
  if (!usage) return null;
  const percent = percentOf(usage.storageBytes, usage.quotaBytes);
  return {
    usedBytes: usage.storageBytes,
    quotaBytes: usage.quotaBytes,
    freeBytes: Math.max(usage.quotaBytes - usage.storageBytes, 0),
    percent,
    level: levelOf(percent),
  };
}

export const useLatestStorageRequest = () =>
  useQuery({ queryKey: queryKeys.storageRequest, queryFn: async () => (await getLatestStorageRequest()).data });

export const useRequestStorage = (onSuccess?: () => void) =>
  useApiMutation((input: RequestStorageInput) => requestStorage(input), { invalidate: [queryKeys.storageRequest], onSuccess });

export const useAdminStorageRequests = () =>
  useQuery({ queryKey: queryKeys.adminStorageRequests, queryFn: async () => (await listStorageRequests()).data });

export const useReviewStorageRequest = (onSuccess?: () => void) =>
  useApiMutation(({ id, ...input }: ReviewStorageRequestInput & { id: string }) => reviewStorageRequest(id, input), {
    invalidate: [queryKeys.adminStorageRequests, queryKeys.adminStats, queryKeys.adminAccounts],
    onSuccess,
  });
