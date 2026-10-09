import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { ApiKeyScope, CreatedApiKey, UpdateAccountInput } from "@/lib/types";
import {
  createApiKey,
  createWebhook,
  deleteWebhook,
  getPlatformStats,
  getUsage,
  listAccounts,
  listActivity,
  listApiKeys,
  listWebhooks,
  revokeApiKey,
  testWebhook,
  updateAccount,
  updateWebhook,
  type WebhookInput,
} from "./api";

export const ACTIVITY_PAGE_SIZE = 25;

export const useUsage = () => useQuery({ queryKey: queryKeys.usage, queryFn: async () => (await getUsage()).data });

export const useApiKeys = () => useQuery({ queryKey: queryKeys.apiKeys, queryFn: async () => (await listApiKeys()).data });

export const useCreateApiKey = (onSuccess: (key: CreatedApiKey) => void) =>
  useApiMutation((input: { name: string; scope: ApiKeyScope }) => createApiKey(input), {
    invalidate: [queryKeys.apiKeys, queryKeys.usage],
    onSuccess,
  });

export const useRevokeApiKey = () =>
  useApiMutation((id: string) => revokeApiKey(id), { invalidate: [queryKeys.apiKeys, queryKeys.usage] });

export const useWebhooks = () => useQuery({ queryKey: queryKeys.webhooks, queryFn: async () => (await listWebhooks()).data });

export const useCreateWebhook = (onSuccess: () => void) =>
  useApiMutation((input: WebhookInput) => createWebhook(input), { invalidate: [queryKeys.webhooks], onSuccess });

export const useUpdateWebhook = () =>
  useApiMutation(
    ({ id, ...input }: { id: string; isActive?: boolean } & Partial<WebhookInput>) => updateWebhook(id, input),
    { invalidate: [queryKeys.webhooks] },
  );

export const useDeleteWebhook = () => useApiMutation((id: string) => deleteWebhook(id), { invalidate: [queryKeys.webhooks] });

export const useTestWebhook = () => useApiMutation((id: string) => testWebhook(id), { invalidate: [queryKeys.webhooks] });

export const useActivity = (page: number) =>
  useQuery({
    queryKey: queryKeys.activity(page),
    queryFn: async () => (await listActivity(page, ACTIVITY_PAGE_SIZE)).data,
    placeholderData: keepPreviousData,
  });

export const usePlatformStats = (isEnabled = true) =>
  useQuery({ queryKey: queryKeys.adminStats, queryFn: async () => (await getPlatformStats()).data, enabled: isEnabled });

export const useAdminAccounts = () =>
  useQuery({ queryKey: queryKeys.adminAccounts, queryFn: async () => (await listAccounts()).data });

export const useUpdateAccount = () =>
  useApiMutation(({ id, ...input }: UpdateAccountInput & { id: string }) => updateAccount(id, input), {
    invalidate: [queryKeys.adminAccounts, queryKeys.adminStats],
  });
