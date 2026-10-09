# StorageBox — design

A Cloudinary-style file platform for developers and end users: upload documents
(PDF, Word, Excel, PowerPoint, text, zip), images and video into **collections**,
then get **public** or **signed expiring** links, either from a dashboard or a REST
API authenticated with **API keys**. Bytes live in **RustFS** (S3-compatible).

## Layout

```
storagebox/
  docker-compose.yml   Postgres 17 (5435), Valkey 8 (6381), RustFS (9200)
  storagebox_bn/       Express + TS + Prisma (PostgreSQL) API — port 4200
  storagebox_fn/       Vite + React + shadcn + TanStack Query dashboard — port 3200
  sdk/                 @storagebox/sdk — typed TS client for the /v1 API
  docs/specs/          this file
```

## Concepts

| Concept | Meaning |
|---|---|
| Account | Owner workspace. Unique `cloudName` (slug) used in every URL. Has `quotaBytes`. |
| User | Person who signs in (JWT access + refresh session). Role `USER` or `ADMIN`. One account per user in v1. |
| Collection | Folder, nestable (`parentId`), unique `path` per account, default access. |
| File | Stored asset: `publicId`, `originalName`, `mime`, `ext`, `sizeBytes`, `checksum` (sha256), `access` (`PUBLIC`/`PRIVATE`), `storageKey`, image `width/height`, `tags`. |
| ApiKey | `keyId` (public, `sbk_…`) + secret (`sbs_…`, shown once, stored sha256). Scope `READ` or `READ_WRITE`. Revocable, `lastUsedAt`. |
| Derivative | Cached image transform output (`fileId` + `transform` string → `storageKey`). |
| UsageEvent | `UPLOAD`, `DELETE`, `DELIVERY`, `TRANSFORM` with bytes + optional `apiKeyId`; powers usage charts. |
| Webhook | URL + secret; receives `file.uploaded` / `file.deleted` POSTs signed with HMAC-SHA256 (`x-storagebox-signature`). |
| ActivityLog | Human-readable audit trail per account. |

## Storage

Single bucket `storagebox`. Object key: `{accountId}/{fileId}{.ext}`; derivatives
under `{accountId}/derived/{fileId}/{transformHash}{.ext}`. Keys use IDs (not names)
so renames/moves never copy bytes.

## Delivery URLs

- Public: `GET /f/{cloudName}/{publicId}.{ext}` — permanent, `Cache-Control: public, max-age=31536000, immutable`.
- Private: same path + `?expires={unix}&sig={hmac}`. `sig = HMAC-SHA256(SIGNING_SECRET, "{cloudName}/{transform}/{publicId}:{expires}")`, base64url. Expired/invalid → 403.
- Transforms (images only): `/f/{cloudName}/{transform}/{publicId}.{ext}`, transform =
  comma list of `w_<px>`, `h_<px>`, `c_<fill|fit|limit>`, `q_<1-100>`, `f_<webp|jpg|png|avif>`.
  Generated with `sharp`, cached as a Derivative.
- `?dl=1` forces `Content-Disposition: attachment`.

## API surfaces

- **Dashboard API** `/api/*` — JWT Bearer. auth, account, collections, files, keys, usage, webhooks, activity, admin.
- **Developer API** `/v1/*` — API key (Basic `keyId:secret` or `x-api-key`/`x-api-secret`).
  Rate-limited per key in Valkey (fixed window, `RATE_LIMIT_PER_MINUTE`).
  - `POST /v1/files` (multipart `file`, or JSON `url`) with `collection`, `access`, `publicId`, `tags`
  - `GET /v1/files`, `GET /v1/files/:publicId`, `PATCH`, `DELETE`
  - `POST /v1/files/:publicId/signed-url` `{ expiresIn }`
  - `GET/POST /v1/collections`, `DELETE /v1/collections/:id`
  - `GET /v1/usage`
- **Delivery** `/f/*` — public, no auth.
- Swagger UI at `/docs`.

Both `/api` and `/v1` share the same services; only the auth middleware differs
(both resolve to `req.account`).

## Limits & validation

- Max upload 100 MB per file (env), 20 files per request.
- Allowed extensions: pdf doc docx xls xlsx ppt pptx txt csv md rtf odt zip jpg jpeg png gif webp avif svg mp4 mov webm mp3.
- Quota enforced before writing to storage.
- Joi on every body/query.

## Dashboard (storagebox_fn)

Pages: Login, Register, Overview (usage cards + charts), Media Library
(collection tree, grid/list, drag & drop upload, preview drawer with copy-link /
signed-link / access toggle / delete), API Keys, Webhooks, Activity, Docs
(curl/JS/Python snippets with the user's cloud name), Settings, Admin (users,
quota, suspend). Previews: images and PDFs native, Word via `docx-preview`,
others show a file-type card.

## Testing

Jest unit tests for: delivery signing, transform parsing, API-key hashing,
upload policy (type/quota). Manual e2e script against local RustFS.
