import { readFile, writeFile } from 'fs/promises';
import { gunzipSync } from 'zlib';
import sharp from 'sharp';
import { GZIP_ENCODING, prepareForStorage } from '@/lib/optimizeUpload';
import { removeTempFiles, tempUploadPath } from '@/lib/tempFiles';

async function writeTemp(content: Buffer | string): Promise<{ path: string; size: number }> {
  const path = tempUploadPath();
  await writeFile(path, content);
  return { path, size: Buffer.byteLength(content) };
}

describe('prepareForStorage', () => {
  const created: string[] = [];
  afterAll(() => removeTempFiles(created));

  it('gzips text losslessly', async () => {
    const text = 'id,name\n'.concat('1,StorageBox\n'.repeat(2000));
    const source = await writeTemp(text);
    created.push(source.path);

    const prepared = await prepareForStorage(source.path, source.size, 'csv');
    created.push(prepared.path);

    expect(prepared.contentEncoding).toBe(GZIP_ENCODING);
    expect(prepared.size).toBeLessThan(source.size);
    expect(gunzipSync(await readFile(prepared.path)).toString()).toBe(text);
  });

  it('caps photo dimensions and keeps the format', async () => {
    const photo = await sharp({ create: { width: 5000, height: 2500, channels: 3, background: '#3366cc' } }).jpeg({ quality: 100 }).toBuffer();
    const source = await writeTemp(photo);
    created.push(source.path);

    const prepared = await prepareForStorage(source.path, source.size, 'jpg');
    created.push(prepared.path);

    const meta = await sharp(prepared.path).metadata();
    expect(prepared.contentEncoding).toBeUndefined();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(4096);
  });

  it('stores other formats and unreadable images unchanged', async () => {
    const pdf = await writeTemp('%PDF-1.7 not really');
    const brokenImage = await writeTemp('not an image');
    created.push(pdf.path, brokenImage.path);

    expect((await prepareForStorage(pdf.path, pdf.size, 'pdf')).path).toBe(pdf.path);
    expect((await prepareForStorage(brokenImage.path, brokenImage.size, 'png')).path).toBe(brokenImage.path);
  });

  it('keeps the original when compression would not make it smaller', async () => {
    const tiny = await writeTemp('a');
    created.push(tiny.path);

    const prepared = await prepareForStorage(tiny.path, tiny.size, 'txt');
    expect(prepared.path).toBe(tiny.path);
    expect(prepared.contentEncoding).toBeUndefined();
  });
});
