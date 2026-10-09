import sharp from 'sharp';

export const OUTPUT_FORMATS = ['webp', 'jpg', 'png', 'avif'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const CROP_MODES = ['fill', 'fit', 'limit'] as const;
export type CropMode = (typeof CROP_MODES)[number];

export interface TransformOptions {
  width?: number;
  height?: number;
  crop?: CropMode;
  quality?: number;
  format?: OutputFormat;
}

export interface ParsedTransform {
  options: TransformOptions;
  /** Stable, sorted form used as the derivative cache key and in signatures. */
  canonical: string;
}

const MAX_DIMENSION = 5000;

const OUTPUT_MIME: Record<OutputFormat, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif',
};

export class TransformParseError extends Error {}

const parseInteger = (raw: string, min: number, max: number, label: string): number => {
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || value < min || value > max) {
    throw new TransformParseError(`${label} must be a whole number between ${min} and ${max}`);
  }
  return value;
};

const parseChoice = <T extends string>(raw: string, choices: readonly T[], label: string): T => {
  const normalized = (raw === 'jpeg' ? 'jpg' : raw) as T;
  if (!choices.includes(normalized)) throw new TransformParseError(`${label} must be one of ${choices.join(', ')}`);
  return normalized;
};

/** Parses a Cloudinary-style transform segment such as `w_400,h_300,c_fill,q_80,f_webp`. */
export function parseTransform(segment: string): ParsedTransform {
  const options: TransformOptions = {};
  for (const token of segment.split(',').filter(Boolean)) {
    const [key, value = ''] = token.split('_', 2) as [string, string?];
    switch (key) {
      case 'w':
        options.width = parseInteger(value, 1, MAX_DIMENSION, 'Width (w_)');
        break;
      case 'h':
        options.height = parseInteger(value, 1, MAX_DIMENSION, 'Height (h_)');
        break;
      case 'q':
        options.quality = parseInteger(value, 1, 100, 'Quality (q_)');
        break;
      case 'c':
        options.crop = parseChoice(value, CROP_MODES, 'Crop (c_)');
        break;
      case 'f':
        options.format = parseChoice(value, OUTPUT_FORMATS, 'Format (f_)');
        break;
      default:
        throw new TransformParseError(`Unknown transform "${token}"`);
    }
  }
  if (Object.keys(options).length === 0) throw new TransformParseError('Transform is empty');
  return { options, canonical: canonicalTransform(options) };
}

export function canonicalTransform(options: TransformOptions): string {
  const parts: string[] = [];
  if (options.crop) parts.push(`c_${options.crop}`);
  if (options.format) parts.push(`f_${options.format}`);
  if (options.height) parts.push(`h_${options.height}`);
  if (options.quality) parts.push(`q_${options.quality}`);
  if (options.width) parts.push(`w_${options.width}`);
  return parts.join(',');
}

const resizeFit = (options: TransformOptions): 'cover' | 'inside' => {
  if (options.crop) return options.crop === 'fill' ? 'cover' : 'inside';
  return options.width && options.height ? 'cover' : 'inside';
};

export interface TransformResult {
  buffer: Buffer;
  mime: string;
}

export async function applyTransform(input: Buffer, options: TransformOptions, sourceExt: string): Promise<TransformResult> {
  let pipeline = sharp(input, { animated: sourceExt === 'gif' }).rotate();
  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: resizeFit(options),
      withoutEnlargement: options.crop === 'limit',
    });
  }

  const sourceFormat = (sourceExt === 'jpeg' ? 'jpg' : sourceExt) as OutputFormat;
  const format: OutputFormat = options.format ?? (OUTPUT_FORMATS.includes(sourceFormat) ? sourceFormat : 'webp');
  const quality = options.quality;
  switch (format) {
    case 'jpg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
  }
  return { buffer: await pipeline.toBuffer(), mime: OUTPUT_MIME[format] };
}
