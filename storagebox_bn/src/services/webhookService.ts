import status from 'http-status';
import prisma from '@/config/prisma';
import logger from '@/config/logger';
import { AccountContext, WebhookDto, WebhookEvent } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { hmacHex, randomToken } from '@/utils/crypto';
import { toWebhookDto } from '@/utils/dto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { ServiceResult } from '@/utils/response';
import { logActivity } from './activityService';

const DELIVERY_TIMEOUT_MS = 5_000;

export interface WebhookInput {
  url: string;
  events: WebhookEvent[];
  isActive?: boolean;
}

async function findWebhook(ctx: AccountContext, id: string) {
  const webhook = await prisma.webhook.findFirst({ where: { id, accountId: ctx.accountId } });
  if (!webhook) throw new ApiError(status.NOT_FOUND, 'Webhook not found', ERROR_CODES.WEBHOOK_NOT_FOUND);
  return webhook;
}

export async function listWebhooks(ctx: AccountContext): Promise<ServiceResult<WebhookDto[]>> {
  const webhooks = await prisma.webhook.findMany({ where: { accountId: ctx.accountId }, orderBy: { createdAt: 'desc' } });
  return { message: 'Webhooks retrieved', data: webhooks.map(toWebhookDto) };
}

export async function createWebhook(ctx: AccountContext, input: WebhookInput): Promise<ServiceResult<WebhookDto>> {
  const webhook = await prisma.webhook.create({
    data: { accountId: ctx.accountId, url: input.url, events: input.events, secret: `whsec_${randomToken(24)}` },
  });
  logActivity(ctx, 'webhook.created', input.url);
  return { message: 'Webhook created', data: toWebhookDto(webhook) };
}

export async function updateWebhook(
  ctx: AccountContext,
  id: string,
  input: Partial<WebhookInput>,
): Promise<ServiceResult<WebhookDto>> {
  await findWebhook(ctx, id);
  const webhook = await prisma.webhook.update({ where: { id }, data: input });
  return { message: 'Webhook updated', data: toWebhookDto(webhook) };
}

export async function deleteWebhook(ctx: AccountContext, id: string): Promise<ServiceResult<null>> {
  const webhook = await findWebhook(ctx, id);
  await prisma.webhook.delete({ where: { id } });
  logActivity(ctx, 'webhook.deleted', webhook.url);
  return { message: 'Webhook deleted', data: null };
}

async function deliver(webhookId: string, url: string, secret: string, event: string, data: unknown): Promise<number> {
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data });
  let responseStatus = 0;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-storagebox-event': event,
        'x-storagebox-signature': hmacHex(secret, body),
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    responseStatus = response.status;
  } catch (error) {
    logger.warn(`Webhook delivery to ${url} failed`, error);
  }
  await prisma.webhook.update({ where: { id: webhookId }, data: { lastStatus: responseStatus, lastAttemptAt: new Date() } });
  return responseStatus;
}

/** Fire-and-forget: webhook receivers must never slow down or fail the request that triggered them. */
export function dispatchWebhooks(accountId: string, event: WebhookEvent, data: unknown): void {
  prisma.webhook
    .findMany({ where: { accountId, isActive: true, events: { has: event } } })
    .then((webhooks) => Promise.allSettled(webhooks.map((hook) => deliver(hook.id, hook.url, hook.secret, event, data))))
    .catch((error: unknown) => logger.warn('Webhook dispatch failed', error));
}

export async function testWebhook(ctx: AccountContext, id: string): Promise<ServiceResult<{ status: number }>> {
  const webhook = await findWebhook(ctx, id);
  const responseStatus = await deliver(webhook.id, webhook.url, webhook.secret, 'webhook.test', {
    message: 'Hello from StorageBox',
    cloudName: ctx.cloudName,
  });
  const isDelivered = responseStatus >= 200 && responseStatus < 300;
  return {
    message: isDelivered ? 'Test event delivered' : `Test event failed (status ${responseStatus || 'no response'})`,
    data: { status: responseStatus },
  };
}
