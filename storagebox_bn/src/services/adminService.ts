import status from 'http-status';
import prisma from '@/config/prisma';
import { AccountContext } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';
import { ServiceResult } from '@/utils/response';
import { logActivity } from './activityService';

const BYTES_PER_GB = 1024 * 1024 * 1024;

export interface AdminAccount {
  id: string;
  name: string;
  cloudName: string;
  quotaBytes: number;
  storageBytes: number;
  fileCount: number;
  isSuspended: boolean;
  owner?: { name: string; email: string; role: string };
  createdAt: Date;
}

export interface PlatformStats {
  accountCount: number;
  userCount: number;
  fileCount: number;
  storageBytes: number;
}

export interface UpdateAccountInput {
  quotaGb?: number;
  isSuspended?: boolean;
}

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
        quotaBytes: Number(account.quotaBytes),
        storageBytes: Number(usage?._sum.sizeBytes ?? 0),
        fileCount: usage?._count._all ?? 0,
        isSuspended: account.isSuspended,
        owner: account.users[0],
        createdAt: account.createdAt,
      };
    }),
  };
}

export async function updateAccount(
  ctx: AccountContext,
  id: string,
  input: UpdateAccountInput,
): Promise<ServiceResult<{ id: string }>> {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) throw new ApiError(status.NOT_FOUND, 'Account not found', ERROR_CODES.ACCOUNT_NOT_FOUND);
  if (input.isSuspended && id === ctx.accountId) {
    throw new ApiError(status.BAD_REQUEST, 'You cannot suspend your own account', ERROR_CODES.VALIDATION_ERROR);
  }

  await prisma.account.update({
    where: { id },
    data: {
      quotaBytes: input.quotaGb === undefined ? undefined : BigInt(Math.round(input.quotaGb * BYTES_PER_GB)),
      isSuspended: input.isSuspended,
    },
  });
  logActivity(ctx, 'admin.account_updated', account.cloudName);
  return { message: 'Account updated', data: { id } };
}

export async function getPlatformStats(): Promise<ServiceResult<PlatformStats>> {
  const [accountCount, userCount, files] = await Promise.all([
    prisma.account.count(),
    prisma.user.count(),
    prisma.file.aggregate({ _count: { _all: true }, _sum: { sizeBytes: true } }),
  ]);
  return {
    message: 'Platform stats retrieved',
    data: { accountCount, userCount, fileCount: files._count._all, storageBytes: Number(files._sum.sizeBytes ?? 0) },
  };
}
