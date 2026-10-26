import { Request, Response } from 'express';
import status from 'http-status';
import {
  createCollection,
  deleteCollection,
  getCollectionSharing,
  listCollections,
  setCollectionSharing,
  updateCollection,
} from '@/services/collectionService';
import catchAsync from '@/utils/catchAsync';
import { currentContext, param } from '@/utils/request';
import { sendResponse } from '@/utils/response';

export const listCollectionsHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await listCollections(currentContext(req));
  sendResponse(res, status.OK, result.message, result.data);
});

export const createCollectionHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await createCollection(currentContext(req), req.body);
  sendResponse(res, status.CREATED, result.message, result.data);
});

export const updateCollectionHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await updateCollection(currentContext(req), param(req, 'id'), req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

export const deleteCollectionHandler = catchAsync(async (req: Request, res: Response) => {
  const isForced = (req.query as { force?: boolean }).force === true;
  const result = await deleteCollection(currentContext(req), param(req, 'id'), isForced);
  sendResponse(res, status.OK, result.message, result.data);
});

export const getSharingHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await getCollectionSharing(currentContext(req), param(req, 'id'));
  sendResponse(res, status.OK, result.message, result.data);
});

export const shareCollectionHandler = catchAsync(async (req: Request, res: Response) => {
  const allowDownload = typeof req.body?.allowDownload === 'boolean' ? req.body.allowDownload : undefined;
  const result = await setCollectionSharing(currentContext(req), param(req, 'id'), { isShared: true, allowDownload });
  sendResponse(res, status.OK, result.message, result.data);
});

export const unshareCollectionHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await setCollectionSharing(currentContext(req), param(req, 'id'), { isShared: false });
  sendResponse(res, status.OK, result.message, result.data);
});
