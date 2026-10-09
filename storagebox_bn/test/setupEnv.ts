process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5435/test';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.SIGNING_SECRET = 'test-signing-secret';
process.env.S3_ACCESS_KEY ??= 'test';
process.env.S3_SECRET_KEY ??= 'test';
process.env.PUBLIC_URL = 'https://cdn.example.com';
