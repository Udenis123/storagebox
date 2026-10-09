import { Request, Response } from 'express';
import status from 'http-status';
import { fetchRemoteFile } from '@/lib/remoteFetch';
import {
  createSignedLink,
  deleteFiles,
  FileRef,
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

/** Dashboard routes address files by `:id`; the developer API addresses them by `:publicId`. */
const fileRef = (req: Request): FileRef => (req.params.publicId ? { publicId: param(req, 'publicId') } : { id: param(req, 'id') });

async function uploadSources(req: Request): Promise<UploadSource[]> {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const sources: UploadSource[] = files.map((file) => ({ buffer: file.buffer, originalName: file.originalname, mime: file.mimetype }));
  if (req.body.url) sources.push(await fetchRemoteFile(req.body.url));
  return sources;
}

export const uploadFilesHandler = catchAsync(async (req: Request, res: Response) => {
  const { url: _url, ...options } = req.body;
  const result = await uploadFiles(currentContext(req), await uploadSources(req), options);
  sendResponse(res, status.CREATED, result.message, result.data);
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
