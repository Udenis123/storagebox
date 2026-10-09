import status from 'http-status';
import multer from 'multer';
import { config } from '@/config/config';
import { extensionOf, isAllowedExtension } from '@/lib/fileTypes';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';

export const MAX_FILES_PER_REQUEST = 20;

export const fileUpload = multer({
  storage: multer.memoryStorage(),
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
