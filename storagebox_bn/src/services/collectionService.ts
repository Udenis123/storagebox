import { randomBytes } from 'crypto';
import { Collection, Prisma } from '@prisma/client';
import status from 'http-status';
import prisma from '@/config/prisma';
import { deleteObjects } from '@/lib/storage';
import { AccountContext, CollectionDto, DEFAULT_FILE_ACCESS, FileAccess } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { toCollectionDto } from '@/utils/dto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { ServiceResult } from '@/utils/response';
import { slugify } from '@/utils/slug';
import { logActivity } from './activityService';

export interface CreateCollectionInput {
  name: string;
  parentId?: string;
  /** Parent collection path, e.g. `invoices` — an alternative to `parentId` for code that works with paths. */
  parent?: string;
  access?: FileAccess;
}

export interface UpdateCollectionInput {
  name?: string;
  access?: FileAccess;
  /** Also switch every file in this collection and its sub-collections to `access`. */
  applyToFiles?: boolean;
}

const notFound = () => new ApiError(status.NOT_FOUND, 'Collection not found', ERROR_CODES.COLLECTION_NOT_FOUND);

const segmentFor = (name: string): string => {
  const segment = slugify(name);
  if (!segment) throw new ApiError(status.BAD_REQUEST, 'Collection name must contain letters or digits', ERROR_CODES.VALIDATION_ERROR);
  return segment;
};

const joinPath = (parentPath: string | undefined, segment: string): string =>
  parentPath ? `${parentPath}/${segment}` : segment;

export const subtreeFilter = (accountId: string, path: string): Prisma.CollectionWhereInput => ({
  accountId,
  OR: [{ path }, { path: { startsWith: `${path}/` } }],
});

/** `ref` is a collection id or its path (`invoices/2026`), so developers can address collections by name. */
export async function findCollection(ctx: AccountContext, ref: string): Promise<Collection> {
  const path = ref.trim().replace(/^\/+|\/+$/g, '');
  const collection = await prisma.collection.findFirst({
    where: { accountId: ctx.accountId, OR: [{ id: ref }, { path }] },
  });
  if (!collection) throw notFound();
  return collection;
}

async function assertPathFree(accountId: string, path: string): Promise<void> {
  const existing = await prisma.collection.findUnique({ where: { accountId_path: { accountId, path } } });
  if (existing) throw new ApiError(status.CONFLICT, `Collection "${path}" already exists`, ERROR_CODES.COLLECTION_EXISTS);
}

export async function listCollections(ctx: AccountContext): Promise<ServiceResult<CollectionDto[]>> {
  const [collections, counts] = await Promise.all([
    prisma.collection.findMany({ where: { accountId: ctx.accountId }, orderBy: { path: 'asc' } }),
    prisma.file.groupBy({ by: ['collectionId'], where: { accountId: ctx.accountId }, _count: { _all: true } }),
  ]);
  const countById = new Map(counts.map((count) => [count.collectionId, count._count._all]));
  return {
    message: 'Collections retrieved',
    data: collections.map((collection) => toCollectionDto(collection, countById.get(collection.id) ?? 0)),
  };
}

export async function createCollection(
  ctx: AccountContext,
  input: CreateCollectionInput,
): Promise<ServiceResult<CollectionDto>> {
  const parentRef = input.parentId || input.parent;
  const parent = parentRef ? await findCollection(ctx, parentRef) : undefined;
  const path = joinPath(parent?.path, segmentFor(input.name));
  await assertPathFree(ctx.accountId, path);

  const collection = await prisma.collection.create({
    data: {
      accountId: ctx.accountId,
      parentId: parent?.id,
      name: input.name.trim(),
      path,
      access: input.access ?? DEFAULT_FILE_ACCESS,
    },
  });
  logActivity(ctx, 'collection.created', path);
  return { message: 'Collection created', data: toCollectionDto(collection, 0) };
}

/** Finds or creates every level of a `a/b/c` path — developer uploads create folders on demand. */
export async function ensureCollectionPath(ctx: AccountContext, rawPath: string): Promise<Collection | null> {
  const names = rawPath.split('/').map((part) => part.trim()).filter(Boolean);
  let current = null as Collection | null;
  for (const name of names) {
    const parent = current;
    const path = joinPath(parent?.path, segmentFor(name));
    const where = { accountId_path: { accountId: ctx.accountId, path } };
    current =
      (await prisma.collection.findUnique({ where })) ??
      (await prisma.collection
        .create({ data: { accountId: ctx.accountId, parentId: parent?.id, name, path, access: parent?.access ?? DEFAULT_FILE_ACCESS } })
        .catch(async (error: unknown) => {
          // Parallel uploads into a new folder race to create it; the loser uses the winner's row.
          const isTaken = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
          if (!isTaken) throw error;
          return prisma.collection.findUniqueOrThrow({ where });
        }));
  }
  return current;
}

export async function updateCollection(
  ctx: AccountContext,
  ref: string,
  input: UpdateCollectionInput,
): Promise<ServiceResult<CollectionDto>> {
  const collection = await findCollection(ctx, ref);
  const { id } = collection;
  const newName = input.name?.trim();
  const isRenamed = Boolean(newName && newName !== collection.name);

  if (isRenamed && newName) {
    const parentPath = collection.path.includes('/') ? collection.path.slice(0, collection.path.lastIndexOf('/')) : undefined;
    const newPath = joinPath(parentPath, segmentFor(newName));
    if (newPath !== collection.path) {
      await assertPathFree(ctx.accountId, newPath);
      await prisma.$executeRaw`
        UPDATE "Collection"
        SET path = ${newPath} || substring(path from ${collection.path.length + 1}::int), "updatedAt" = now()
        WHERE "accountId" = ${ctx.accountId} AND (path = ${collection.path} OR path LIKE ${`${collection.path}/%`})`;
    }
  }

  const updated = await prisma.collection.update({
    where: { id },
    data: { name: newName, access: input.access },
  });
  if (input.applyToFiles && input.access) {
    const subtree = { accountId: ctx.accountId, OR: [{ path: updated.path }, { path: { startsWith: `${updated.path}/` } }] };
    await prisma.collection.updateMany({ where: subtree, data: { access: input.access } });
    await prisma.file.updateMany({ where: { accountId: ctx.accountId, collection: subtree }, data: { access: input.access } });
  }
  const fileCount = await prisma.file.count({ where: { collectionId: id } });
  logActivity(ctx, 'collection.updated', updated.path);
  return { message: 'Collection updated', data: toCollectionDto(updated, fileCount) };
}

export async function deleteCollection(
  ctx: AccountContext,
  ref: string,
  isForced: boolean,
): Promise<ServiceResult<{ deletedFiles: number }>> {
  const collection = await findCollection(ctx, ref);
  const { id } = collection;
  const subtree = await prisma.collection.findMany({
    where: subtreeFilter(ctx.accountId, collection.path),
    select: { id: true },
  });
  const collectionIds = subtree.map((item) => item.id);
  const files = await prisma.file.findMany({
    where: { collectionId: { in: collectionIds } },
    select: { id: true, storageKey: true, derivatives: { select: { storageKey: true } } },
  });

  const hasContent = files.length > 0 || collectionIds.length > 1;
  if (hasContent && !isForced) {
    throw new ApiError(
      status.CONFLICT,
      'Collection is not empty — delete with force=true to remove its files and sub-collections',
      ERROR_CODES.COLLECTION_NOT_EMPTY,
    );
  }

  await prisma.$transaction([
    prisma.file.deleteMany({ where: { id: { in: files.map((file) => file.id) } } }),
    prisma.collection.delete({ where: { id } }),
  ]);
  await deleteObjects(files.flatMap((file) => [file.storageKey, ...file.derivatives.map((d) => d.storageKey)]));
  logActivity(ctx, 'collection.deleted', collection.path);
  return { message: 'Collection deleted', data: { deletedFiles: files.length } };
}

/** 16 URL-safe characters: unguessable, so only people given the link can open the gallery. */
const SHARE_TOKEN_BYTES = 12;

export interface CollectionSharing {
  collection: CollectionDto;
  /** Private files in the collection's subtree; the shared gallery leaves them out. */
  privateFileCount: number;
}

async function sharingResult(ctx: AccountContext, collection: Collection): Promise<CollectionSharing> {
  const [fileCount, privateFileCount] = await Promise.all([
    prisma.file.count({ where: { collectionId: collection.id } }),
    prisma.file.count({ where: { access: FileAccess.PRIVATE, collection: subtreeFilter(ctx.accountId, collection.path) } }),
  ]);
  return { collection: toCollectionDto(collection, fileCount), privateFileCount };
}

export async function getCollectionSharing(ctx: AccountContext, ref: string): Promise<ServiceResult<CollectionSharing>> {
  return { message: 'Sharing retrieved', data: await sharingResult(ctx, await findCollection(ctx, ref)) };
}

export type ShareOptions = {
  isShared: boolean;
  /** Whether gallery visitors may download files. Defaults to the collection's current setting. */
  allowDownload?: boolean;
};

/** Sharing keeps the existing link; turning it off and on again issues a new one. */
export async function setCollectionSharing(ctx: AccountContext, ref: string, options: ShareOptions): Promise<ServiceResult<CollectionSharing>> {
  const collection = await findCollection(ctx, ref);
  const { isShared, allowDownload } = options;
  if (isShared && collection.access === FileAccess.PRIVATE) {
    throw new ApiError(
      status.CONFLICT,
      'This folder is private — make it public before sharing a link',
      ERROR_CODES.COLLECTION_PRIVATE,
    );
  }
  const shareToken = isShared ? (collection.shareToken ?? randomBytes(SHARE_TOKEN_BYTES).toString('base64url')) : null;
  const wasShared = Boolean(collection.shareToken);
  const updated = await prisma.collection.update({
    where: { id: collection.id },
    data: {
      shareToken,
      ...(allowDownload !== undefined && { shareAllowDownload: allowDownload }),
    },
  });
  const action = !isShared ? 'collection.unshared' : wasShared ? 'collection.share_updated' : 'collection.shared';
  logActivity(ctx, action, updated.path);
  const message = !isShared ? 'Sharing turned off' : wasShared ? 'Sharing updated' : 'Collection shared';
  return { message, data: await sharingResult(ctx, updated) };
}
