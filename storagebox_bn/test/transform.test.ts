import sharp from 'sharp';
import { applyTransform, parseTransform, TransformParseError } from '@/lib/transform';

describe('parseTransform', () => {
  it('parses and canonicalises a transform segment', () => {
    const parsed = parseTransform('w_400,h_300,c_fill,q_80,f_webp');
    expect(parsed.options).toEqual({ width: 400, height: 300, crop: 'fill', quality: 80, format: 'webp' });
    expect(parsed.canonical).toBe('c_fill,f_webp,h_300,q_80,w_400');
  });

  it('gives the same canonical form regardless of order', () => {
    expect(parseTransform('f_jpeg,w_10').canonical).toBe(parseTransform('w_10,f_jpg').canonical);
  });

  it.each(['w_0', 'w_abc', 'q_101', 'c_stretch', 'f_bmp', 'x_1', ''])('rejects "%s"', (segment) => {
    expect(() => parseTransform(segment)).toThrow(TransformParseError);
  });
});

describe('applyTransform', () => {
  it('resizes and converts an image', async () => {
    const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#3366ff' } }).png().toBuffer();
    const { options } = parseTransform('w_200,h_200,c_fill,f_webp');
    const result = await applyTransform(input, options, 'png');
    const metadata = await sharp(result.buffer).metadata();
    expect(result.mime).toBe('image/webp');
    expect(metadata).toMatchObject({ width: 200, height: 200, format: 'webp' });
  });

  it('keeps aspect ratio with c_fit and never enlarges with c_limit', async () => {
    const input = await sharp({ create: { width: 400, height: 200, channels: 3, background: '#000' } }).jpeg().toBuffer();
    const fit = await applyTransform(input, parseTransform('w_100,h_100,c_fit').options, 'jpg');
    expect(await sharp(fit.buffer).metadata()).toMatchObject({ width: 100, height: 50, format: 'jpeg' });

    const limit = await applyTransform(input, parseTransform('w_1000,c_limit').options, 'jpg');
    expect((await sharp(limit.buffer).metadata()).width).toBe(400);
  });
});
