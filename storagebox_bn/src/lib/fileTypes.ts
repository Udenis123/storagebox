import { FileKind } from '@/types/api';

interface FileTypeInfo {
  mime: string;
  kind: FileKind;
}

const FILE_TYPES: Record<string, FileTypeInfo> = {
  pdf: { mime: 'application/pdf', kind: 'document' },
  doc: { mime: 'application/msword', kind: 'document' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'document' },
  xls: { mime: 'application/vnd.ms-excel', kind: 'document' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'document' },
  ppt: { mime: 'application/vnd.ms-powerpoint', kind: 'document' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'document' },
  odt: { mime: 'application/vnd.oasis.opendocument.text', kind: 'document' },
  rtf: { mime: 'application/rtf', kind: 'document' },
  txt: { mime: 'text/plain', kind: 'document' },
  csv: { mime: 'text/csv', kind: 'document' },
  md: { mime: 'text/markdown', kind: 'document' },
  json: { mime: 'application/json', kind: 'document' },
  zip: { mime: 'application/zip', kind: 'archive' },
  jpg: { mime: 'image/jpeg', kind: 'image' },
  jpeg: { mime: 'image/jpeg', kind: 'image' },
  png: { mime: 'image/png', kind: 'image' },
  gif: { mime: 'image/gif', kind: 'image' },
  webp: { mime: 'image/webp', kind: 'image' },
  avif: { mime: 'image/avif', kind: 'image' },
  svg: { mime: 'image/svg+xml', kind: 'image' },
  mp4: { mime: 'video/mp4', kind: 'video' },
  mov: { mime: 'video/quicktime', kind: 'video' },
  webm: { mime: 'video/webm', kind: 'video' },
  mp3: { mime: 'audio/mpeg', kind: 'audio' },
  wav: { mime: 'audio/wav', kind: 'audio' },
};

export const ALLOWED_EXTENSIONS = Object.keys(FILE_TYPES);

/** Raster formats sharp can read and transform; SVG is served as-is. */
const TRANSFORMABLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);

export const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
};

export const isAllowedExtension = (ext: string): boolean => ext in FILE_TYPES;

export const mimeForExtension = (ext: string): string => FILE_TYPES[ext]?.mime ?? 'application/octet-stream';

export const kindForExtension = (ext: string): FileKind => FILE_TYPES[ext]?.kind ?? 'other';

export const isTransformable = (ext: string): boolean => TRANSFORMABLE_EXTENSIONS.has(ext);

export const extensionForMime = (mime: string): string | undefined =>
  Object.entries(FILE_TYPES).find(([, info]) => info.mime === mime.split(';')[0]?.trim().toLowerCase())?.[0];

export const extensionsForKind = (kind: FileKind): string[] =>
  Object.entries(FILE_TYPES)
    .filter(([, info]) => info.kind === kind)
    .map(([ext]) => ext);
