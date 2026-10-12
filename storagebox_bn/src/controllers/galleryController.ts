import { Request, Response } from 'express';
import status from 'http-status';
import { getSharedGallery } from '@/services/galleryService';
import { FileKind } from '@/types/api';
import catchAsync from '@/utils/catchAsync';
import { param } from '@/utils/request';
import { sendResponse } from '@/utils/response';

const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 100;
const GALLERY_KINDS: FileKind[] = ['image', 'video', 'document', 'audio', 'archive'];
/** Owners see sharing and access changes within a minute. */
const GALLERY_CACHE = 'public, max-age=60';

const positiveInt = (value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

export const galleryHandler = catchAsync(async (req: Request, res: Response) => {
  const kind = GALLERY_KINDS.find((item) => item === req.query.kind);
  const gallery = await getSharedGallery(param(req, 'token'), {
    folder: typeof req.query.folder === 'string' ? req.query.folder : undefined,
    kind,
    page: positiveInt(req.query.page, 1),
    pageSize: positiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  });
  res.setHeader('Cache-Control', GALLERY_CACHE);
  sendResponse(res, status.OK, 'Gallery retrieved', gallery);
});
