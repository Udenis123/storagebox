import { AccountContext, AuthUser } from './api';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      context?: AccountContext;
    }
  }
}

export {};
