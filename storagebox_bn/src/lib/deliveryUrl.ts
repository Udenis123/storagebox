import { config } from '@/config/config';
import { hmacBase64Url, safeEqual } from '@/utils/crypto';

export interface DeliveryTarget {
  cloudName: string;
  publicId: string;
  ext: string;
  transform?: string;
}

export interface SignedUrlOptions {
  expiresInSeconds: number;
  download?: boolean;
  now?: number;
}

export type SignatureCheck = 'valid' | 'expired' | 'invalid';

const signaturePayload = (target: DeliveryTarget, expires: number): string =>
  `${target.cloudName}/${target.transform ?? ''}/${target.publicId}:${expires}`;

export const signDelivery = (target: DeliveryTarget, expires: number): string =>
  hmacBase64Url(config.signingSecret, signaturePayload(target, expires));

export function deliveryPath(target: DeliveryTarget): string {
  const transform = target.transform ? `${target.transform}/` : '';
  return `/f/${target.cloudName}/${transform}${target.publicId}.${target.ext}`;
}

export const publicUrl = (target: DeliveryTarget): string => `${config.publicUrl}${deliveryPath(target)}`;

export function signedUrl(target: DeliveryTarget, options: SignedUrlOptions): { url: string; expiresAt: Date } {
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const expires = nowSeconds + options.expiresInSeconds;
  const query = new URLSearchParams({ expires: String(expires), sig: signDelivery(target, expires) });
  if (options.download) query.set('dl', '1');
  return { url: `${publicUrl(target)}?${query.toString()}`, expiresAt: new Date(expires * 1000) };
}

export function verifyDeliverySignature(
  target: DeliveryTarget,
  expiresRaw: unknown,
  sigRaw: unknown,
  now: number = Date.now(),
): SignatureCheck {
  if (typeof expiresRaw !== 'string' || typeof sigRaw !== 'string' || !/^\d+$/.test(expiresRaw)) return 'invalid';
  const expires = Number(expiresRaw);
  if (!safeEqual(signDelivery(target, expires), sigRaw)) return 'invalid';
  return expires * 1000 < now ? 'expired' : 'valid';
}
