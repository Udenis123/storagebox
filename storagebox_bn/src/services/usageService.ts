import { UsageKind } from '@prisma/client';
import prisma from '@/config/prisma';
import logger from '@/config/logger';
import { kindForExtension } from '@/lib/fileTypes';
import { AccountContext, FileKind } from '@/types/api';
import { format, startOfDay, subDays } from '@/utils/date';
import { ServiceResult } from '@/utils/response';

const USAGE_WINDOW_DAYS = 30;

export interface UsageDay {
  date: string;
  uploads: number;
  uploadBytes: number;
  deliveries: number;
  deliveryBytes: number;
  transforms: number;
}

export interface UsageSummary {
  cloudName: string;
  storageBytes: number;
  quotaBytes: number;
  fileCount: number;
  collectionCount: number;
  activeApiKeyCount: number;
  byKind: { kind: FileKind; count: number; bytes: number }[];
  daily: UsageDay[];
  byApiKey: { apiKeyId: string; name: string; requests: number }[];
}

interface DailyRow {
  day: Date;
  kind: UsageKind;
  count: number;
  bytes: bigint;
}

export function recordUsage(accountId: string, kind: UsageKind, bytes: number, apiKeyId?: string): void {
  prisma.usageEvent
    .create({ data: { accountId, kind, bytes: BigInt(bytes), apiKeyId } })
    .catch((error: unknown) => logger.warn('Could not record usage', error));
}

export async function storageUsedBytes(accountId: string): Promise<number> {
  const { _sum } = await prisma.file.aggregate({ where: { accountId }, _sum: { sizeBytes: true } });
  return Number(_sum.sizeBytes ?? 0);
}

function emptyDays(): Map<string, UsageDay> {
  const days = new Map<string, UsageDay>();
  const today = startOfDay(new Date());
  for (let offset = USAGE_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const date = format(subDays(today, offset));
    days.set(date, { date, uploads: 0, uploadBytes: 0, deliveries: 0, deliveryBytes: 0, transforms: 0 });
  }
  return days;
}

function applyDailyRow(day: UsageDay, row: DailyRow): void {
  const bytes = Number(row.bytes);
  if (row.kind === UsageKind.UPLOAD) {
    day.uploads += row.count;
    day.uploadBytes += bytes;
  } else if (row.kind === UsageKind.DELIVERY) {
    day.deliveries += row.count;
    day.deliveryBytes += bytes;
  } else if (row.kind === UsageKind.TRANSFORM) {
    day.transforms += row.count;
  }
}

async function dailyUsage(accountId: string, since: Date): Promise<UsageDay[]> {
  const rows = await prisma.$queryRaw<DailyRow[]>`
    SELECT date_trunc('day', "createdAt") AS day, kind, COUNT(*)::int AS count, COALESCE(SUM(bytes), 0)::bigint AS bytes
    FROM "UsageEvent"
    WHERE "accountId" = ${accountId} AND "createdAt" >= ${since}
    GROUP BY 1, 2`;
  const days = emptyDays();
  for (const row of rows) {
    const day = days.get(format(row.day));
    if (day) applyDailyRow(day, row);
  }
  return [...days.values()];
}

async function usageByKind(accountId: string): Promise<UsageSummary['byKind']> {
  const groups = await prisma.file.groupBy({
    by: ['ext'],
    where: { accountId },
    _count: { _all: true },
    _sum: { sizeBytes: true },
  });
  const totals = new Map<FileKind, { count: number; bytes: number }>();
  for (const group of groups) {
    const kind = kindForExtension(group.ext);
    const current = totals.get(kind) ?? { count: 0, bytes: 0 };
    current.count += group._count._all;
    current.bytes += Number(group._sum.sizeBytes ?? 0);
    totals.set(kind, current);
  }
  return [...totals.entries()].map(([kind, value]) => ({ kind, ...value })).sort((a, b) => b.bytes - a.bytes);
}

async function usageByApiKey(accountId: string, since: Date): Promise<UsageSummary['byApiKey']> {
  const groups = await prisma.usageEvent.groupBy({
    by: ['apiKeyId'],
    where: { accountId, createdAt: { gte: since }, apiKeyId: { not: null } },
    _count: { _all: true },
  });
  const keyIds = groups.map((group) => group.apiKeyId).filter((id): id is string => Boolean(id));
  const keys = await prisma.apiKey.findMany({ where: { id: { in: keyIds } }, select: { id: true, name: true } });
  const names = new Map(keys.map((key) => [key.id, key.name]));
  return groups
    .filter((group) => group.apiKeyId)
    .map((group) => ({
      apiKeyId: group.apiKeyId as string,
      name: names.get(group.apiKeyId as string) ?? 'Deleted key',
      requests: group._count._all,
    }))
    .sort((a, b) => b.requests - a.requests);
}

export async function getUsageSummary(ctx: AccountContext): Promise<ServiceResult<UsageSummary>> {
  const since = subDays(startOfDay(new Date()), USAGE_WINDOW_DAYS - 1);
  const { accountId } = ctx;
  const [account, storageBytes, fileCount, collectionCount, activeApiKeyCount, byKind, daily, byApiKey] =
    await Promise.all([
      prisma.account.findUniqueOrThrow({ where: { id: accountId }, select: { quotaBytes: true } }),
      storageUsedBytes(accountId),
      prisma.file.count({ where: { accountId } }),
      prisma.collection.count({ where: { accountId } }),
      prisma.apiKey.count({ where: { accountId, revokedAt: null } }),
      usageByKind(accountId),
      dailyUsage(accountId, since),
      usageByApiKey(accountId, since),
    ]);

  return {
    message: 'Usage retrieved',
    data: {
      cloudName: ctx.cloudName,
      storageBytes,
      quotaBytes: Number(account.quotaBytes),
      fileCount,
      collectionCount,
      activeApiKeyCount,
      byKind,
      daily,
      byApiKey,
    },
  };
}
