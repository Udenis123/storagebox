import { ApiKey, Collection, File, Webhook } from '@prisma/client';
import { config } from '@/config/config';
import { kindForExtension } from '@/lib/fileTypes';
import { publicUrl } from '@/lib/deliveryUrl';
import { ApiKeyDto, CollectionDto, FileAccess, FileDto, WebhookDto } from '@/types/api';

type FileWithCollection = File & { collection?: Pick<Collection, 'path'> | null };

export function toFileDto(file: FileWithCollection, cloudName: string): FileDto {
  const isPublic = file.access === FileAccess.PUBLIC;
  return {
    id: file.id,
    publicId: file.publicId,
    originalName: file.originalName,
    mime: file.mime,
    ext: file.ext,
    kind: kindForExtension(file.ext),
    sizeBytes: Number(file.sizeBytes),
    originalSizeBytes: file.originalSizeBytes === null ? undefined : Number(file.originalSizeBytes),
    checksum: file.checksum,
    access: file.access,
    width: file.width ?? undefined,
    height: file.height ?? undefined,
    tags: file.tags,
    collectionId: file.collectionId ?? undefined,
    collectionPath: file.collection?.path,
    url: isPublic ? publicUrl({ cloudName, publicId: file.publicId, ext: file.ext }) : undefined,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

export const toCollectionDto = (collection: Collection, fileCount: number): CollectionDto => ({
  id: collection.id,
  name: collection.name,
  path: collection.path,
  parentId: collection.parentId ?? undefined,
  access: collection.access,
  shareUrl: collection.shareToken ? `${config.appUrl}/s/${collection.shareToken}` : undefined,
  shareAllowDownload: collection.shareAllowDownload,
  isShareBlocked: Boolean(collection.shareToken) && collection.access === FileAccess.PRIVATE,
  fileCount,
  createdAt: collection.createdAt,
});

export const toApiKeyDto = (key: ApiKey): ApiKeyDto => ({
  id: key.id,
  name: key.name,
  keyId: key.keyId,
  scope: key.scope,
  lastUsedAt: key.lastUsedAt ?? undefined,
  revokedAt: key.revokedAt ?? undefined,
  createdAt: key.createdAt,
});

export const toWebhookDto = (webhook: Webhook): WebhookDto => ({
  id: webhook.id,
  url: webhook.url,
  secret: webhook.secret,
  events: webhook.events,
  isActive: webhook.isActive,
  lastStatus: webhook.lastStatus ?? undefined,
  lastAttemptAt: webhook.lastAttemptAt ?? undefined,
  createdAt: webhook.createdAt,
});
