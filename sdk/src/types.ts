export type FileAccess = "PUBLIC" | "PRIVATE";
export type FileKind = "image" | "document" | "video" | "audio" | "archive" | "other";
export type FileSort = "newest" | "oldest" | "name" | "largest" | "smallest";

export interface StoredFile {
  id: string;
  publicId: string;
  originalName: string;
  mime: string;
  ext: string;
  kind: FileKind;
  /** Bytes in storage — photos and text files are compressed on upload. */
  sizeBytes: number;
  /** Size as uploaded; present only when compression saved space. */
  originalSizeBytes?: number;
  /** SHA-256 of the file as uploaded. */
  checksum: string;
  access: FileAccess;
  width?: number;
  height?: number;
  tags: string[];
  collectionId?: string;
  collectionPath?: string;
  /** Permanent link — only present for public files. */
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  access: FileAccess;
  fileCount: number;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SignedUrl {
  url: string;
  expiresAt: string;
}

export interface UsageSummary {
  cloudName: string;
  storageBytes: number;
  quotaBytes: number;
  fileCount: number;
  collectionCount: number;
  activeApiKeyCount: number;
  byKind: { kind: FileKind; count: number; bytes: number }[];
  daily: { date: string; uploads: number; uploadBytes: number; deliveries: number; deliveryBytes: number; transforms: number }[];
  byApiKey: { apiKeyId: string; name: string; requests: number }[];
}

export interface UploadOptions {
  /** Collection path such as `invoices/2026`; missing collections are created. */
  collection?: string;
  collectionId?: string;
  /** Defaults to the collection's access, or PUBLIC. */
  access?: FileAccess;
  /** Custom public ID (letters, digits, - and _). Only valid when uploading a single file. */
  publicId?: string;
  tags?: string[];
}

/** Anything that can be uploaded: a browser `File`/`Blob`, or raw bytes with a file name. */
export type UploadSource = Blob | { data: Blob | ArrayBuffer | Uint8Array; filename: string; type?: string };

export interface ListFilesQuery {
  collection?: string;
  collectionId?: string;
  search?: string;
  kind?: FileKind;
  access?: FileAccess;
  tag?: string;
  sort?: FileSort;
  page?: number;
  pageSize?: number;
}

export interface UpdateFileInput {
  originalName?: string;
  publicId?: string;
  collectionId?: string | null;
  access?: FileAccess;
  tags?: string[];
}

export interface SignedUrlOptions {
  /** Seconds until the link expires (60 – 604800). Defaults to 3600. */
  expiresIn?: number;
  /** Image transformation, e.g. `w_600,f_webp` or a {@link TransformOptions} object. */
  transform?: string | TransformOptions;
  /** Serve as an attachment instead of inline. */
  download?: boolean;
}

export interface CreateCollectionInput {
  name: string;
  parentId?: string;
  /** Parent collection path — an alternative to `parentId`. */
  parent?: string;
  access?: FileAccess;
}

export interface UpdateCollectionInput {
  name?: string;
  access?: FileAccess;
  /** With `access`: also switch every file in the collection and its sub-collections. */
  applyToFiles?: boolean;
}

export interface TransformOptions {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit";
  quality?: number;
  format?: "webp" | "avif" | "jpg" | "png";
}

export interface WebhookPayload<T = StoredFile> {
  event: "file.uploaded" | "file.deleted";
  createdAt: string;
  data: T;
}
