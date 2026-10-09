import Joi from 'joi';
import { WEBHOOK_EVENTS } from '@/types/api';

const MAX_TAGS = 20;
const TAG_PATTERN = /^[\w-]{1,40}$/;

export const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/;

/** Accepts `["a","b"]` (JSON) or `"a,b"` (multipart form field) and yields a clean string array. */
const tagsSchema = Joi.custom((value: unknown, helpers) => {
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const tags = [...new Set(raw.map((tag) => String(tag).trim()).filter(Boolean))];
  if (tags.length > MAX_TAGS || tags.some((tag) => !TAG_PATTERN.test(tag))) {
    return helpers.message({ custom: `tags must be up to ${MAX_TAGS} words of letters, digits, - or _` });
  }
  return tags;
});

export const commonSchemas = {
  id: Joi.string().trim().max(40),
  name: Joi.string().trim().min(1).max(120),
  email: Joi.string().trim().lowercase().email(),
  password: Joi.string().min(8).max(128),
  access: Joi.string().valid('PUBLIC', 'PRIVATE'),
  publicId: Joi.string().trim().pattern(PUBLIC_ID_PATTERN).messages({
    'string.pattern.base': 'publicId may only contain letters, digits, - and _ (max 120)',
  }),
  collectionPath: Joi.string().trim().max(300).pattern(/^[\w\- /]+$/).messages({
    'string.pattern.base': 'collection may only contain letters, digits, spaces, -, _ and /',
  }),
  tags: tagsSchema,
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(30),
  webhookEvents: Joi.array().items(Joi.string().valid(...WEBHOOK_EVENTS)).min(1).unique(),
};

export const optionalOrEmpty = (schema: Joi.Schema): Joi.Schema => schema.empty('').optional();
