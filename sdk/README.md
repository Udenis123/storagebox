# @udenis123/storagebox

Official client for [StorageBox](https://storagebox.urbinaryhub.rw) — store files, organise them in collections, transform images on the fly and share them with permanent or expiring links. Zero dependencies; works in Node 18+, Bun, Deno and edge runtimes, with both `import` and `require`.

> Use it on your **server**. The API secret must never be shipped to a browser.

## Install

```bash
npm install @udenis123/storagebox
```

## Configure

[Request an account](https://storagebox.urbinaryhub.rw/register). Once an administrator approves it, open **API Keys** in the dashboard, create a key and copy the three values into your `.env`:

```bash
STORAGEBOX_CLOUD_NAME=acme
STORAGEBOX_API_KEY=482917365028174
STORAGEBOX_API_SECRET=your_api_secret
# Only for a self-hosted StorageBox:
# STORAGEBOX_API_URL=http://localhost:4200
```

## Quick start

```ts
import { readFile } from "node:fs/promises";
import { StorageBox } from "@udenis123/storagebox";

const storagebox = new StorageBox(); // reads STORAGEBOX_* from the environment

const file = await storagebox.files.upload(
  { data: await readFile("contract.pdf"), filename: "contract.pdf" },
  { collection: "contracts/2026", tags: ["legal"] },
);

console.log(file.url); // permanent link (public files)
```

Or pass everything explicitly — each option overrides its environment variable:

```ts
const storagebox = new StorageBox({
  cloudName: "acme",
  apiKey: "482917365028174",
  apiSecret: process.env.MY_SECRET,
  baseUrl: "https://storagebox.urbinaryhub.rw", // default
});
```

CommonJS works too: `const { StorageBox } = require("@udenis123/storagebox");`

When `cloudName` is set, every request carries it and StorageBox rejects keys that belong to a different cloud (`E2010`).

## Files

| Method | Description |
| --- | --- |
| `files.upload(source, options?)` | Upload one file. `source` is a `File`/`Blob` or `{ data, filename, type? }`. |
| `files.uploadMany(sources, options?)` | Up to 20 files in one request. |
| `files.importUrl(url, options?)` | StorageBox downloads the file from a public URL. |
| `files.list(query?)` | Paginated, filter by `collection`, `kind`, `access`, `tag`, `search`, `sort`. |
| `files.get(publicId)` | One file. |
| `files.update(publicId, input)` | Rename, move (`collectionId`), change `access`, `tags` or `publicId`. |
| `files.delete(publicId)` | Delete a file and its cached variants. |
| `files.deleteMany(ids)` | Delete many files by `id`. |
| `files.signedUrl(publicId, { expiresIn?, transform?, download? })` | Expiring link — works for private files. |
| `files.download(publicId)` | The file's bytes as an `ArrayBuffer`, private files included. |
| `files.stream(publicId)` | The file as a `ReadableStream`, for big files. |
| `files.setAccess(publicIds, access)` | Make up to 1000 files `PUBLIC` or `PRIVATE` at once. |

Upload options: `collection` (path, created on demand), `collectionId`, `access` (`PUBLIC` | `PRIVATE`), `publicId`, `tags`.

A file's link is `/f/<cloud>/<publicId>.<ext>` and does not include its collection, so renaming or moving collections never breaks links you have already shared.

Photos (JPG, PNG, WebP, AVIF) are optimised on upload and text files (TXT, CSV, JSON, Markdown, SVG) are stored compressed; links always return the full file. `sizeBytes` is the stored size and `originalSizeBytes` the uploaded size when compression saved space.

## Import a big folder

The package ships a command that uploads a whole folder — thousands or millions of files. Sub-folders become collections, files upload in parallel, and running the same command again after a stop continues where it left off without uploading anything twice.

```bash
export STORAGEBOX_API_KEY=482917365028174 STORAGEBOX_API_SECRET=your_api_secret STORAGEBOX_CLOUD_NAME=acme
npx @udenis123/storagebox upload ./archive --collection archive --access private --concurrency 16
```

| Option | Description |
| --- | --- |
| `--collection <path>` | Collection for the folder (default: the folder's name). |
| `--access public\|private` | Default: the collection's access. |
| `--concurrency <n>` | Parallel uploads, 1–64 (default 8). |
| `--state <file>` | Progress file (default: `.storagebox-upload-<hash>.json` in the current directory). |
| `--dry-run` | Count files and bytes without uploading. |

Failed files are listed in `<state file>.errors.log`. Every file is one API request; on a self-hosted server raise `RATE_LIMIT_PER_MINUTE` for big imports — the importer waits and retries when it hits the limit.

## Collections and usage

```ts
const collections = await storagebox.collections.list();
await storagebox.collections.create({ name: "invoices", access: "PRIVATE" });
await storagebox.collections.create({ name: "2026", parent: "invoices" }); // invoices/2026

// Refer to a collection by its path or its id
await storagebox.collections.rename("invoices", "billing"); // billing/2026 moves with it
await storagebox.collections.update("billing", { access: "PUBLIC" });
await storagebox.collections.update("billing", { access: "PRIVATE", applyToFiles: true }); // every file inside too

// Public gallery link for a collection and its sub-collections (private files stay hidden)
const { collection } = await storagebox.collections.share("events/2026", { allowDownload: true });
console.log(collection.shareUrl);
await storagebox.collections.unshare("events/2026");
await storagebox.collections.delete("billing/2026", { force: true }); // also deletes its files

const usage = await storagebox.usage(); // storage, quota, daily uploads/deliveries
```

## Image transformations

```ts
storagebox.url(file, { width: 400, height: 400, crop: "fill", format: "webp" });
// → https://storagebox.urbinaryhub.rw/f/acme/w_400,h_400,c_fill,f_webp/photo_ab12cd.jpg

await storagebox.files.signedUrl(privateFile.publicId, { transform: "w_800,f_avif", expiresIn: 600 });
```

Options: `width`, `height`, `crop` (`fill` | `fit` | `limit`), `quality` (1–100), `format` (`webp` | `avif` | `jpg` | `png`).

## Webhooks

```ts
import express from "express";
import { verifyWebhook } from "@udenis123/storagebox";

app.post("/hooks/storagebox", express.text({ type: "*/*" }), async (req, res) => {
  const payload = await verifyWebhook(req.body, req.header("x-storagebox-signature"), process.env.STORAGEBOX_WEBHOOK_SECRET!);
  if (!payload) return res.sendStatus(401);
  console.log(payload.event, payload.data.publicId); // "file.uploaded" | "file.deleted"
  res.sendStatus(204);
});
```

Always verify against the **raw** body.

## Errors

Failed calls throw `StorageBoxError` with `status`, `code` (e.g. `E4003` quota exceeded) and `retryAfterSeconds` for rate limits.

```ts
try {
  await storagebox.files.get("missing");
} catch (error) {
  if (error instanceof StorageBoxError && error.status === 404) { /* … */ }
}
```

## Development

```bash
npm install
npm test   # unit tests (ESM + CommonJS)

# + live test against a running API
LIVE_STORAGEBOX_API_URL=http://localhost:4200 LIVE_STORAGEBOX_CLOUD_NAME=acme \
LIVE_STORAGEBOX_API_KEY=482917365028174 LIVE_STORAGEBOX_API_SECRET=… npm test
```

## Publishing

```bash
npm login
npm publish --access public --auth-type=web
```
