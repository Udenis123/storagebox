import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import jwt from 'jsonwebtoken';
import { config } from '@/config/config';
import prisma from '@/config/prisma';
import { UserRole } from '@/types/api';
import { assertAccountUsable } from '@/utils/accountAccess';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';

interface AccessTokenPayload {
  sub: string;
}

const readBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
};

const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as AccessTokenPayload;
  } catch {
    throw new ApiError(status.UNAUTHORIZED, 'Session expired, please sign in again', ERROR_CODES.INVALID_TOKEN);
  }
};

const auth =
  (...allowedRoles: UserRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = readBearerToken(req);
      if (!token) throw new ApiError(status.UNAUTHORIZED, 'Please sign in', ERROR_CODES.UNAUTHORIZED);
      const payload = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: { account: { select: { cloudName: true, status: true, isSuspended: true } } },
      });
      if (!user?.isActive) throw new ApiError(status.UNAUTHORIZED, 'Please sign in', ERROR_CODES.UNAUTHORIZED);
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new ApiError(status.FORBIDDEN, 'You do not have access to this resource', ERROR_CODES.FORBIDDEN);
      }
      assertAccountUsable(user.account, user.role === UserRole.ADMIN);

      req.authUser = { id: user.id, accountId: user.accountId, name: user.name, email: user.email, role: user.role };
      req.context = {
        accountId: user.accountId,
        cloudName: user.account.cloudName,
        actor: user.email,
        userId: user.id,
        canWrite: true,
      };
      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;
