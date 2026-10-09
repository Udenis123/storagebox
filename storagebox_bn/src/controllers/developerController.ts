import { Request, Response } from 'express';
import status from 'http-status';
import { listActivity } from '@/services/activityService';
import { createApiKey, listApiKeys, revokeApiKey } from '@/services/apiKeyService';
import { getUsageSummary } from '@/services/usageService';
import { createWebhook, deleteWebhook, listWebhooks, testWebhook, updateWebhook } from '@/services/webhookService';
import catchAsync from '@/utils/catchAsync';
import { currentContext, param } from '@/utils/request';
import { sendResponse } from '@/utils/response';

export const listApiKeysHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await listApiKeys(currentContext(req));
  sendResponse(res, status.OK, result.message, result.data);
});

export const createApiKeyHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await createApiKey(currentContext(req), req.body);
  sendResponse(res, status.CREATED, result.message, result.data);
});

export const revokeApiKeyHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await revokeApiKey(currentContext(req), param(req, 'id'));
  sendResponse(res, status.OK, result.message, result.data);
});

export const listWebhooksHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await listWebhooks(currentContext(req));
  sendResponse(res, status.OK, result.message, result.data);
});

export const createWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await createWebhook(currentContext(req), req.body);
  sendResponse(res, status.CREATED, result.message, result.data);
});

export const updateWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await updateWebhook(currentContext(req), param(req, 'id'), req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

export const deleteWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await deleteWebhook(currentContext(req), param(req, 'id'));
  sendResponse(res, status.OK, result.message, result.data);
});

export const testWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await testWebhook(currentContext(req), param(req, 'id'));
  sendResponse(res, status.OK, result.message, result.data);
});

export const usageHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await getUsageSummary(currentContext(req));
  sendResponse(res, status.OK, result.message, result.data);
});

export const activityHandler = catchAsync(async (req: Request, res: Response) => {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const result = await listActivity(currentContext(req), page, pageSize);
  sendResponse(res, status.OK, result.message, result.data);
});
