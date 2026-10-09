import { AccountStatus, ApiKeyScope, FileAccess, UserRole } from '@prisma/client';

export { AccountStatus, ApiKeyScope, FileAccess, UserRole };

export interface AuthUser {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role: UserRole;
}

/** Who is acting on an account: a signed-in user (dashboard) or an API key (developer API). */
export interface AccountContext {
  accountId: string;
  cloudName: string;
  actor: string;
  userId?: string;
  apiKeyId?: string;
  canWrite: boolean;
}

export type FileKind = 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other';

export interface FileDto {
  id: string;
  publicId: string;
  originalName: string;
  mime: string;
  ext: string;
  kind: FileKind;
  sizeBytes: number;
  checksum: string;
  access: FileAccess;
  width?: number;
  height?: number;
  tags: string[];
  collectionId?: string;
  collectionPath?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionDto {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  access: FileAccess;
  fileCount: number;
  createdAt: Date;
}

export interface ApiKeyDto {
  id: string;
  name: string;
  keyId: string;
  scope: ApiKeyScope;
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

export interface WebhookDto {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  lastStatus?: number;
  lastAttemptAt?: Date;
  createdAt: Date;
}

export const WEBHOOK_EVENTS = ['file.uploaded', 'file.deleted'] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
