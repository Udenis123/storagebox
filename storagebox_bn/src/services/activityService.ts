import prisma from '@/config/prisma';
import logger from '@/config/logger';
import { AccountContext } from '@/types/api';
import { Paginated, ServiceResult } from '@/utils/response';

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  target?: string;
  createdAt: Date;
}

export function logActivity(ctx: AccountContext, action: string, target?: string): void {
  prisma.activityLog
    .create({ data: { accountId: ctx.accountId, actor: ctx.actor, action, target } })
    .catch((error: unknown) => logger.warn('Could not record activity', error));
}

export async function listActivity(
  ctx: AccountContext,
  page: number,
  pageSize: number,
): Promise<ServiceResult<Paginated<ActivityEntry>>> {
  const where = { accountId: ctx.accountId };
  const [rows, total] = await prisma.$transaction([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.activityLog.count({ where }),
  ]);
  const items = rows.map((row) => ({ ...row, target: row.target ?? undefined }));
  return { message: 'Activity retrieved', data: { items, total, page, pageSize } };
}
