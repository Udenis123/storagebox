import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const sha256Hex = (input: string | Buffer): string => createHash('sha256').update(input).digest('hex');

export const hmacBase64Url = (secret: string, payload: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

export const hmacHex = (secret: string, payload: string): string =>
  createHmac('sha256', secret).update(payload).digest('hex');

export const randomToken = (bytes: number): string => randomBytes(bytes).toString('base64url');

export const randomSuffix = (length: number): string =>
  randomBytes(length)
    .toString('base64url')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .slice(0, length)
    .padEnd(length, '0');

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
