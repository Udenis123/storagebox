import status from 'http-status';
import { AccountStatus } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';

export interface AccountGate {
  status: AccountStatus;
  isSuspended: boolean;
}

/** Throws unless the account may use StorageBox. Platform admins are never locked out. */
export function assertAccountUsable(account: AccountGate, isAdmin = false): void {
  if (isAdmin) return;
  if (account.status === AccountStatus.PENDING) {
    throw new ApiError(
      status.FORBIDDEN,
      'Your account is waiting for approval. You will be able to sign in once an administrator approves it.',
      ERROR_CODES.ACCOUNT_PENDING,
    );
  }
  if (account.status === AccountStatus.REJECTED) {
    throw new ApiError(status.FORBIDDEN, 'Your account request was not approved', ERROR_CODES.ACCOUNT_REJECTED);
  }
  if (account.isSuspended) {
    throw new ApiError(status.FORBIDDEN, 'This account is suspended', ERROR_CODES.ACCOUNT_SUSPENDED);
  }
}
