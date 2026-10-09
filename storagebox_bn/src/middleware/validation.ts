import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { ObjectSchema } from 'joi';
import { ERROR_CODES } from '@/utils/errorCodes';
import { sendResponse } from '@/utils/response';

type Source = 'body' | 'query';

const validation =
  (schema: ObjectSchema, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { value, error } = schema.validate(req[source] ?? {}, { abortEarly: false, stripUnknown: true });
    if (error) {
      const message = error.details.map((detail) => detail.message.replace(/"/g, '')).join(', ');
      sendResponse(res, status.BAD_REQUEST, message, null, ERROR_CODES.VALIDATION_ERROR);
      return;
    }
    if (source === 'body') req.body = value;
    else Object.defineProperty(req, 'query', { value, writable: true });
    next();
  };

export default validation;
