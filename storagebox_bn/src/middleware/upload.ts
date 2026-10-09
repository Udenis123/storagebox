import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import multer from 'multer';
import { config } from '@/config/config';
import { extensionOf, isAllowedExtension } from '@/lib/fileTypes';
import { removeTempFiles, UPLOAD_TEMP_DIR } from '@/lib/tempFiles';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';

export const MAX_FILES_PER_REQUEST = 20;

const fileUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_TEMP_DIR,
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: config.limits.maxUploadBytes, files: MAX_FILES_PER_REQUEST },
  fileFilter: (_req, file, callback) => {
    // Busboy decodes multipart filenames as latin1; restore the UTF-8 name the client sent.
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (isAllowedExtension(extensionOf(file.originalname))) {
      callback(null, true);
      return;
    }
    callback(
      new ApiError(
        status.BAD_REQUEST,
        `${file.originalname}: this file type is not supported`,
        ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
      ),
    );
  },
});

/** Spooled files are removed once the response is done, whether the upload succeeded or failed validation. */
function removeSpooledFiles(req: Request, res: Response, next: NextFunction): void {
  res.on('close', () => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    void removeTempFiles(files.map((file) => file.path));
  });
  next();
}

export const acceptUploads = [fileUpload.any(), removeSpooledFiles];
