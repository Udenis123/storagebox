# StorageBox

A self-hosted file platform for developers and their users, in the spirit of Cloudinary. You can:

- store PDFs, Word documents, images, videos and other files in collections;
- get a permanent public link or an expiring signed link for each file;
- resize and convert images on the fly;
- manage everything from a dashboard or from your code with API keys.

Files are stored in [RustFS](https://rustfs.com), an S3-compatible object store.

| Folder | What it is | Stack |
| --- | --- | --- |
| `storagebox_bn/` | REST API, delivery and signed links | Express, TypeScript, Prisma, PostgreSQL, Valkey, sharp |
| `storagebox_fn/` | Dashboard | Vite, React 19, Tailwind, shadcn/ui, TanStack Query |
| `sdk/` | `@storagebox/sdk` client | TypeScript, no dependencies |
| `docs/specs/` | Design document | |

## Run it locally

You need Docker and Node 20 or newer.

```bash
# 1. Infrastructure: Postgres :5435, Valkey :6381, RustFS :9200
docker compose up -d

# 2. API on http://localhost:4200 (Swagger at /docs)
cd storagebox_bn
cp example.env .env          # then set JWT_SECRET and SIGNING_SECRET to long random strings
npm install
npx prisma migrate deploy
npm run dev

# 3. Dashboard on http://localhost:3200
cd ../storagebox_fn
cp example.env .env.local
npm install
npm run dev
```

Open http://localhost:3200 and create an account. **The first account registered becomes the platform admin.**

## How it works

- **Accounts and cloud names.** Every account gets a unique cloud name, which appears in its links: `/f/{cloud}/{publicId}.{ext}`.
- **Collections** are nested folders such as `invoices/2026`. Uploading to a path that doesn't exist yet creates it.
- **Access.** `PUBLIC` files have permanent links that are cached for a day. `PRIVATE` files can only be opened with a signed link that expires after 1 minute to 7 days. Signing uses HMAC-SHA256 with `SIGNING_SECRET`.
- **Transformations.** Add a segment such as `w_400,h_300,c_fill,f_webp` to the URL of any image. Each variant is generated once with sharp and then cached in RustFS.
- **Previews.** The dashboard previews images, PDFs, Word (.docx) files, video, audio and text.
- **Developer API (`/v1`).** Authenticate with HTTP Basic auth using the API key and secret. Keys can be `READ` or `READ_WRITE` and are rate limited per minute.
- **Webhooks** fire on `file.uploaded` and `file.deleted`. Each one is signed in the `x-storagebox-signature` header.
- **Usage and activity.** Usage tracks storage, uploads, deliveries and transforms per day. The activity log records who did what.
- **Admin.** Admins see all accounts and can change storage quotas or suspend an account.

## Developer quick start

```bash
curl -u "$STORAGEBOX_KEY:$STORAGEBOX_SECRET" \
  -F "file=@invoice.pdf" -F "collection=invoices/2026" \
  http://localhost:4200/v1/files
```

```ts
import { StorageBox } from "@storagebox/sdk";

const storagebox = new StorageBox({ baseUrl: "http://localhost:4200", apiKey: "sbk_…", apiSecret: "sbs_…" });
const file = await storagebox.files.upload(myFile, { collection: "invoices/2026" });
const { url } = await storagebox.files.signedUrl(file.publicId, { expiresIn: 3600 });
```

There are more examples in the dashboard (**API Docs**), in `sdk/README.md` and in Swagger at http://localhost:4200/docs.

## Tests

```bash
cd storagebox_bn && npm test            # unit tests (signing, transforms, file types)
cd storagebox_bn && ./scripts/smoke.sh  # end-to-end against the running API and RustFS
cd sdk && npm test                      # SDK unit tests (+ live test when STORAGEBOX_KEY/SECRET are set)
```

## Production notes

- Set `NODE_ENV=production`. This turns on SSRF protection for URL imports, which blocks private and internal addresses.
- Set `PUBLIC_URL` to the public origin of the API, and add the dashboard origin to `CORS_ORIGINS`.
- Use strong, stable values for `JWT_SECRET` and `SIGNING_SECRET`. Rotating `SIGNING_SECRET` invalidates every signed link.
- Put a CDN in front of `/f/*`. Public responses send `Cache-Control` and `ETag` headers and support Range requests.
- Change the RustFS credentials in `docker-compose.yml` and `.env`.
