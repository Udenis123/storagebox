import { config } from '@/config/config';

const envelope = (data: object) => ({
  type: 'object',
  properties: {
    status: { type: 'string', example: 'success' },
    message: { type: 'string' },
    data,
  },
});

const fileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    publicId: { type: 'string', example: 'invoice-2026_ab12cd' },
    originalName: { type: 'string', example: 'Invoice 2026.pdf' },
    mime: { type: 'string', example: 'application/pdf' },
    ext: { type: 'string', example: 'pdf' },
    kind: { type: 'string', enum: ['image', 'document', 'video', 'audio', 'archive', 'other'] },
    sizeBytes: { type: 'integer', description: 'Bytes stored, after automatic compression' },
    originalSizeBytes: { type: 'integer', description: 'Bytes as uploaded; present only when compression saved space' },
    checksum: { type: 'string', description: 'sha256 of the uploaded content' },
    access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
    width: { type: 'integer' },
    height: { type: 'integer' },
    tags: { type: 'array', items: { type: 'string' } },
    collectionPath: { type: 'string', example: 'invoices/2026' },
    url: { type: 'string', description: 'Permanent link (public files only)' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const collectionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    path: { type: 'string', example: 'invoices/2026' },
    parentId: { type: 'string' },
    access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
    fileCount: { type: 'integer' },
  },
};

const accessSchema = { type: 'string', enum: ['PUBLIC', 'PRIVATE'] };
const publicIdParam = { name: 'publicId', in: 'path', required: true, schema: { type: 'string' } };
const ok = (data: object, description = 'OK') => ({
  description,
  content: { 'application/json': { schema: envelope(data) } },
});

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'StorageBox API',
    version: '1.0.0',
    description: [
      'Store documents, images and any file, then deliver them with permanent public links or signed expiring links.',
      '',
      '**Authentication:** create an API key in the dashboard, then send `Authorization: Basic base64(api_key:api_secret)`',
      '(or the `x-api-key` and `x-api-secret` headers). Optionally send `x-cloud-name` to make sure the key belongs to that cloud.',
      '',
      '**Delivery URLs:** `GET /f/{cloudName}/{publicId}.{ext}` — add an image transform segment such as',
      '`/f/{cloudName}/w_400,h_300,c_fill,q_80,f_webp/{publicId}.jpg`. Private files need `?expires=&sig=` from the signed-url endpoint.',
    ].join('\n'),
  },
  servers: [{ url: config.publicUrl }],
  components: {
    securitySchemes: { apiKey: { type: 'http', scheme: 'basic', description: 'api_key as username, api_secret as password' } },
  },
  security: [{ apiKey: [] }],
  paths: {
    '/v1/files': {
      get: {
        tags: ['Files'],
        summary: 'List files',
        parameters: [
          { name: 'collection', in: 'query', schema: { type: 'string' }, description: 'Collection path, e.g. invoices/2026' },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'kind', in: 'query', schema: { type: 'string', enum: ['image', 'document', 'video', 'audio', 'archive'] } },
          { name: 'access', in: 'query', schema: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] } },
          { name: 'tag', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'name', 'largest', 'smallest'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 30, maximum: 100 } },
        ],
        responses: {
          200: ok({
            type: 'object',
            properties: { items: { type: 'array', items: fileSchema }, total: { type: 'integer' }, page: { type: 'integer' } },
          }),
        },
      },
      post: {
        tags: ['Files'],
        summary: 'Upload one or more files (multipart) or import from a URL',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  collection: { type: 'string', description: 'Collection path; created if missing' },
                  access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
                  publicId: { type: 'string', description: 'Custom public id (single file only)' },
                  tags: { type: 'string', description: 'Comma separated' },
                },
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', description: 'Remote http(s) file to import' },
                  collection: { type: 'string' },
                  access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
                  publicId: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 201: ok({ type: 'array', items: fileSchema }, 'Uploaded') },
      },
    },
    '/v1/files/{publicId}': {
      parameters: [publicIdParam],
      get: { tags: ['Files'], summary: 'Get a file', responses: { 200: ok(fileSchema) } },
      patch: {
        tags: ['Files'],
        summary: 'Rename, move, retag or change access',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  originalName: { type: 'string' },
                  publicId: { type: 'string' },
                  collectionId: { type: 'string', nullable: true },
                  access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
                  tags: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 200: ok(fileSchema) },
      },
      delete: { tags: ['Files'], summary: 'Delete a file', responses: { 200: ok({ type: 'object' }) } },
    },
    '/v1/files/{publicId}/content': {
      parameters: [publicIdParam, { name: 'dl', in: 'query', schema: { type: 'string', enum: ['1'] }, description: 'Send as an attachment' }],
      get: {
        tags: ['Files'],
        summary: "Download the file's bytes with your API key (private files included)",
        responses: { 200: { description: 'The original file; supports Range requests' } },
      },
    },
    '/v1/files/bulk-access': {
      post: {
        tags: ['Files'],
        summary: 'Make many files public or private',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['publicIds', 'access'],
                properties: { publicIds: { type: 'array', items: { type: 'string' }, maxItems: 1000 }, access: accessSchema },
              },
            },
          },
        },
        responses: { 200: ok({ type: 'object', properties: { updated: { type: 'integer' } } }) },
      },
    },
    '/v1/files/{publicId}/signed-url': {
      parameters: [publicIdParam],
      post: {
        tags: ['Files'],
        summary: 'Create an expiring signed link (works for private files)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  expiresIn: { type: 'integer', default: 3600, minimum: 60, maximum: 604800, description: 'Seconds' },
                  transform: { type: 'string', example: 'w_400,f_webp' },
                  download: { type: 'boolean', description: 'Force download instead of inline display' },
                },
              },
            },
          },
        },
        responses: {
          200: ok({ type: 'object', properties: { url: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time' } } }),
        },
      },
    },
    '/v1/collections': {
      get: { tags: ['Collections'], summary: 'List collections', responses: { 200: ok({ type: 'array', items: collectionSchema }) } },
      post: {
        tags: ['Collections'],
        summary: 'Create a collection',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  parentId: { type: 'string' },
                  access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
                },
              },
            },
          },
        },
        responses: { 201: ok(collectionSchema) },
      },
    },
    '/v1/collections/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Collection id or URL-encoded path' }],
      patch: {
        tags: ['Collections'],
        summary: 'Rename or change default access',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  access: accessSchema,
                  applyToFiles: { type: 'boolean', description: 'Also set `access` on every file in the collection and its sub-collections' },
                },
              },
            },
          },
        },
        responses: { 200: ok(collectionSchema) },
      },
      delete: {
        tags: ['Collections'],
        summary: 'Delete a collection (force=true also deletes its files)',
        parameters: [{ name: 'force', in: 'query', schema: { type: 'boolean' } }],
        responses: { 200: ok({ type: 'object' }) },
      },
    },
    '/v1/usage': {
      get: { tags: ['Account'], summary: 'Storage, quota and 30-day usage', responses: { 200: ok({ type: 'object' }) } },
    },
  },
};
