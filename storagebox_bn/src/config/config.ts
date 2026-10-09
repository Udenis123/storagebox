import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
};

const optional = (name: string, fallback = ''): string => process.env[name] || fallback;

const list = (name: string, fallback: string): string[] =>
  optional(name, fallback)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const BYTES_PER_MB = 1024 * 1024;

export const config = {
  env: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '4200')),
  corsOrigins: list('CORS_ORIGINS', 'http://localhost:3200'),
  publicUrl: optional('PUBLIC_URL', 'http://localhost:4200').replace(/\/+$/, ''),
  databaseUrl: required('DATABASE_URL'),
  valkeyUrl: optional('VALKEY_URL', 'redis://localhost:6381'),
  jwt: {
    secret: required('JWT_SECRET'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshTokenDays: Number(optional('REFRESH_TOKEN_DAYS', '30')),
  },
  signingSecret: required('SIGNING_SECRET'),
  admin: {
    email: optional('ADMIN_EMAIL').trim().toLowerCase(),
    password: optional('ADMIN_PASSWORD'),
    name: optional('ADMIN_NAME', 'StorageBox Admin'),
  },
  s3: {
    endpoint: optional('S3_ENDPOINT', 'http://localhost:9200'),
    region: optional('S3_REGION', 'us-east-1'),
    bucket: optional('S3_BUCKET', 'storagebox'),
    accessKey: required('S3_ACCESS_KEY'),
    secretKey: required('S3_SECRET_KEY'),
  },
  limits: {
    maxUploadBytes: Number(optional('MAX_UPLOAD_MB', '5120')) * BYTES_PER_MB,
    /** Large uploads on slow connections outlast Node's default 5-minute request timeout. */
    uploadTimeoutMs: Number(optional('UPLOAD_TIMEOUT_MINUTES', '60')) * 60 * 1000,
    defaultQuotaBytes: Number(optional('DEFAULT_QUOTA_GB', '5')) * 1024 * BYTES_PER_MB,
    rateLimitPerMinute: Number(optional('RATE_LIMIT_PER_MINUTE', '300')),
  },
} as const;

export const isProduction = config.env === 'production';
