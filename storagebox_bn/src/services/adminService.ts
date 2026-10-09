import status from 'http-status';
import prisma from '@/config/prisma';
import { AccountContext, AccountStatus } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';
import { ServiceResult } from '@/utils/response';
import { gbToBytes } from '@/utils/units';
import { logActivity } from './activityService';

export interface AdminAccount {
  id: string;
  name: string;
  cloudName: string;
  status: AccountStatus;
  quotaBytes: number;
  storageBytes: number;
  fileCount: number;
  isSuspended: boolean;
  owner?: { name: string; email: string; role: string };
  reviewedAt?: Date;
  createdAt: Date;
}

export interface PlatformStats {
  accountCount: number;
  pendingCount: number;
  storageRequestCount: number;
  userCount: number;
  fileCount: number;
  storageBytes: number;
}

export interface UpdateAccountInput {
  status?: AccountStatus;
  quotaGb?: number;
  isSuspended?: boolean;
}

const ACTIVITY_BY_STATUS: Record<AccountStatus, string> = {
  [AccountStatus.ACTIVE]: 'admin.account_approved',
  [AccountStatus.REJECTED]: 'admin.account_rejected',
  [AccountStatus.PENDING]: 'admin.account_updated',
};

export async function listAccounts(): Promise<ServiceResult<AdminAccount[]>> {
  const [accounts, storage] = await Promise.all([
    prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
      include: { users: { take: 1, orderBy: { createdAt: 'asc' }, select: { name: true, email: true, role: true } } },
    }),
    prisma.file.groupBy({ by: ['accountId'], _count: { _all: true }, _sum: { sizeBytes: true } }),
  ]);
  const storageById = new Map(storage.map((row) => [row.accountId, row]));

  return {
    message: 'Accounts retrieved',
    data: accounts.map((account) => {
      const usage = storageById.get(account.id);
      return {
        id: account.id,
        name: account.name,
        cloudName: account.cloudName,
        status: account.status,
        quotaBytes: Number(account.quotaBytes),
        storageBytes: Number(usage?._sum.sizeBytes ?? 0),
        fileCount: usage?._count._all ?? 0,
        isSuspended: account.isSuspended,
        owner: account.users[0],
        reviewedAt: account.reviewedAt ?? undefined,
        createdAt: account.createdAt,
      };
    }),
  };
}

/** Approve / reject sign-ups, change storage quotas and suspend accounts. */
export async function updateAccount(
  ctx: AccountContext,
  id: string,
  input: UpdateAccountInput,
): Promise<ServiceResult<{ id: string }>> {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) throw new ApiError(status.NOT_FOUND, 'Account not found', ERROR_CODES.ACCOUNT_NOT_FOUND);
  const isOwnAccount = id === ctx.accountId;
  if (isOwnAccount && (input.isSuspended || (input.status && input.status !== AccountStatus.ACTIVE))) {
    throw new ApiError(status.BAD_REQUEST, 'You cannot lock your own account', ERROR_CODES.VALIDATION_ERROR);
  }

  const isReview = input.status !== undefined && input.status !== account.status;
  await prisma.account.update({
    where: { id },
    data: {
      status: input.status,
      reviewedAt: isReview ? new Date() : undefined,
      quotaBytes: input.quotaGb === undefined ? undefined : gbToBytes(input.quotaGb),
      isSuspended: input.isSuspended,
    },
  });
  if (input.status === AccountStatus.REJECTED) await revokeAccess(id);

  logActivity(ctx, isReview && input.status ? ACTIVITY_BY_STATUS[input.status] : 'admin.account_updated', account.cloudName);
  const message = isReview ? (input.status === AccountStatus.ACTIVE ? 'Account approved' : 'Account rejected') : 'Account updated';
  return { message, data: { id } };
}

async function revokeAccess(accountId: string): Promise<void> {
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { user: { accountId } } }),
    prisma.apiKey.updateMany({ where: { accountId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

export async function getPlatformStats(): Promise<ServiceResult<PlatformStats>> {
  const [accountCount, pendingCount, storageRequestCount, userCount, files] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: { status: AccountStatus.PENDING } }),
    prisma.storageRequest.count({ where: { status: 'PENDING' } }),
    prisma.user.count(),
    prisma.file.aggregate({ _count: { _all: true }, _sum: { sizeBytes: true } }),
  ]);
  return {
    message: 'Platform stats retrieved',
    data: { accountCount, pendingCount, storageRequestCount, userCount, fileCount: files._count._all, storageBytes: Number(files._sum.sizeBytes ?? 0) },
  };
}
