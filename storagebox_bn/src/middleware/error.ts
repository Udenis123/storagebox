import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { MulterError } from 'multer';
import { config } from '@/config/config';
import logger from '@/config/logger';
import { MAX_FILES_PER_REQUEST } from '@/middleware/upload';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';
import { sendResponse } from '@/utils/response';
import { formatBytes } from '@/utils/units';

const maxUploadLabel = formatBytes(config.limits.maxUploadBytes);

const MULTER_MESSAGES: Partial<Record<MulterError['code'], string>> = {
  LIMIT_FILE_SIZE: `Each file must be ${maxUploadLabel} or smaller`,
  LIMIT_FILE_COUNT: `At most ${MAX_FILES_PER_REQUEST} files can be uploaded at once`,
  LIMIT_UNEXPECTED_FILE: 'Send files in the "file" (or "files") form field',
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendResponse(res, status.NOT_FOUND, `Route ${req.method} ${req.path} not found`, null, ERROR_CODES.NOT_FOUND);
};

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  if (error instanceof ApiError) {
    sendResponse(res, error.statusCode, error.message, null, error.errorCode);
    return;
  }
  if (error instanceof MulterError) {
    const errorCode = error.code === 'LIMIT_FILE_SIZE' ? ERROR_CODES.FILE_TOO_LARGE : ERROR_CODES.VALIDATION_ERROR;
    sendResponse(res, status.BAD_REQUEST, MULTER_MESSAGES[error.code] ?? error.message, null, errorCode);
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    sendResponse(res, status.BAD_REQUEST, 'Request body is not valid JSON', null, ERROR_CODES.VALIDATION_ERROR);
    return;
  }
  logger.error(`Unhandled error on ${req.method} ${req.path}`, error);
  if (res.headersSent) {
    res.end();
    return;
  }
  sendResponse(res, status.INTERNAL_SERVER_ERROR, 'Something went wrong', null, ERROR_CODES.INTERNAL_SERVER_ERROR);
};
