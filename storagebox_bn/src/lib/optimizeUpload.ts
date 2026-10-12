import { createReadStream, createWriteStream } from 'fs';
import { stat } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { constants as zlibConstants, createGzip } from 'zlib';
import sharp, { Sharp } from 'sharp';
import logger from '@/config/logger';
import { removeTempFiles, tempUploadPath } from './tempFiles';

export const GZIP_ENCODING = 'gzip';

/** Longest edge kept for photos; larger camera/scan images are scaled down to it. */
const MAX_IMAGE_EDGE_PX = 4096;

/** Visually lossless settings: camera metadata is dropped and pixels re-encoded in the same format. */
const IMAGE_ENCODERS: Partial<Record<string, (image: Sharp) => Sharp>> = {
  jpg: (image) => image.jpeg({ quality: 82, mozjpeg: true }),
  jpeg: (image) => image.jpeg({ quality: 82, mozjpeg: true }),
  png: (image) => image.png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 }),
  webp: (image) => image.webp({ quality: 82, effort: 5 }),
  avif: (image) => image.avif({ quality: 60, effort: 4 }),
};

/** Plain-text formats compress well and losslessly; they are gzipped at rest and decoded on delivery. */
const GZIP_EXTENSIONS = new Set(['txt', 'csv', 'json', 'md', 'svg']);

export interface PreparedUpload {
  /** File to store — the original, or a smaller temp copy that the caller removes via `cleanup`. */
  path: string;
  size: number;
  contentEncoding?: typeof GZIP_ENCODING;
  cleanup: () => Promise<void>;
}

const keepOriginal = (path: string, size: number): PreparedUpload => ({ path, size, cleanup: async () => undefined });

async function optimizeImage(inputPath: string, outputPath: string, ext: string, encode: (image: Sharp) => Sharp): Promise<void> {
  const image = sharp(inputPath, { animated: ext === 'webp', failOn: 'none' })
    .rotate()
    .resize({ width: MAX_IMAGE_EDGE_PX, height: MAX_IMAGE_EDGE_PX, fit: 'inside', withoutEnlargement: true });
  await encode(image).toFile(outputPath);
}

async function gzipFile(inputPath: string, outputPath: string): Promise<void> {
  await pipeline(createReadStream(inputPath), createGzip({ level: zlibConstants.Z_BEST_COMPRESSION }), createWriteStream(outputPath));
}

/**
 * Shrinks photos and text files before storage. Anything else, or any result that is not
 * smaller than the original, is stored exactly as uploaded.
 */
export async function prepareForStorage(path: string, size: number, ext: string): Promise<PreparedUpload> {
  const encodeImage = IMAGE_ENCODERS[ext];
  const isText = GZIP_EXTENSIONS.has(ext);
  if (!encodeImage && !isText) return keepOriginal(path, size);

  const outputPath = tempUploadPath();
  const cleanup = () => removeTempFiles([outputPath]);
  try {
    if (encodeImage) await optimizeImage(path, outputPath, ext, encodeImage);
    else await gzipFile(path, outputPath);
    const { size: outputSize } = await stat(outputPath);
    if (outputSize >= size) {
      await cleanup();
      return keepOriginal(path, size);
    }
    return { path: outputPath, size: outputSize, contentEncoding: isText ? GZIP_ENCODING : undefined, cleanup };
  } catch (error) {
    logger.warn(`Could not compress .${ext} upload; storing it as is`, error);
    await cleanup();
    return keepOriginal(path, size);
  }
}
