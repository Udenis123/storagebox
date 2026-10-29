#!/usr/bin/env node
/// <reference types="node" />
import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { StorageBox } from "../client.js";
import type { FileAccess } from "../types.js";
import { importFolder, type ImportProgress } from "./folderImport.js";

const DEFAULT_CONCURRENCY = 8;
const MAX_CONCURRENCY = 64;
const MB = 1024 * 1024;

const USAGE = `Usage: storagebox upload <folder> [options]

Uploads every file in <folder>. Sub-folders become collections, files upload in
parallel, and a stopped run picks up where it left off when started again.

Options:
  --collection <path>   Collection for the folder (default: the folder's name)
  --access <access>     public or private (default: private)
  --concurrency <n>     Parallel uploads, 1-${MAX_CONCURRENCY} (default: ${DEFAULT_CONCURRENCY})
  --state <file>        Progress file (default: .storagebox-upload-<hash>.json here)
  --dry-run             Count what would be uploaded without sending anything
  -h, --help            Show this help

Credentials come from STORAGEBOX_API_KEY, STORAGEBOX_API_SECRET,
STORAGEBOX_CLOUD_NAME and STORAGEBOX_API_URL.`;

function fail(message: string): never {
  console.error(`storagebox: ${message}\n\n${USAGE}`);
  process.exit(1);
}

function parseAccess(value: string | undefined): FileAccess | undefined {
  if (value === undefined) return undefined;
  const access = value.toUpperCase();
  if (access !== "PUBLIC" && access !== "PRIVATE") fail(`--access must be public or private, got "${value}"`);
  return access;
}

function parseConcurrency(value: string | undefined): number {
  if (value === undefined) return DEFAULT_CONCURRENCY;
  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
    fail(`--concurrency must be a whole number from 1 to ${MAX_CONCURRENCY}`);
  }
  return concurrency;
}

/** Rates are measured from the first report, so files finished by an earlier run don't inflate them. */
function progressReporter(): (progress: ImportProgress) => void {
  const isInteractive = Boolean(process.stdout.isTTY);
  let start: { at: number; uploaded: number; bytes: number } | undefined;
  let hasWarnedRateLimit = false;
  return (progress) => {
    start ??= { at: Date.now(), uploaded: progress.uploaded, bytes: progress.bytes };
    if (progress.rateLimited > 0 && !hasWarnedRateLimit) {
      hasWarnedRateLimit = true;
      console.log(`${isInteractive ? "\n" : ""}The server's rate limit was reached; uploads wait and retry. Raise RATE_LIMIT_PER_MINUTE on the server for big imports.`);
    }
    const seconds = Math.max((Date.now() - start.at) / 1000, 1);
    const line = [
      `${progress.processed.toLocaleString()} done`,
      `${progress.uploaded.toLocaleString()} uploaded`,
      `${progress.alreadyThere.toLocaleString()} already there`,
      `${progress.unsupported.toLocaleString()} unsupported`,
      `${progress.failed.toLocaleString()} failed`,
      `${((progress.uploaded - start.uploaded) / seconds).toFixed(1)} files/s`,
      `${((progress.bytes - start.bytes) / MB / seconds).toFixed(1)} MB/s`,
    ].join(" · ");
    if (isInteractive) process.stdout.write(`\r\x1b[2K${line}`);
    else console.log(line);
  };
}

async function upload(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      collection: { type: "string" },
      access: { type: "string" },
      concurrency: { type: "string" },
      state: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (positionals.length !== 1) fail("give exactly one folder to upload");

  const folder = path.resolve(positionals[0]);
  const folderStat = await stat(folder).catch(() => undefined);
  if (!folderStat?.isDirectory()) fail(`${folder} is not a folder`);

  const collection = values.collection ?? path.basename(folder);
  const folderHash = createHash("sha1").update(`${folder}\n${collection}`).digest("hex").slice(0, 12);
  const statePath = path.resolve(values.state ?? `.storagebox-upload-${folderHash}.json`);
  const isDryRun = values["dry-run"] ?? false;

  console.log(`Uploading ${folder} → collection "${collection}"`);
  console.log(
    isDryRun
      ? "Dry run: nothing is sent, \"uploaded\" counts what would be uploaded."
      : `Progress is saved to ${statePath}; run the same command again to resume.`,
  );

  let isStopping = false;
  process.on("SIGINT", () => {
    if (isStopping) process.exit(130);
    isStopping = true;
    console.log("\nStopping after the current uploads… (press Ctrl+C again to quit now)");
  });

  const progress = await importFolder({
    client: isDryRun ? undefined : new StorageBox(),
    folder,
    collection,
    access: parseAccess(values.access),
    concurrency: parseConcurrency(values.concurrency),
    statePath,
    shouldStop: () => isStopping,
    onProgress: progressReporter(),
  });

  console.log("");
  if (progress.failed > 0) {
    console.log(`${progress.failed.toLocaleString()} files failed; see ${statePath}.errors.log`);
    process.exitCode = 2;
  }
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "-h" || command === "--help") {
    console.log(USAGE);
    return;
  }
  if (command !== "upload") fail(`unknown command "${command}"`);
  await upload(rest);
}

main().catch((error: unknown) => {
  console.error(`\nstoragebox: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
