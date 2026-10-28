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
| `sdk/` | `storagebox` npm package | TypeScript, no dependencies |
| `docs/specs/` | Design document | |

## Run it locally

You need Docker and Node 20 or newer.

```bash
# 1. Infrastructure: Postgres :5435, Valkey :6381, RustFS :9200
docker compose up -d

# 2. API on http://localhost:4200 (Swagger at /docs)
cd storagebox_bn
cp example.env .env          # set JWT_SECRET, SIGNING_SECRET and ADMIN_EMAIL / ADMIN_PASSWORD
npm install
npx prisma migrate deploy
npm run dev

# 3. Dashboard on http://localhost:3200
cd ../storagebox_fn
cp example.env .env.local
npm install
npm run dev
```

Open http://localhost:3200 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The API creates (or promotes) that admin on every start.

Everyone else uses **Request an account**. New accounts stay pending until an admin approves them on the **Admin** page and chooses how much storage they get. Pending and rejected accounts cannot sign in or use API keys.

## How it works

- **Accounts and cloud names.** Every account gets a unique cloud name, which appears in its links: `/f/{cloud}/{publicId}.{ext}`.
- **Collections** are nested folders such as `invoices/2026`. Uploading to a path that doesn't exist yet creates it.
- **Access.** `PUBLIC` files have permanent links that are cached for a day. `PRIVATE` files can only be opened with a signed link that expires after 1 minute to 7 days. Signing uses HMAC-SHA256 with `SIGNING_SECRET`.
- **Transformations.** Add a segment such as `w_400,h_300,c_fill,f_webp` to the URL of any image. Each variant is generated once with sharp and then cached in RustFS.
- **Previews.** The dashboard previews images, PDFs, Word (.docx) files, video, audio and text.
- **Developer API (`/v1`).** Like Cloudinary, each account has a cloud name, a 15-digit API key and an API secret. Authenticate with HTTP Basic auth (key:secret); the optional `x-cloud-name` header must match the key's account. Keys can be `READ` or `READ_WRITE` and are rate limited per minute.
- **Webhooks** fire on `file.uploaded` and `file.deleted`. Each one is signed in the `x-storagebox-signature` header.
- **Usage and activity.** Usage tracks storage, uploads, deliveries and transforms per day. The activity log records who did what.
- **Admin.** Admins approve or reject access requests, set each account's storage quota and can suspend accounts. Rejecting an account also revokes its sessions and API keys.

## Developer quick start

```bash
curl -u "$STORAGEBOX_API_KEY:$STORAGEBOX_API_SECRET" \
  -F "file=@invoice.pdf" -F "collection=invoices/2026" \
  http://localhost:4200/v1/files
```

```ts
// npm install storagebox
// .env: STORAGEBOX_CLOUD_NAME, STORAGEBOX_API_KEY, STORAGEBOX_API_SECRET (+ STORAGEBOX_API_URL when self-hosted)
import { StorageBox } from "storagebox";

const storagebox = new StorageBox();
const file = await storagebox.files.upload(myFile, { collection: "invoices/2026" });
const { url } = await storagebox.files.signedUrl(file.publicId, { expiresIn: 3600 });
```

There are more examples in the public developer guide at http://localhost:3200/documentation (also inside the dashboard as **API Docs**), in `sdk/README.md` and in Swagger at http://localhost:4200/docs.

## Tests

```bash
cd storagebox_bn && npm test            # unit tests (signing, transforms, file types)
cd storagebox_bn && ./scripts/smoke.sh  # end-to-end against the running API and RustFS
cd sdk && npm test                      # SDK unit tests (+ live test when LIVE_STORAGEBOX_* are set)
```

## Production (GHCR + docker compose)

CI on `main` builds and pushes:

| Image | Registry |
| --- | --- |
| API | `ghcr.io/udenis123/storagebox-api:latest` |
| Dashboard | `ghcr.io/udenis123/storagebox-web:latest` |

### API + Postgres + Valkey + RustFS (on the server)

```bash
cd storagebox_bn
cp .env.production.example .env.production   # fill secrets, PUBLIC_URL, APP_URL, CORS_ORIGINS
docker login ghcr.io -u Udenis123 -p "$GH_PAT"   # once if the packages are private
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

The API container runs `prisma migrate deploy` on start, then listens on `${API_HOST_PORT:-4200}`.

### Dashboard (on the server)

```bash
cd storagebox_fn
# optional: IMAGE_TAG=latest WEB_HOST_PORT=3200
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Put nginx/Caddy in front for TLS. Point `storagebox.urbinaryhub.rw` at the dashboard; proxy `/v1`, `/api`, `/f`, `/public`, `/docs` and `/health` to the API (or use a separate API host and set `VITE_STORAGEBOX_API_URL` / `PUBLIC_URL` accordingly).

## Production notes

- Set `NODE_ENV=production`. This turns on SSRF protection for URL imports, which blocks private and internal addresses.
- Set `PUBLIC_URL` to the public origin of the API, and add the dashboard origin to `CORS_ORIGINS`.
- Use strong, stable values for `JWT_SECRET` and `SIGNING_SECRET`. Rotating `SIGNING_SECRET` invalidates every signed link.
- Put a CDN in front of `/f/*`. Public responses send `Cache-Control` and `ETag` headers and support Range requests.
- Change the RustFS credentials in `.env.production` (and local `docker-compose.yml` for development).
- Raise nginx `client_max_body_size` on the API reverse proxy to match `MAX_UPLOAD_MB`.
