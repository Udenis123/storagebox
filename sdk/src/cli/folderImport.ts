/// <reference types="node" />
import { createHash } from "node:crypto";
import { appendFile, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import * as fs from "node:fs";
import * as path from "node:path";
import type { StorageBox } from "../client.js";
import { StorageBoxError } from "../errors.js";
import type { FileAccess } from "../types.js";

/** Must match the API's allowed extensions; anything else is skipped without being sent. */
const UPLOADABLE_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "rtf", "txt", "csv", "md", "json", "zip",
  "jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "mp4", "mov", "webm", "mp3", "wav",
]);

const MAX_ATTEMPTS = 5;
const BASE_RETRY_MS = 1000;
const STATE_SAVE_INTERVAL_MS = 2000;
const PUBLIC_ID_NAME_LENGTH = 60;
const PUBLIC_ID_HASH_LENGTH = 10;
const HTTP_CONFLICT = 409;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;

export interface ImportOptions {
  /** Without a client nothing is sent: a dry run that only counts files and bytes. */
  client?: StorageBox;
  folder: string;
  /** Collection that mirrors the folder; sub-folders become sub-collections. */
  collection: string;
  access?: FileAccess;
  concurrency: number;
  statePath: string;
  /** Checked before each new file; in-flight uploads still finish. */
  shouldStop: () => boolean;
  onProgress: (progress: ImportProgress) => void;
}

export interface ImportProgress {
  uploaded: number;
  alreadyThere: number;
  unsupported: number;
  failed: number;
  bytes: number;
  /** Times the server answered 429; a hint to raise its RATE_LIMIT_PER_MINUTE. */
  rateLimited: number;
  /** Files handled so far in walk order, including those finished by an earlier run. */
  processed: number;
}

interface ImportState {
  folder: string;
  collection: string;
  /** Every file before this position (in walk order) is done. */
  nextIndex: number;
  progress: ImportProgress;
}

interface FolderEntry {
  index: number;
  absolutePath: string;
  relativePath: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withoutAccents = (value: string): string => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

const slug = (value: string): string =>
  withoutAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Collection names accept only ASCII letters, digits, spaces, `-` and `_`. */
const collectionSegment = (name: string): string =>
  withoutAccents(name).replace(/[^\w\- ]+/g, "-").replace(/^[-\s]+|[-\s]+$/g, "") || "folder";

/** Same file path → same public ID, so a re-run recognises files it already uploaded. */
export function publicIdFor(relativePath: string): string {
  const name = slug(path.basename(relativePath, path.extname(relativePath))).slice(0, PUBLIC_ID_NAME_LENGTH) || "file";
  const hash = createHash("sha1").update(relativePath.split(path.sep).join("/")).digest("hex").slice(0, PUBLIC_ID_HASH_LENGTH);
  return `${name}_${hash}`;
}

const extensionOf = (fileName: string): string => path.extname(fileName).slice(1).toLowerCase();

/** Depth-first, name-sorted walk: the order is stable between runs, which is what makes resuming by position safe. */
async function* walk(root: string, relativeDir = ""): AsyncGenerator<string> {
  const entries = await readdir(path.join(root, relativeDir), { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) yield* walk(root, relativePath);
    else if (entry.isFile()) yield relativePath;
  }
}

async function loadState(options: ImportOptions): Promise<ImportState> {
  const fresh: ImportState = {
    folder: options.folder,
    collection: options.collection,
    nextIndex: 0,
    progress: { uploaded: 0, alreadyThere: 0, unsupported: 0, failed: 0, bytes: 0, rateLimited: 0, processed: 0 },
  };
  try {
    const saved = JSON.parse(await readFile(options.statePath, "utf8")) as ImportState;
    if (saved.folder !== options.folder || saved.collection !== options.collection) return fresh;
    return { ...saved, progress: { ...fresh.progress, ...saved.progress } };
  } catch {
    return fresh;
  }
}

async function saveState(statePath: string, state: ImportState): Promise<void> {
  const temporary = `${statePath}.tmp`;
  await writeFile(temporary, JSON.stringify(state));
  await rename(temporary, statePath);
}

type OpenAsBlob = (filePath: string) => Promise<Blob>;

/** File-backed Blob on Node ≥ 19.8 streams from disk; older versions read the file into memory. */
async function fileBlob(filePath: string): Promise<Blob> {
  const openAsBlob = (fs as unknown as { openAsBlob?: OpenAsBlob }).openAsBlob;
  return openAsBlob ? openAsBlob(filePath) : new Blob([await readFile(filePath)]);
}

const isRetryable = (error: unknown): boolean =>
  !(error instanceof StorageBoxError) || error.status === HTTP_TOO_MANY_REQUESTS || error.status >= HTTP_SERVER_ERROR;

/** Tracks out-of-order completions and advances the checkpoint only past an unbroken run of finished files. */
class Checkpoint {
  private readonly finished = new Set<number>();

  constructor(public nextIndex: number) {}

  complete(index: number): void {
    this.finished.add(index);
    while (this.finished.delete(this.nextIndex)) this.nextIndex += 1;
  }
}

export async function importFolder(options: ImportOptions): Promise<ImportProgress> {
  const state = await loadState(options);
  const { progress } = state;
  const checkpoint = new Checkpoint(state.nextIndex);
  const errorLogPath = `${options.statePath}.errors.log`;

  const persist = async () => {
    if (!options.client) return;
    state.nextIndex = checkpoint.nextIndex;
    await saveState(options.statePath, state);
  };

  async function uploadEntry(entry: FolderEntry): Promise<void> {
    const ext = extensionOf(entry.relativePath);
    if (!UPLOADABLE_EXTENSIONS.has(ext)) {
      progress.unsupported += 1;
      return;
    }
    const relativeDir = path.dirname(entry.relativePath);
    const collection = [options.collection, ...(relativeDir === "." ? [] : relativeDir.split(path.sep))]
      .map(collectionSegment)
      .join("/");
    const { client } = options;
    if (!client) {
      progress.uploaded += 1;
      progress.bytes += (await stat(entry.absolutePath)).size;
      return;
    }

    for (let attempt = 1; ; attempt += 1) {
      try {
        const data = await fileBlob(entry.absolutePath);
        await client.files.upload(
          { data, filename: path.basename(entry.relativePath) },
          { collection, access: options.access, publicId: publicIdFor(entry.relativePath) },
        );
        progress.uploaded += 1;
        progress.bytes += data.size;
        return;
      } catch (error) {
        if (error instanceof StorageBoxError && error.status === HTTP_CONFLICT) {
          progress.alreadyThere += 1;
          return;
        }
        if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) {
          progress.failed += 1;
          const reason = error instanceof Error ? error.message : String(error);
          await appendFile(errorLogPath, `${entry.relativePath}\t${reason}\n`);
          return;
        }
        const isRateLimited = error instanceof StorageBoxError && error.status === HTTP_TOO_MANY_REQUESTS;
        if (isRateLimited) progress.rateLimited += 1;
        const retryAfterMs = isRateLimited && error.retryAfterSeconds ? error.retryAfterSeconds * 1000 : 0;
        await sleep(Math.max(retryAfterMs, BASE_RETRY_MS * 2 ** (attempt - 1)));
      }
    }
  }

  options.onProgress(progress);
  const running = new Set<Promise<void>>();
  const saveTimer = setInterval(() => {
    options.onProgress(progress);
    void persist();
  }, STATE_SAVE_INTERVAL_MS);

  try {
    let index = 0;
    for await (const relativePath of walk(options.folder)) {
      const entry: FolderEntry = { index, absolutePath: path.join(options.folder, relativePath), relativePath };
      index += 1;
      if (entry.index < state.nextIndex) continue;
      if (options.shouldStop()) break;

      const task = uploadEntry(entry).finally(() => {
        checkpoint.complete(entry.index);
        progress.processed = checkpoint.nextIndex;
        running.delete(task);
      });
      running.add(task);
      if (running.size >= options.concurrency) await Promise.race(running);
    }
    await Promise.all(running);
  } finally {
    clearInterval(saveTimer);
    progress.processed = checkpoint.nextIndex;
    await persist();
    options.onProgress(progress);
  }
  return progress;
}
