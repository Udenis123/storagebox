import { apiFetch, jsonBody, queryString } from "@/lib/api";
import type {
  ActivityEntry,
  AdminAccount,
  ApiKey,
  ApiKeyScope,
  CreatedApiKey,
  Paginated,
  PlatformStats,
  UsageSummary,
  Webhook,
  WebhookEvent,
} from "@/lib/types";

export const getUsage = () => apiFetch<UsageSummary>("/usage");

export const listApiKeys = () => apiFetch<ApiKey[]>("/keys");
export const createApiKey = (input: { name: string; scope: ApiKeyScope }) =>
  apiFetch<CreatedApiKey>("/keys", { method: "POST", body: jsonBody(input) });
export const revokeApiKey = (id: string) => apiFetch<ApiKey>(`/keys/${id}/revoke`, { method: "POST" });

export type WebhookInput = { url: string; events: WebhookEvent[] };

export const listWebhooks = () => apiFetch<Webhook[]>("/webhooks");
export const createWebhook = (input: WebhookInput) =>
  apiFetch<Webhook>("/webhooks", { method: "POST", body: jsonBody(input) });
export const updateWebhook = (id: string, input: Partial<WebhookInput> & { isActive?: boolean }) =>
  apiFetch<Webhook>(`/webhooks/${id}`, { method: "PATCH", body: jsonBody(input) });
export const deleteWebhook = (id: string) => apiFetch<null>(`/webhooks/${id}`, { method: "DELETE" });
export const testWebhook = (id: string) => apiFetch<{ status: number }>(`/webhooks/${id}/test`, { method: "POST" });

export const listActivity = (page: number, pageSize: number) =>
  apiFetch<Paginated<ActivityEntry>>(`/activity${queryString({ page, pageSize })}`);

export const getPlatformStats = () => apiFetch<PlatformStats>("/admin/stats");
export const listAccounts = () => apiFetch<AdminAccount[]>("/admin/accounts");
export const updateAccount = (id: string, input: { quotaGb?: number; isSuspended?: boolean }) =>
  apiFetch<{ id: string }>(`/admin/accounts/${id}`, { method: "PATCH", body: jsonBody(input) });
