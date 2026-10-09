import { Request } from 'express';
import status from 'http-status';
import { AccountContext, AuthUser } from '@/types/api';
import ApiError from './ApiError';
import { ERROR_CODES } from './errorCodes';

export function currentContext(req: Request): AccountContext {
  if (!req.context) throw new ApiError(status.UNAUTHORIZED, 'Please sign in', ERROR_CODES.UNAUTHORIZED);
  return req.context;
}

export function currentUser(req: Request): AuthUser {
  if (!req.authUser) throw new ApiError(status.UNAUTHORIZED, 'Please sign in', ERROR_CODES.UNAUTHORIZED);
  return req.authUser;
}

export const param = (req: Request, name: string): string => req.params[name] ?? '';
