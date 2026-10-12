import { Request, Response } from 'express';
import status from 'http-status';
import { fetchRemoteFile } from '@/lib/remoteFetch';
import { removeTempFiles } from '@/lib/tempFiles';
import { deliverOwnFile } from '@/services/deliveryService';
import {
  createSignedLink,
  deleteFiles,
  FileRef,
  findFileRecord,
  setFilesAccess,
  getFile,
  listFiles,
  ListFilesQuery,
  updateFile,
  UploadSource,
  uploadFiles,
} from '@/services/fileService';
import catchAsync from '@/utils/catchAsync';
import { currentContext, param } from '@/utils/request';
import { sendResponse } from '@/utils/response';
import { sendDelivery } from '@/utils/sendDelivery';

/** Dashboard routes address files by `:id`; the developer API addresses them by `:publicId`. */
const fileRef = (req: Request): FileRef => (req.params.publicId ? { publicId: param(req, 'publicId') } : { id: param(req, 'id') });

export const uploadFilesHandler = catchAsync(async (req: Request, res: Response) => {
  const { url, ...options } = req.body;
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const sources: UploadSource[] = files.map((file) => ({ path: file.path, size: file.size, originalName: file.originalname, mime: file.mimetype }));
  const remote = url ? await fetchRemoteFile(url) : undefined;
  try {
    const result = await uploadFiles(currentContext(req), remote ? [...sources, remote] : sources, options);
    sendResponse(res, status.CREATED, result.message, result.data);
  } finally {
    if (remote) await removeTempFiles([remote.path]);
  }
});

export const listFilesHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await listFiles(currentContext(req), req.query as unknown as ListFilesQuery);
  sendResponse(res, status.OK, result.message, result.data);
});

export const getFileHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await getFile(currentContext(req), fileRef(req));
  sendResponse(res, status.OK, result.message, result.data);
});

export const updateFileHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await updateFile(currentContext(req), fileRef(req), req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

export const deleteFileHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await deleteFiles(currentContext(req), [fileRef(req)]);
  sendResponse(res, status.OK, result.message, result.data);
});

export const bulkDeleteFilesHandler = catchAsync(async (req: Request, res: Response) => {
  const refs = (req.body.ids as string[]).map((id) => ({ id }));
  const result = await deleteFiles(currentContext(req), refs);
  sendResponse(res, status.OK, result.message, result.data);
});

export const signedLinkHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await createSignedLink(currentContext(req), fileRef(req), req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

export const bulkAccessHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await setFilesAccess(currentContext(req), req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

/** The file's bytes for its own account — private files included, no signed link needed. */
export const fileContentHandler = catchAsync(async (req: Request, res: Response) => {
  const file = await findFileRecord(currentContext(req), fileRef(req));
  await sendDelivery(res, () =>
    deliverOwnFile(file, {
      isDownload: req.query.dl === '1',
      range: req.headers.range,
      ifNoneMatch: req.headers['if-none-match'],
      acceptsGzip: req.acceptsEncodings('gzip') === 'gzip',
    }),
  );
});
