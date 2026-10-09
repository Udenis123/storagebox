export type FileAccess = "PUBLIC" | "PRIVATE";
export type FileKind = "image" | "document" | "video" | "audio" | "archive" | "other";
export type UserRole = "USER" | "ADMIN";
export type ApiKeyScope = "READ" | "READ_WRITE";

export type Profile = {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role: UserRole;
  account: { id: string; name: string; cloudName: string; quotaBytes: number };
};

export type Session = { accessToken: string; refreshToken: string; user: Profile };

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };

export type StoredFile = {
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
  createdAt: string;
  updatedAt: string;
};

export type Collection = {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  access: FileAccess;
  fileCount: number;
  createdAt: string;
};

export type ApiKey = {
  id: string;
  name: string;
  keyId: string;
  scope: ApiKeyScope;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
};

export type CreatedApiKey = ApiKey & { secret: string };

export type WebhookEvent = "file.uploaded" | "file.deleted";

export type Webhook = {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  lastStatus?: number;
  lastAttemptAt?: string;
  createdAt: string;
};

export type UsageDay = {
  date: string;
  uploads: number;
  uploadBytes: number;
  deliveries: number;
  deliveryBytes: number;
  transforms: number;
};

export type UsageSummary = {
  cloudName: string;
  storageBytes: number;
  quotaBytes: number;
  fileCount: number;
  collectionCount: number;
  activeApiKeyCount: number;
  byKind: { kind: FileKind; count: number; bytes: number }[];
  daily: UsageDay[];
  byApiKey: { apiKeyId: string; name: string; requests: number }[];
};

export type ActivityEntry = { id: string; actor: string; action: string; target?: string; createdAt: string };

export type AccountStatus = "PENDING" | "ACTIVE" | "REJECTED";

export type AdminAccount = {
  id: string;
  name: string;
  cloudName: string;
  status: AccountStatus;
  quotaBytes: number;
  storageBytes: number;
  fileCount: number;
  isSuspended: boolean;
  owner?: { name: string; email: string; role: UserRole };
  reviewedAt?: string;
  createdAt: string;
};

export type UpdateAccountInput = { status?: Exclude<AccountStatus, "PENDING">; quotaGb?: number; isSuspended?: boolean };

export type PlatformStats = {
  accountCount: number;
  pendingCount: number;
  storageRequestCount: number;
  userCount: number;
  fileCount: number;
  storageBytes: number;
};

export type StorageRequestStatus = "PENDING" | "APPROVED" | "DECLINED";

export type StorageRequest = {
  id: string;
  status: StorageRequestStatus;
  requestedBytes: number;
  grantedBytes?: number;
  reason?: string;
  requestedBy: string;
  reviewedAt?: string;
  createdAt: string;
};

export type AdminStorageRequest = StorageRequest & {
  account: { id: string; name: string; cloudName: string; quotaBytes: number; storageBytes: number };
};

export type RequestStorageInput = { quotaGb: number; reason?: string };
export type ReviewStorageRequestInput = { status: Exclude<StorageRequestStatus, "PENDING">; quotaGb?: number };

export type RegistrationResult = { email: string; status: AccountStatus };
