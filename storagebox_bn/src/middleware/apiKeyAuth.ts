import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { authenticateApiKey } from '@/services/apiKeyService';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';

interface ApiKeyCredentials {
  keyId: string;
  secret: string;
}

function readCredentials(req: Request): ApiKeyCredentials | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator > 0) return { keyId: decoded.slice(0, separator), secret: decoded.slice(separator + 1) };
  }
  const keyId = req.header('x-api-key');
  const secret = req.header('x-api-secret');
  return keyId && secret ? { keyId, secret } : null;
}

export const apiKeyAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const credentials = readCredentials(req);
    if (!credentials) {
      throw new ApiError(
        status.UNAUTHORIZED,
        'Provide your API key: Authorization: Basic base64(api_key:api_secret)',
        ERROR_CODES.INVALID_API_KEY,
      );
    }
    req.context = await authenticateApiKey(credentials.keyId, credentials.secret, req.header('x-cloud-name') || undefined);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireWrite = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.context?.canWrite) {
    next();
    return;
  }
  next(new ApiError(status.FORBIDDEN, 'This API key is read-only', ERROR_CODES.API_KEY_READ_ONLY));
};
