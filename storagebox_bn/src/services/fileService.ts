import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { Prisma, UsageKind } from '@prisma/client';
import status from 'http-status';
import sharp from 'sharp';
import prisma from '@/config/prisma';
import logger from '@/config/logger';
import { signedUrl } from '@/lib/deliveryUrl';
import { extensionOf, extensionsForKind, isAllowedExtension, isTransformable, mimeForExtension } from '@/lib/fileTypes';
import { deleteObjects, putObjectStream } from '@/lib/storage';
import { prepareForStorage, PreparedUpload } from '@/lib/optimizeUpload';
import { sha256File } from '@/lib/tempFiles';
import { parseTransform, TransformParseError } from '@/lib/transform';
import { AccountContext, DEFAULT_FILE_ACCESS, FileAccess, FileDto, FileKind } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { randomSuffix } from '@/utils/crypto';
import { toFileDto } from '@/utils/dto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { Paginated, ServiceResult } from '@/utils/response';
import { slugify } from '@/utils/slug';
import { logActivity } from './activityService';
import { ensureCollectionPath, findCollection } from './collectionService';
import { recordUsage, storageUsedBytes } from './usageService';
import { dispatchWebhooks } from './webhookService';

const PUBLIC_ID_BASE_LENGTH = 40;
const DEFAULT_SIGNED_URL_SECONDS = 60 * 60;

/** A file already spooled to local disk; the caller removes `path` afterwards. */
export interface UploadSource {
  path: string;
  size: number;
  originalName: string;
  mime?: string;
}

export interface UploadOptions {
  collectionId?: string;
  collection?: string;
  access?: FileAccess;
  publicId?: string;
  tags?: string[];
}

export type FileSort = 'newest' | 'oldest' | 'name' | 'largest' | 'smallest';

export interface ListFilesQuery {
  collectionId?: string;
  collection?: string;
  search?: string;
  kind?: FileKind;
  access?: FileAccess;
  tag?: string;
  sort: FileSort;
  page: number;
  pageSize: number;
}

export interface UpdateFileInput {
  originalName?: string;
  publicId?: string;
  collectionId?: string | null;
  access?: FileAccess;
  tags?: string[];
}

export interface SignedLinkInput {
  expiresIn?: number;
  transform?: string;
  download?: boolean;
}

export type FileRef = { id: string } | { publicId: string };

const ROOT_COLLECTION = 'root';

const SORT_ORDER: Record<FileSort, Prisma.FileOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  name: { originalName: 'asc' },
  largest: { sizeBytes: 'desc' },
  smallest: { sizeBytes: 'asc' },
};

const withCollection = { collection: { select: { path: true } } } as const;

const fileNotFound = () => new ApiError(status.NOT_FOUND, 'File not found', ERROR_CODES.FILE_NOT_FOUND);

export async function findFileRecord(ctx: AccountContext, ref: FileRef) {
  const file = await prisma.file.findFirst({ where: { accountId: ctx.accountId, ...ref }, include: withCollection });
  if (!file) throw fileNotFound();
  return file;
}

async function assertPublicIdFree(accountId: string, publicId: string): Promise<void> {
  const taken = await prisma.file.findUnique({ where: { accountId_publicId: { accountId, publicId } }, select: { id: true } });
  if (taken) throw new ApiError(status.CONFLICT, `public_id "${publicId}" is already in use`, ERROR_CODES.PUBLIC_ID_TAKEN);
}

const generatePublicId = (originalName: string): string => {
  const base = slugify(originalName.replace(/\.[^.]+$/, '')).slice(0, PUBLIC_ID_BASE_LENGTH) || 'file';
  return `${base}_${randomSuffix(6)}`;
};

async function assertWithinQuota(accountId: string, incomingBytes: number): Promise<void> {
  const [account, usedBytes] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { id: accountId }, select: { quotaBytes: true } }),
    storageUsedBytes(accountId),
  ]);
  if (usedBytes + incomingBytes > Number(account.quotaBytes)) {
    throw new ApiError(status.PAYMENT_REQUIRED, 'Storage quota exceeded — delete files or ask for more space', ERROR_CODES.QUOTA_EXCEEDED);
  }
}

async function resolveTargetCollection(ctx: AccountContext, options: UploadOptions) {
  if (options.collectionId) return findCollection(ctx, options.collectionId);
  if (options.collection) return ensureCollectionPath(ctx, options.collection);
  return null;
}

async function imageDimensions(filePath: string, ext: string): Promise<{ width?: number; height?: number }> {
  if (!isTransformable(ext)) return {};
  try {
    const metadata = await sharp(filePath).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    logger.warn('Could not read image dimensions', error);
    return {};
  }
}

async function storeOne(
  ctx: AccountContext,
  source: UploadSource,
  collection: { id: string; access: FileAccess } | null,
  options: UploadOptions,
): Promise<FileDto> {
  const ext = extensionOf(source.originalName);
  if (!isAllowedExtension(ext)) {
    throw new ApiError(status.BAD_REQUEST, `${source.originalName}: this file type is not supported`, ERROR_CODES.FILE_TYPE_NOT_ALLOWED);
  }

  const publicId = options.publicId ?? generatePublicId(source.originalName);
  if (options.publicId) await assertPublicIdFree(ctx.accountId, publicId);

  const mime = mimeForExtension(ext);
  const storageKey = `${ctx.accountId}/${randomUUID()}.${ext}`;
  const checksum = await sha256File(source.path);
  const stored = await prepareForStorage(source.path, source.size, ext);
  try {
    const dimensions = await imageDimensions(stored.path, ext);
    await putObjectStream(storageKey, createReadStream(stored.path), mime);
    return await recordStoredFile(ctx, { source, stored, collection, options, publicId, mime, ext, storageKey, checksum, dimensions });
  } finally {
    await stored.cleanup();
  }
}

interface StoredFileRecord {
  source: UploadSource;
  stored: PreparedUpload;
  collection: { id: string; access: FileAccess } | null;
  options: UploadOptions;
  publicId: string;
  mime: string;
  ext: string;
  storageKey: string;
  checksum: string;
  dimensions: { width?: number; height?: number };
}

async function recordStoredFile(
  ctx: AccountContext,
  { source, stored, collection, options, publicId, mime, ext, storageKey, checksum, dimensions }: StoredFileRecord,
): Promise<FileDto> {
  try {
    const file = await prisma.file.create({
      data: {
        accountId: ctx.accountId,
        collectionId: collection?.id,
        publicId,
        originalName: source.originalName,
        mime,
        ext,
        sizeBytes: BigInt(stored.size),
        originalSizeBytes: stored.size < source.size ? BigInt(source.size) : null,
        contentEncoding: stored.contentEncoding,
        checksum,
        access: options.access ?? DEFAULT_FILE_ACCESS,
        storageKey,
        tags: options.tags ?? [],
        uploadedById: ctx.userId,
        apiKeyId: ctx.apiKeyId,
        ...dimensions,
      },
      include: withCollection,
    });
    const dto = toFileDto(file, ctx.cloudName);
    recordUsage(ctx.accountId, UsageKind.UPLOAD, source.size, ctx.apiKeyId);
    logActivity(ctx, 'file.uploaded', source.originalName);
    dispatchWebhooks(ctx.accountId, 'file.uploaded', dto);
    return dto;
  } catch (error) {
    await deleteObjects([storageKey]);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(status.CONFLICT, `public_id "${publicId}" is already in use`, ERROR_CODES.PUBLIC_ID_TAKEN);
    }
    throw error;
  }
}

export async function uploadFiles(
  ctx: AccountContext,
  sources: UploadSource[],
  options: UploadOptions,
): Promise<ServiceResult<FileDto[]>> {
  if (sources.length === 0) throw new ApiError(status.BAD_REQUEST, 'No file was provided', ERROR_CODES.NO_FILE_PROVIDED);
  if (options.publicId && sources.length > 1) {
    throw new ApiError(status.BAD_REQUEST, 'public_id can only be set when uploading a single file', ERROR_CODES.VALIDATION_ERROR);
  }

  await assertWithinQuota(ctx.accountId, sources.reduce((sum, source) => sum + source.size, 0));
  const collection = await resolveTargetCollection(ctx, options);

  const uploaded: FileDto[] = [];
  for (const source of sources) uploaded.push(await storeOne(ctx, source, collection, options));
  const message = uploaded.length === 1 ? 'File uploaded' : `${uploaded.length} files uploaded`;
  return { message, data: uploaded };
}

async function collectionFilter(ctx: AccountContext, query: ListFilesQuery): Promise<Prisma.FileWhereInput> {
  if (query.collectionId === ROOT_COLLECTION) return { collectionId: null };
  if (query.collectionId) return { collectionId: query.collectionId };
  if (query.collection) {
    const collection = await prisma.collection.findUnique({
      where: { accountId_path: { accountId: ctx.accountId, path: query.collection } },
      select: { id: true },
    });
    return { collectionId: collection?.id ?? '__none__' };
  }
  return {};
}

export async function listFiles(ctx: AccountContext, query: ListFilesQuery): Promise<ServiceResult<Paginated<FileDto>>> {
  const where: Prisma.FileWhereInput = {
    accountId: ctx.accountId,
    ...(await collectionFilter(ctx, query)),
    ...(query.kind && { ext: { in: extensionsForKind(query.kind) } }),
    ...(query.access && { access: query.access }),
    ...(query.tag && { tags: { has: query.tag } }),
    ...(query.search && {
      OR: [
        { originalName: { contains: query.search, mode: 'insensitive' } },
        { publicId: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [files, total] = await prisma.$transaction([
    prisma.file.findMany({
      where,
      include: withCollection,
      orderBy: SORT_ORDER[query.sort],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.file.count({ where }),
  ]);
  return {
    message: 'Files retrieved',
    data: { items: files.map((file) => toFileDto(file, ctx.cloudName)), total, page: query.page, pageSize: query.pageSize },
  };
}

export async function getFile(ctx: AccountContext, ref: FileRef): Promise<ServiceResult<FileDto>> {
  return { message: 'File retrieved', data: toFileDto(await findFileRecord(ctx, ref), ctx.cloudName) };
}

export async function updateFile(ctx: AccountContext, ref: FileRef, input: UpdateFileInput): Promise<ServiceResult<FileDto>> {
  const file = await findFileRecord(ctx, ref);
  if (input.publicId && input.publicId !== file.publicId) await assertPublicIdFree(ctx.accountId, input.publicId);
  if (input.collectionId) await findCollection(ctx, input.collectionId);

  const updated = await prisma.file.update({
    where: { id: file.id },
    data: {
      originalName: input.originalName,
      publicId: input.publicId,
      collectionId: input.collectionId,
      access: input.access,
      tags: input.tags,
    },
    include: withCollection,
  });
  logActivity(ctx, 'file.updated', updated.originalName);
  return { message: 'File updated', data: toFileDto(updated, ctx.cloudName) };
}

export interface BulkAccessInput {
  ids?: string[];
  publicIds?: string[];
  access: FileAccess;
}

export async function setFilesAccess(ctx: AccountContext, input: BulkAccessInput): Promise<ServiceResult<{ updated: number }>> {
  const match = input.ids ? { id: { in: input.ids } } : { publicId: { in: input.publicIds ?? [] } };
  const { count } = await prisma.file.updateMany({ where: { accountId: ctx.accountId, ...match }, data: { access: input.access } });
  if (count === 0) throw fileNotFound();
  logActivity(ctx, 'file.access_changed', `${count} file(s) → ${input.access.toLowerCase()}`);
  return { message: `${count} file${count === 1 ? '' : 's'} made ${input.access.toLowerCase()}`, data: { updated: count } };
}

export async function deleteFiles(ctx: AccountContext, refs: FileRef[]): Promise<ServiceResult<{ deleted: number }>> {
  const ids = refs.filter((ref): ref is { id: string } => 'id' in ref).map((ref) => ref.id);
  const publicIds = refs.filter((ref): ref is { publicId: string } => 'publicId' in ref).map((ref) => ref.publicId);
  const files = await prisma.file.findMany({
    where: { accountId: ctx.accountId, OR: [{ id: { in: ids } }, { publicId: { in: publicIds } }] },
    include: { ...withCollection, derivatives: { select: { storageKey: true } } },
  });
  if (files.length === 0) throw fileNotFound();

  await prisma.file.deleteMany({ where: { id: { in: files.map((file) => file.id) } } });
  await deleteObjects(files.flatMap((file) => [file.storageKey, ...file.derivatives.map((d) => d.storageKey)]));

  for (const file of files) {
    const dto = toFileDto(file, ctx.cloudName);
    recordUsage(ctx.accountId, UsageKind.DELETE, dto.sizeBytes, ctx.apiKeyId);
    logActivity(ctx, 'file.deleted', file.originalName);
    dispatchWebhooks(ctx.accountId, 'file.deleted', dto);
  }
  return { message: files.length === 1 ? 'File deleted' : `${files.length} files deleted`, data: { deleted: files.length } };
}

export async function createSignedLink(
  ctx: AccountContext,
  ref: FileRef,
  input: SignedLinkInput,
): Promise<ServiceResult<{ url: string; expiresAt: Date }>> {
  const file = await findFileRecord(ctx, ref);
  let transform: string | undefined;
  if (input.transform) {
    if (!isTransformable(file.ext)) {
      throw new ApiError(status.BAD_REQUEST, 'Transforms are only available for images', ERROR_CODES.TRANSFORM_NOT_SUPPORTED);
    }
    try {
      transform = parseTransform(input.transform).canonical;
    } catch (error) {
      if (error instanceof TransformParseError) throw new ApiError(status.BAD_REQUEST, error.message, ERROR_CODES.INVALID_TRANSFORM);
      throw error;
    }
  }
  const link = signedUrl(
    { cloudName: ctx.cloudName, publicId: file.publicId, ext: file.ext, transform },
    { expiresInSeconds: input.expiresIn ?? DEFAULT_SIGNED_URL_SECONDS, download: input.download },
  );
  return { message: 'Signed link created', data: link };
}
