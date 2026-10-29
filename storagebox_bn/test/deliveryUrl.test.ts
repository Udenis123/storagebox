import { deliveryPath, publicUrl, signedUrl, verifyDeliverySignature } from '@/lib/deliveryUrl';

const target = { cloudName: 'acme-ab12', publicId: 'invoice_x1', ext: 'pdf' };
const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);

const queryOf = (url: string) => new URL(url).searchParams;

describe('delivery URLs', () => {
  it('builds public paths with and without a transform', () => {
    expect(deliveryPath(target)).toBe('/f/acme-ab12/invoice_x1.pdf');
    expect(deliveryPath({ ...target, ext: 'jpg', transform: 'w_200' })).toBe('/f/acme-ab12/w_200/invoice_x1.jpg');
    expect(publicUrl(target)).toBe('https://cdn.example.com/f/acme-ab12/invoice_x1.pdf');
  });

  it('accepts a freshly signed link', () => {
    const { url, expiresAt } = signedUrl(target, { expiresInSeconds: 600, now: NOW });
    const query = queryOf(url);
    expect(expiresAt.getTime()).toBe(NOW + 600_000);
    expect(verifyDeliverySignature(target, query.get('expires'), query.get('sig'), NOW)).toBe('valid');
  });

  it('reports expired links', () => {
    const query = queryOf(signedUrl(target, { expiresInSeconds: 60, now: NOW }).url);
    expect(verifyDeliverySignature(target, query.get('expires'), query.get('sig'), NOW + 61_000)).toBe('expired');
  });

  it('rejects tampered expiry, other files and other transforms', () => {
    const query = queryOf(signedUrl(target, { expiresInSeconds: 60, now: NOW }).url);
    const sig = query.get('sig');
    const expires = query.get('expires') as string;
    expect(verifyDeliverySignature(target, String(Number(expires) + 3600), sig, NOW)).toBe('invalid');
    expect(verifyDeliverySignature({ ...target, publicId: 'other' }, expires, sig, NOW)).toBe('invalid');
    expect(verifyDeliverySignature({ ...target, transform: 'w_10' }, expires, sig, NOW)).toBe('invalid');
  });

  it('treats a missing signature as missing, not invalid', () => {
    expect(verifyDeliverySignature(target, undefined, undefined, NOW)).toBe('missing');
  });

  it('rejects malformed parameters', () => {
    expect(verifyDeliverySignature(target, 'abc', 'sig', NOW)).toBe('invalid');
  });

  it('adds the download flag when asked', () => {
    expect(queryOf(signedUrl(target, { expiresInSeconds: 60, download: true }).url).get('dl')).toBe('1');
  });
});
