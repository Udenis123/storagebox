# @storagebox/sdk

TypeScript client for the StorageBox API. Zero dependencies — works in Node 18+, Bun, Deno and edge runtimes.

> Use it on your **server**. The API secret must never be shipped to a browser.

## Install

```bash
npm install @storagebox/sdk
# or, from this repo:
npm install ../sdk
```

## Quick start

```ts
import { readFile } from "node:fs/promises";
import { StorageBox } from "@storagebox/sdk";

const storagebox = new StorageBox({
  baseUrl: process.env.STORAGEBOX_URL!, // e.g. http://localhost:4200
  apiKey: process.env.STORAGEBOX_KEY!, // sbk_…
  apiSecret: process.env.STORAGEBOX_SECRET!, // sbs_…
});

const file = await storagebox.files.upload(
  { data: await readFile("contract.pdf"), filename: "contract.pdf" },
  { collection: "contracts/2026", tags: ["legal"] },
);

console.log(file.url); // permanent link (public files)
```

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

Upload options: `collection` (path, created on demand), `collectionId`, `access` (`PUBLIC` | `PRIVATE`), `publicId`, `tags`.

## Collections and usage

```ts
const collections = await storagebox.collections.list();
const invoices = await storagebox.collections.create({ name: "invoices", access: "PRIVATE" });
await storagebox.collections.update(invoices.id, { name: "billing" });
await storagebox.collections.delete(invoices.id, { force: true }); // also deletes its files

const usage = await storagebox.usage(); // storage, quota, daily uploads/deliveries
```

## Image transformations

```ts
storagebox.url(file, { width: 400, height: 400, crop: "fill", format: "webp" });
// → http://localhost:4200/f/acme/w_400,h_400,c_fill,f_webp/photo_ab12cd.jpg

await storagebox.files.signedUrl(privateFile.publicId, { transform: "w_800,f_avif", expiresIn: 600 });
```

Options: `width`, `height`, `crop` (`fill` | `fit` | `limit`), `quality` (1–100), `format` (`webp` | `avif` | `jpg` | `png`).

## Webhooks

```ts
import express from "express";
import { verifyWebhook } from "@storagebox/sdk";

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
npm test                       # unit tests
STORAGEBOX_URL=http://localhost:4200 STORAGEBOX_KEY=sbk_… STORAGEBOX_SECRET=sbs_… npm test   # + live test
```
