import Joi from 'joi';
import { commonSchemas, optionalOrEmpty } from './patterns';

const MAX_SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;

export const registerSchema = Joi.object({
  name: commonSchemas.name.required(),
  email: commonSchemas.email.required(),
  password: commonSchemas.password.required(),
  accountName: optionalOrEmpty(commonSchemas.name),
});

export const loginSchema = Joi.object({
  email: commonSchemas.email.required(),
  password: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: commonSchemas.password.required(),
});

export const updateProfileSchema = Joi.object({
  name: commonSchemas.name,
  accountName: commonSchemas.name,
}).min(1);

export const createCollectionSchema = Joi.object({
  name: commonSchemas.name.required(),
  parentId: optionalOrEmpty(commonSchemas.id),
  access: commonSchemas.access,
});

export const updateCollectionSchema = Joi.object({
  name: commonSchemas.name,
  access: commonSchemas.access,
}).min(1);

export const deleteCollectionQuerySchema = Joi.object({
  force: Joi.boolean().default(false),
});

export const uploadSchema = Joi.object({
  collectionId: optionalOrEmpty(commonSchemas.id),
  collection: optionalOrEmpty(commonSchemas.collectionPath),
  access: optionalOrEmpty(commonSchemas.access),
  publicId: optionalOrEmpty(commonSchemas.publicId),
  tags: optionalOrEmpty(commonSchemas.tags),
  url: optionalOrEmpty(Joi.string().uri({ scheme: ['http', 'https'] })),
}).rename('public_id', 'publicId', { ignoreUndefined: true });

export const listFilesQuerySchema = Joi.object({
  collectionId: optionalOrEmpty(commonSchemas.id),
  collection: optionalOrEmpty(commonSchemas.collectionPath),
  search: optionalOrEmpty(Joi.string().trim().max(120)),
  kind: optionalOrEmpty(Joi.string().valid('image', 'document', 'video', 'audio', 'archive', 'other')),
  access: optionalOrEmpty(commonSchemas.access),
  tag: optionalOrEmpty(Joi.string().trim().max(40)),
  sort: Joi.string().valid('newest', 'oldest', 'name', 'largest', 'smallest').default('newest'),
  page: commonSchemas.page,
  pageSize: commonSchemas.pageSize,
});

export const updateFileSchema = Joi.object({
  originalName: Joi.string().trim().min(1).max(255),
  publicId: commonSchemas.publicId,
  collectionId: commonSchemas.id.allow(null),
  access: commonSchemas.access,
  tags: commonSchemas.tags,
}).min(1);

export const bulkDeleteSchema = Joi.object({
  ids: Joi.array().items(commonSchemas.id).min(1).max(200).required(),
});

export const signedLinkSchema = Joi.object({
  expiresIn: Joi.number().integer().min(60).max(MAX_SIGNED_URL_SECONDS).default(3600),
  transform: optionalOrEmpty(Joi.string().trim().max(100)),
  download: Joi.boolean().default(false),
});

export const createApiKeySchema = Joi.object({
  name: commonSchemas.name.required(),
  scope: Joi.string().valid('READ', 'READ_WRITE').default('READ_WRITE'),
});

export const createWebhookSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  events: commonSchemas.webhookEvents.required(),
});

export const updateWebhookSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }),
  events: commonSchemas.webhookEvents,
  isActive: Joi.boolean(),
}).min(1);

export const paginationQuerySchema = Joi.object({
  page: commonSchemas.page,
  pageSize: commonSchemas.pageSize,
});

export const updateAccountSchema = Joi.object({
  quotaGb: Joi.number().min(0.1).max(100_000),
  isSuspended: Joi.boolean(),
}).min(1);
