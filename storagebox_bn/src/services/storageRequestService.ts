import { StorageRequest, StorageRequestStatus } from '@prisma/client';
import status from 'http-status';
import prisma from '@/config/prisma';
import { AccountContext } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';
import { ServiceResult } from '@/utils/response';
import { gbToBytes } from '@/utils/units';
import { logActivity } from './activityService';
import { storageUsedBytes } from './usageService';

export interface StorageRequestDto {
  id: string;
  status: StorageRequestStatus;
  requestedBytes: number;
  grantedBytes?: number;
  reason?: string;
  requestedBy: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface AdminStorageRequest extends StorageRequestDto {
  account: { id: string; name: string; cloudName: string; quotaBytes: number; storageBytes: number };
}

export interface RequestStorageInput {
  quotaGb: number;
  reason?: string;
}

export interface ReviewStorageRequestInput {
  status: Exclude<StorageRequestStatus, 'PENDING'>;
  quotaGb?: number;
}

const toDto = (request: StorageRequest): StorageRequestDto => ({
  id: request.id,
  status: request.status,
  requestedBytes: Number(request.requestedBytes),
  grantedBytes: request.grantedBytes === null ? undefined : Number(request.grantedBytes),
  reason: request.reason ?? undefined,
  requestedBy: request.requestedBy,
  reviewedAt: request.reviewedAt ?? undefined,
  createdAt: request.createdAt,
});

export async function getLatestStorageRequest(ctx: AccountContext): Promise<ServiceResult<StorageRequestDto | null>> {
  const request = await prisma.storageRequest.findFirst({ where: { accountId: ctx.accountId }, orderBy: { createdAt: 'desc' } });
  return { message: 'Storage request retrieved', data: request ? toDto(request) : null };
}

/** One open request per account: asking again replaces the pending one. */
export async function requestStorage(ctx: AccountContext, input: RequestStorageInput): Promise<ServiceResult<StorageRequestDto>> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: ctx.accountId }, select: { quotaBytes: true } });
  const requestedBytes = gbToBytes(input.quotaGb);
  if (requestedBytes <= account.quotaBytes) {
    throw new ApiError(status.BAD_REQUEST, 'Ask for more than your current storage', ERROR_CODES.VALIDATION_ERROR);
  }

  const data = { requestedBytes, reason: input.reason || null, requestedBy: ctx.actor };
  const pending = await prisma.storageRequest.findFirst({ where: { accountId: ctx.accountId, status: StorageRequestStatus.PENDING } });
  const request = pending
    ? await prisma.storageRequest.update({ where: { id: pending.id }, data: { ...data, createdAt: new Date() } })
    : await prisma.storageRequest.create({ data: { ...data, accountId: ctx.accountId } });

  logActivity(ctx, 'storage.requested', `${input.quotaGb} GB`);
  return { message: 'Request sent — an administrator will review it shortly', data: toDto(request) };
}

export async function listPendingStorageRequests(): Promise<ServiceResult<AdminStorageRequest[]>> {
  const requests = await prisma.storageRequest.findMany({
    where: { status: StorageRequestStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    include: { account: { select: { id: true, name: true, cloudName: true, quotaBytes: true } } },
  });
  const usage = await Promise.all(requests.map((request) => storageUsedBytes(request.accountId)));
  return {
    message: 'Storage requests retrieved',
    data: requests.map((request, index) => ({
      ...toDto(request),
      account: { ...request.account, quotaBytes: Number(request.account.quotaBytes), storageBytes: usage[index] ?? 0 },
    })),
  };
}

/** Approving raises the account quota to `quotaGb`, or to what was asked for. */
export async function reviewStorageRequest(
  ctx: AccountContext,
  id: string,
  input: ReviewStorageRequestInput,
): Promise<ServiceResult<StorageRequestDto>> {
  const request = await prisma.storageRequest.findUnique({ where: { id }, include: { account: { select: { cloudName: true } } } });
  if (!request) throw new ApiError(status.NOT_FOUND, 'Storage request not found', ERROR_CODES.STORAGE_REQUEST_NOT_FOUND);
  if (request.status !== StorageRequestStatus.PENDING) {
    throw new ApiError(status.CONFLICT, 'This request was already reviewed', ERROR_CODES.STORAGE_REQUEST_REVIEWED);
  }

  const isApproved = input.status === StorageRequestStatus.APPROVED;
  const grantedBytes = isApproved ? (input.quotaGb === undefined ? request.requestedBytes : gbToBytes(input.quotaGb)) : null;
  const updated = await prisma.$transaction(async (tx) => {
    if (grantedBytes !== null) await tx.account.update({ where: { id: request.accountId }, data: { quotaBytes: grantedBytes } });
    return tx.storageRequest.update({ where: { id }, data: { status: input.status, grantedBytes, reviewedAt: new Date() } });
  });

  logActivity(ctx, isApproved ? 'admin.storage_approved' : 'admin.storage_declined', request.account.cloudName);
  return { message: isApproved ? 'Storage upgraded' : 'Request declined', data: toDto(updated) };
}
