import { Collection, Prisma } from '@prisma/client';
import status from 'http-status';
import prisma from '@/config/prisma';
import { deleteObjects } from '@/lib/storage';
import { AccountContext, CollectionDto, FileAccess } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { toCollectionDto } from '@/utils/dto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { ServiceResult } from '@/utils/response';
import { slugify } from '@/utils/slug';
import { logActivity } from './activityService';

export interface CreateCollectionInput {
  name: string;
  parentId?: string;
  access?: FileAccess;
}

export interface UpdateCollectionInput {
  name?: string;
  access?: FileAccess;
}

const notFound = () => new ApiError(status.NOT_FOUND, 'Collection not found', ERROR_CODES.COLLECTION_NOT_FOUND);

const segmentFor = (name: string): string => {
  const segment = slugify(name);
  if (!segment) throw new ApiError(status.BAD_REQUEST, 'Collection name must contain letters or digits', ERROR_CODES.VALIDATION_ERROR);
  return segment;
};

const joinPath = (parentPath: string | undefined, segment: string): string =>
  parentPath ? `${parentPath}/${segment}` : segment;

const subtreeFilter = (accountId: string, path: string): Prisma.CollectionWhereInput => ({
  accountId,
  OR: [{ path }, { path: { startsWith: `${path}/` } }],
});

export async function findCollection(ctx: AccountContext, id: string): Promise<Collection> {
  const collection = await prisma.collection.findFirst({ where: { id, accountId: ctx.accountId } });
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
  const parent = input.parentId ? await findCollection(ctx, input.parentId) : undefined;
  const path = joinPath(parent?.path, segmentFor(input.name));
  await assertPathFree(ctx.accountId, path);

  const collection = await prisma.collection.create({
    data: {
      accountId: ctx.accountId,
      parentId: parent?.id,
      name: input.name.trim(),
      path,
      access: input.access ?? parent?.access ?? FileAccess.PUBLIC,
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
    const existing = await prisma.collection.findUnique({
      where: { accountId_path: { accountId: ctx.accountId, path } },
    });
    current =
      existing ??
      (await prisma.collection.create({
        data: {
          accountId: ctx.accountId,
          parentId: parent?.id,
          name,
          path,
          access: parent?.access ?? FileAccess.PUBLIC,
        },
      }));
  }
  return current;
}

export async function updateCollection(
  ctx: AccountContext,
  id: string,
  input: UpdateCollectionInput,
): Promise<ServiceResult<CollectionDto>> {
  const collection = await findCollection(ctx, id);
  const newName = input.name?.trim();
  const isRenamed = Boolean(newName && newName !== collection.name);

  if (isRenamed && newName) {
    const parentPath = collection.path.includes('/') ? collection.path.slice(0, collection.path.lastIndexOf('/')) : undefined;
    const newPath = joinPath(parentPath, segmentFor(newName));
    if (newPath !== collection.path) {
      await assertPathFree(ctx.accountId, newPath);
      await prisma.$executeRaw`
        UPDATE "Collection"
        SET path = ${newPath} || substring(path from ${collection.path.length + 1}), "updatedAt" = now()
        WHERE "accountId" = ${ctx.accountId} AND (path = ${collection.path} OR path LIKE ${`${collection.path}/%`})`;
    }
  }

  const updated = await prisma.collection.update({
    where: { id },
    data: { name: newName, access: input.access },
  });
  const fileCount = await prisma.file.count({ where: { collectionId: id } });
  logActivity(ctx, 'collection.updated', updated.path);
  return { message: 'Collection updated', data: toCollectionDto(updated, fileCount) };
}

export async function deleteCollection(
  ctx: AccountContext,
  id: string,
  isForced: boolean,
): Promise<ServiceResult<{ deletedFiles: number }>> {
  const collection = await findCollection(ctx, id);
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
