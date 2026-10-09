import { resolveTransform, withTransform } from "./delivery.js";
import { StorageBoxError } from "./errors.js";
import type {
  Collection,
  CreateCollectionInput,
  ListFilesQuery,
  Paginated,
  SignedUrl,
  SignedUrlOptions,
  StoredFile,
  TransformOptions,
  UpdateCollectionInput,
  UpdateFileInput,
  UploadOptions,
  UploadSource,
  UsageSummary,
} from "./types.js";

export const DEFAULT_BASE_URL = "https://storagebox.urbinaryhub.com";

/** Every option falls back to its `STORAGEBOX_*` environment variable when omitted. */
export interface StorageBoxConfig {
  /** API key. Env: `STORAGEBOX_API_KEY`. */
  apiKey?: string;
  /** API secret — keep it on the server. Env: `STORAGEBOX_API_SECRET`. */
  apiSecret?: string;
  /** Your cloud name; requests fail if the key belongs to another cloud. Env: `STORAGEBOX_CLOUD_NAME`. */
  cloudName?: string;
  /** API origin without `/v1`. Env: `STORAGEBOX_API_URL`. Defaults to the hosted StorageBox. */
  baseUrl?: string;
  /** Custom fetch (tests, proxies). Defaults to the global fetch. */
  fetch?: typeof fetch;
}

type Environment = Record<string, string | undefined>;

const readEnv = (): Environment => (globalThis as { process?: { env?: Environment } }).process?.env ?? {};

type Envelope<T> = { status: "success" | "error"; message: string; data?: T; errorCode?: string };
type QueryValue = string | number | boolean | undefined;

function queryString(query: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  const text = params.toString();
  return text ? `?${text}` : "";
}

function toBlobPart(source: UploadSource): { blob: Blob; filename: string } {
  if (source instanceof Blob) return { blob: source, filename: "name" in source ? String(source.name) : "file" };
  const data = source.data instanceof Blob ? source.data : new Blob([source.data as BlobPart], { type: source.type });
  return { blob: data, filename: source.filename };
}

function uploadForm(options: UploadOptions): FormData {
  const form = new FormData();
  if (options.collection) form.set("collection", options.collection);
  if (options.collectionId) form.set("collectionId", options.collectionId);
  if (options.access) form.set("access", options.access);
  if (options.publicId) form.set("publicId", options.publicId);
  if (options.tags?.length) form.set("tags", options.tags.join(","));
  return form;
}

export class StorageBox {
  private readonly baseUrl: string;
  private readonly authorization: string;
  private readonly cloudName?: string;
  private readonly fetcher: typeof fetch;

  constructor(config: StorageBoxConfig = {}) {
    const env = readEnv();
    const apiKey = config.apiKey ?? env.STORAGEBOX_API_KEY;
    const apiSecret = config.apiSecret ?? env.STORAGEBOX_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error("StorageBox: pass apiKey and apiSecret, or set STORAGEBOX_API_KEY and STORAGEBOX_API_SECRET");
    }
    this.baseUrl = (config.baseUrl ?? env.STORAGEBOX_API_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.cloudName = config.cloudName ?? env.STORAGEBOX_CLOUD_NAME;
    this.authorization = `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
    this.fetcher = config.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(method: string, path: string, body?: FormData | object): Promise<T> {
    const isForm = body instanceof FormData;
    const response = await this.fetcher(`${this.baseUrl}/v1${path}`, {
      method,
      headers: {
        authorization: this.authorization,
        ...(this.cloudName && { "x-cloud-name": this.cloudName }),
        ...(body && !isForm && { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (!response.ok) {
      const retryAfter = Number(response.headers.get("retry-after")) || undefined;
      throw new StorageBoxError(payload?.message ?? `Request failed with status ${response.status}`, response.status, payload?.errorCode, retryAfter);
    }
    return payload?.data as T;
  }

  readonly files = {
    /** Upload one file. Resolves with the stored file (including `url` when public). */
    upload: async (source: UploadSource, options: UploadOptions = {}): Promise<StoredFile> => {
      const [file] = await this.files.uploadMany([source], options);
      return file;
    },

    /** Upload up to 20 files in one request, all with the same options. */
    uploadMany: (sources: UploadSource[], options: Omit<UploadOptions, "publicId"> = {}): Promise<StoredFile[]> => {
      const form = uploadForm(options);
      for (const source of sources) {
        const { blob, filename } = toBlobPart(source);
        form.append("file", blob, filename);
      }
      return this.request<StoredFile[]>("POST", "/files", form);
    },

    /** Let StorageBox download a file from a public http(s) URL. */
    importUrl: async (url: string, options: UploadOptions = {}): Promise<StoredFile> => {
      const [file] = await this.request<StoredFile[]>("POST", "/files", { ...options, url });
      return file;
    },

    list: (query: ListFilesQuery = {}): Promise<Paginated<StoredFile>> =>
      this.request("GET", `/files${queryString({ ...query })}`),

    get: (publicId: string): Promise<StoredFile> => this.request("GET", `/files/${encodeURIComponent(publicId)}`),

    update: (publicId: string, input: UpdateFileInput): Promise<StoredFile> =>
      this.request("PATCH", `/files/${encodeURIComponent(publicId)}`, input),

    delete: (publicId: string): Promise<void> => this.request("DELETE", `/files/${encodeURIComponent(publicId)}`),

    /** Delete many files by their `id` (not publicId). */
    deleteMany: (ids: string[]): Promise<{ deleted: number }> => this.request("POST", "/files/bulk-delete", { ids }),

    /** Time-limited link that works for private and public files. */
    signedUrl: (publicId: string, options: SignedUrlOptions = {}): Promise<SignedUrl> =>
      this.request("POST", `/files/${encodeURIComponent(publicId)}/signed-url`, {
        ...options,
        transform: resolveTransform(options.transform),
      }),
  };

  readonly collections = {
    list: (): Promise<Collection[]> => this.request("GET", "/collections"),
    create: (input: CreateCollectionInput): Promise<Collection> => this.request("POST", "/collections", input),
    update: (id: string, input: UpdateCollectionInput): Promise<Collection> => this.request("PATCH", `/collections/${id}`, input),
    /** `force` also deletes every file and sub-collection inside. */
    delete: (id: string, options: { force?: boolean } = {}): Promise<void> =>
      this.request("DELETE", `/collections/${id}${queryString({ force: options.force })}`),
  };

  usage = (): Promise<UsageSummary> => this.request("GET", "/usage");

  /** Permanent link of a public file, optionally transformed. No network call; private files need `files.signedUrl`. */
  url(file: Pick<StoredFile, "url" | "publicId">, transform?: string | TransformOptions): string {
    if (!file.url) throw new StorageBoxError(`File "${file.publicId}" is private — use files.signedUrl()`, 403);
    return withTransform(file.url, transform);
  }
}
