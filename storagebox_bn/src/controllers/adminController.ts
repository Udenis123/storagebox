import { Request, Response } from 'express';
import status from 'http-status';
import { getPlatformStats, listAccounts, updateAccount } from '@/services/adminService';
import {
  getLatestStorageRequest,
  listPendingStorageRequests,
  requestStorage,
  reviewStorageRequest,
} from '@/services/storageRequestService';
import catchAsync from '@/utils/catchAsync';
import { currentContext, param } from '@/utils/request';
import { sendResponse } from '@/utils/response';

export const listAccountsHandler = catchAsync(async (_req: Request, res: Response) => {
  const result = await listAccounts();
  sendResponse(res, status.OK, result.message, result.data);
});

export const updateAccountHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await updateAccount(currentContext(req), param(req, 'id'), req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

export const platformStatsHandler = catchAsync(async (_req: Request, res: Response) => {
  const result = await getPlatformStats();
  sendResponse(res, status.OK, result.message, result.data);
});

export const listStorageRequestsHandler = catchAsync(async (_req: Request, res: Response) => {
  const result = await listPendingStorageRequests();
  sendResponse(res, status.OK, result.message, result.data);
});

export const reviewStorageRequestHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewStorageRequest(currentContext(req), param(req, 'id'), req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

export const latestStorageRequestHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await getLatestStorageRequest(currentContext(req));
  sendResponse(res, status.OK, result.message, result.data);
});

export const requestStorageHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await requestStorage(currentContext(req), req.body);
  sendResponse(res, status.CREATED, result.message, result.data);
});
