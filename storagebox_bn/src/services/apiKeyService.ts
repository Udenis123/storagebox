import status from 'http-status';
import prisma from '@/config/prisma';
import { AccountContext, ApiKeyDto, ApiKeyScope } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { randomToken, safeEqual, sha256Hex } from '@/utils/crypto';
import { toApiKeyDto } from '@/utils/dto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { ServiceResult } from '@/utils/response';
import { logActivity } from './activityService';

const KEY_ID_PREFIX = 'sbk_';
const SECRET_PREFIX = 'sbs_';
const LAST_USED_RESOLUTION_MS = 60_000;

export interface CreateApiKeyInput {
  name: string;
  scope: ApiKeyScope;
}

export interface CreatedApiKey extends ApiKeyDto {
  secret: string;
}

const invalidKey = () => new ApiError(status.UNAUTHORIZED, 'Invalid API key or secret', ERROR_CODES.INVALID_API_KEY);

export async function listApiKeys(ctx: AccountContext): Promise<ServiceResult<ApiKeyDto[]>> {
  const keys = await prisma.apiKey.findMany({ where: { accountId: ctx.accountId }, orderBy: { createdAt: 'desc' } });
  return { message: 'API keys retrieved', data: keys.map(toApiKeyDto) };
}

export async function createApiKey(ctx: AccountContext, input: CreateApiKeyInput): Promise<ServiceResult<CreatedApiKey>> {
  const secret = `${SECRET_PREFIX}${randomToken(32)}`;
  const key = await prisma.apiKey.create({
    data: {
      accountId: ctx.accountId,
      name: input.name,
      scope: input.scope,
      keyId: `${KEY_ID_PREFIX}${randomToken(12)}`,
      secretHash: sha256Hex(secret),
    },
  });
  logActivity(ctx, 'api_key.created', input.name);
  return { message: 'API key created — copy the secret now, it will not be shown again', data: { ...toApiKeyDto(key), secret } };
}

export async function revokeApiKey(ctx: AccountContext, id: string): Promise<ServiceResult<ApiKeyDto>> {
  const key = await prisma.apiKey.findFirst({ where: { id, accountId: ctx.accountId } });
  if (!key) throw new ApiError(status.NOT_FOUND, 'API key not found', ERROR_CODES.API_KEY_NOT_FOUND);
  const revoked = key.revokedAt
    ? key
    : await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  logActivity(ctx, 'api_key.revoked', key.name);
  return { message: 'API key revoked', data: toApiKeyDto(revoked) };
}

export async function authenticateApiKey(keyId: string, secret: string): Promise<AccountContext> {
  const key = await prisma.apiKey.findUnique({
    where: { keyId },
    include: { account: { select: { cloudName: true, isSuspended: true } } },
  });
  if (!key || key.revokedAt || !safeEqual(key.secretHash, sha256Hex(secret))) throw invalidKey();
  if (key.account.isSuspended) {
    throw new ApiError(status.FORBIDDEN, 'This account is suspended', ERROR_CODES.ACCOUNT_SUSPENDED);
  }

  const isStale = !key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS;
  if (isStale) await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });

  return {
    accountId: key.accountId,
    cloudName: key.account.cloudName,
    actor: `api-key:${key.name}`,
    apiKeyId: key.id,
    canWrite: key.scope === ApiKeyScope.READ_WRITE,
  };
}
