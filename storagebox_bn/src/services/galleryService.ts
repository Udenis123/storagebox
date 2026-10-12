import { Prisma } from '@prisma/client';
import status from 'http-status';
import prisma from '@/config/prisma';
import { extensionsForKind } from '@/lib/fileTypes';
import { FileAccess, FileDto, FileKind } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { toFileDto } from '@/utils/dto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { Paginated } from '@/utils/response';
import { subtreeFilter } from './collectionService';

const IMAGE_EXTENSIONS = extensionsForKind('image');

export interface GalleryQuery {
  /** Id of a sub-collection to open; defaults to the shared collection itself. */
  folder?: string;
  kind?: FileKind;
  page: number;
  pageSize: number;
}

export interface GalleryFolder {
  id: string;
  name: string;
  fileCount: number;
  /** A public image from the folder, used as its cover. */
  coverUrl?: string;
}

/** Fields that describe the owner's storage layout are left out of public galleries. */
export type GalleryFile = Omit<FileDto, 'checksum' | 'collectionId' | 'collectionPath'>;

const toGalleryFile = ({ checksum: _checksum, collectionId: _collectionId, collectionPath: _collectionPath, ...file }: FileDto): GalleryFile => file;

export interface GalleryDto {
  name: string;
  cloudName: string;
  /** From the shared collection down to the open folder. */
  breadcrumb: { id: string; name: string }[];
  folders: GalleryFolder[];
  files: Paginated<GalleryFile>;
}

const notFound = () => new ApiError(status.NOT_FOUND, 'This gallery does not exist or is no longer shared', ERROR_CODES.NOT_FOUND);

const publicFilesIn = (accountId: string, path: string): Prisma.FileWhereInput => ({
  accountId,
  access: FileAccess.PUBLIC,
  collection: subtreeFilter(accountId, path),
});

/** Anyone with the link sees the public files of a shared collection and its sub-collections; private files stay hidden. */
export async function getSharedGallery(shareToken: string, query: GalleryQuery): Promise<GalleryDto> {
  const root = await prisma.collection.findUnique({
    where: { shareToken },
    include: { account: { select: { cloudName: true, isSuspended: true } } },
  });
  if (!root || root.account.isSuspended) throw notFound();
  const { accountId } = root;
  const { cloudName } = root.account;

  const current = query.folder && query.folder !== root.id
    ? await prisma.collection.findFirst({ where: { id: query.folder, accountId, path: { startsWith: `${root.path}/` } } })
    : root;
  if (!current) throw notFound();

  const relativeSegments = current.path.slice(root.path.length).split('/').filter(Boolean);
  const breadcrumbPaths = relativeSegments.map((_, index) => [root.path, ...relativeSegments.slice(0, index + 1)].join('/'));
  const fileWhere: Prisma.FileWhereInput = {
    ...publicFilesIn(accountId, current.path),
    ...(query.kind && { ext: { in: extensionsForKind(query.kind) } }),
  };

  const [ancestors, children, files, total] = await Promise.all([
    prisma.collection.findMany({ where: { accountId, path: { in: breadcrumbPaths } }, select: { id: true, name: true, path: true } }),
    prisma.collection.findMany({ where: { parentId: current.id }, orderBy: { name: 'asc' }, select: { id: true, name: true, path: true } }),
    prisma.file.findMany({
      where: fileWhere,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.file.count({ where: fileWhere }),
  ]);

  const folders = await Promise.all(
    children.map(async (child): Promise<GalleryFolder> => {
      const where = publicFilesIn(accountId, child.path);
      const [fileCount, cover] = await Promise.all([
        prisma.file.count({ where }),
        prisma.file.findFirst({ where: { ...where, ext: { in: IMAGE_EXTENSIONS } }, orderBy: { createdAt: 'desc' } }),
      ]);
      return { id: child.id, name: child.name, fileCount, coverUrl: cover ? toFileDto(cover, cloudName).url : undefined };
    }),
  );

  const ancestorByPath = new Map(ancestors.map((ancestor) => [ancestor.path, ancestor]));
  return {
    name: root.name,
    cloudName,
    breadcrumb: [root, ...breadcrumbPaths.map((path) => ancestorByPath.get(path)).filter((item) => item !== undefined)].map(({ id, name }) => ({ id, name })),
    folders: folders.filter((folder) => folder.fileCount > 0),
    files: { items: files.map((file) => toGalleryFile(toFileDto(file, cloudName))), total, page: query.page, pageSize: query.pageSize },
  };
}
