import { pipeline, Readable } from 'stream';
import { File, UsageKind } from '@prisma/client';
import status from 'http-status';
import { createGunzip } from 'zlib';
import { config } from '@/config/config';
import prisma from '@/config/prisma';
import { DeliveryTarget, verifyDeliverySignature } from '@/lib/deliveryUrl';
import { GZIP_ENCODING } from '@/lib/optimizeUpload';
import { renderViewerPage, ViewerKind, viewerKindFor } from '@/lib/documentViewer';
import { isTransformable } from '@/lib/fileTypes';
import { getObject, getObjectBuffer, putObject } from '@/lib/storage';
import { applyTransform, parseTransform, TransformParseError } from '@/lib/transform';
import { FileAccess } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { contentDisposition } from '@/utils/contentDisposition';
import { sha256Hex } from '@/utils/crypto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { formatBytes } from '@/utils/units';
import { recordUsage } from './usageService';

const PUBLIC_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';
const VIEWER_FILE_CACHE = 'private, no-cache';
const MAX_PRIVATE_CACHE_SECONDS = 3600;

export interface DeliveryRequest {
  cloudName: string;
  asset: string;
  transform?: string;
  expires?: unknown;
  sig?: unknown;
  isDownload: boolean;
  range?: string;
  ifNoneMatch?: string;
  acceptsGzip?: boolean;
  /** Request URL when a browser navigates to the link; documents it can't display get a viewer page instead. */
  viewerPath?: string;
}

export interface DeliveryResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: Readable | Buffer;
}

const notFound = () => new ApiError(status.NOT_FOUND, 'Resource not found', ERROR_CODES.FILE_NOT_FOUND);

const normalizeExt = (ext: string): string => (ext === 'jpeg' ? 'jpg' : ext);

function splitAsset(asset: string): { publicId: string; ext: string } {
  const dot = asset.lastIndexOf('.');
  if (dot <= 0) throw notFound();
  return { publicId: asset.slice(0, dot), ext: asset.slice(dot + 1).toLowerCase() };
}

async function findDeliverableFile(cloudName: string, publicId: string, ext: string): Promise<File> {
  const account = await prisma.account.findUnique({ where: { cloudName }, select: { id: true, isSuspended: true } });
  if (!account || account.isSuspended) throw notFound();
  const file = await prisma.file.findUnique({ where: { accountId_publicId: { accountId: account.id, publicId } } });
  if (!file || normalizeExt(file.ext) !== normalizeExt(ext)) throw notFound();
  return file;
}

function assertAccess(file: File, target: DeliveryTarget, request: DeliveryRequest): number | undefined {
  if (file.access === FileAccess.PUBLIC) return undefined;
  const check = verifyDeliverySignature(target, request.expires, request.sig);
  if (check === 'expired') throw new ApiError(status.FORBIDDEN, 'This link has expired', ERROR_CODES.LINK_EXPIRED);
  if (check === 'invalid') throw new ApiError(status.FORBIDDEN, 'This file is private — use a signed link', ERROR_CODES.INVALID_SIGNATURE);
  return Number(request.expires);
}

function cacheControl(expires: number | undefined): string {
  if (expires === undefined) return PUBLIC_CACHE;
  const remaining = Math.max(0, Math.min(MAX_PRIVATE_CACHE_SECONDS, expires - Math.floor(Date.now() / 1000)));
  return `private, max-age=${remaining}`;
}

function parseTransformOrThrow(segment: string) {
  try {
    return parseTransform(segment);
  } catch (error) {
    if (error instanceof TransformParseError) throw new ApiError(status.BAD_REQUEST, error.message, ERROR_CODES.INVALID_TRANSFORM);
    throw error;
  }
}

interface DerivativeSource {
  storageKey: string;
  mime: string;
  buffer?: Buffer;
}

async function resolveDerivative(file: File, segment: string): Promise<DerivativeSource> {
  if (!isTransformable(file.ext)) {
    throw new ApiError(status.BAD_REQUEST, 'Transforms are only available for images', ERROR_CODES.TRANSFORM_NOT_SUPPORTED);
  }
  const { options, canonical } = parseTransformOrThrow(segment);
  const cached = await prisma.derivative.findUnique({ where: { fileId_transform: { fileId: file.id, transform: canonical } } });
  if (cached) return { storageKey: cached.storageKey, mime: cached.mime };

  const original = await getObjectBuffer(file.storageKey);
  const result = await applyTransform(original, options, file.ext);
  const storageKey = `${file.accountId}/derived/${file.id}/${sha256Hex(canonical).slice(0, 16)}`;
  await putObject(storageKey, result.buffer, result.mime);
  await prisma.derivative.upsert({
    where: { fileId_transform: { fileId: file.id, transform: canonical } },
    create: { fileId: file.id, transform: canonical, storageKey, mime: result.mime, sizeBytes: BigInt(result.buffer.length) },
    update: {},
  });
  recordUsage(file.accountId, UsageKind.TRANSFORM, result.buffer.length);
  return { storageKey, mime: result.mime, buffer: result.buffer };
}

const isPubliclyReachable = (url: string): boolean => !/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url);

function withQuery(requestPath: string, set: Record<string, string>, remove: string[]): string {
  const url = new URL(requestPath, 'http://storagebox.local');
  for (const key of remove) url.searchParams.delete(key);
  for (const [key, value] of Object.entries(set)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function viewerResponse(file: File, kind: ViewerKind, requestPath: string): DeliveryResponse {
  const isEmbedded = new URL(requestPath, 'http://storagebox.local').searchParams.get('embed') === '1';
  const rawPath = withQuery(requestPath, { raw: '1' }, ['dl', 'embed']);
  const { html, csp } = renderViewerPage({
    kind,
    fileName: file.originalName,
    sizeLabel: `${file.ext.toUpperCase()} · ${formatBytes(Number(file.sizeBytes))}`,
    rawPath,
    downloadPath: withQuery(requestPath, { dl: '1' }, ['raw', 'embed']),
    publicRawUrl: isPubliclyReachable(config.publicUrl) ? `${config.publicUrl}${rawPath}` : undefined,
    isEmbedded,
  });
  const body = Buffer.from(html);
  return {
    statusCode: status.OK,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': String(body.length),
      'Content-Security-Policy': csp,
      'Cache-Control': 'no-cache',
      Vary: 'Sec-Fetch-Dest, Accept',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
    body,
  };
}

const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

const appendVary = (headers: Record<string, string>, value: string): string => (headers.Vary ? `${headers.Vary}, ${value}` : value);

/** Text stored gzipped: sent as-is to clients that accept gzip, decoded for the rest. Ranges are not offered. */
async function deliverGzipped(file: File, baseHeaders: Record<string, string>, request: OriginalRequest): Promise<DeliveryResponse> {
  const object = await getObject(file.storageKey);
  const headers: Record<string, string> = { ...baseHeaders, 'Content-Type': file.mime, Vary: appendVary(baseHeaders, 'Accept-Encoding') };
  if (file.ext === 'svg') headers['Content-Security-Policy'] = SVG_CSP;
  recordUsage(file.accountId, UsageKind.DELIVERY, object.contentLength ?? 0);

  if (request.acceptsGzip) {
    headers['Content-Encoding'] = GZIP_ENCODING;
    if (object.contentLength !== undefined) headers['Content-Length'] = String(object.contentLength);
    return { statusCode: status.OK, headers, body: object.body };
  }
  if (file.originalSizeBytes !== null) headers['Content-Length'] = String(file.originalSizeBytes);
  const decoded = createGunzip();
  pipeline(object.body, decoded, () => undefined);
  return { statusCode: status.OK, headers, body: decoded };
}

export async function deliver(request: DeliveryRequest): Promise<DeliveryResponse> {
  const { publicId, ext } = splitAsset(request.asset);
  const file = await findDeliverableFile(request.cloudName, publicId, ext);
  const target: DeliveryTarget = { cloudName: request.cloudName, publicId, ext, transform: request.transform };
  const expires = assertAccess(file, target, request);
  const viewerKind = viewerKindFor(normalizeExt(file.ext));
  if (viewerKind && request.viewerPath && !request.transform && !request.isDownload) {
    return viewerResponse(file, viewerKind, request.viewerPath);
  }

  const etag = etagFor(file, request.transform);
  const baseHeaders: Record<string, string> = {
    ETag: etag,
    /** Viewer-capable files answer browsers with HTML and apps with bytes on one URL, so no shared or stale copy may be reused. */
    'Cache-Control': viewerKind ? VIEWER_FILE_CACHE : cacheControl(expires),
    'Last-Modified': file.updatedAt.toUTCString(),
    'Content-Disposition': contentDisposition(file.originalName, request.isDownload ? 'attachment' : 'inline'),
    'X-Content-Type-Options': 'nosniff',
    ...(viewerKind ? { Vary: 'Sec-Fetch-Dest, Accept' } : {}),
  };
  if (request.ifNoneMatch === etag) return { statusCode: status.NOT_MODIFIED, headers: baseHeaders };

  if (request.transform) {
    const derivative = await resolveDerivative(file, request.transform);
    const body = derivative.buffer ?? (await getObjectBuffer(derivative.storageKey));
    recordUsage(file.accountId, UsageKind.DELIVERY, body.length);
    return {
      statusCode: status.OK,
      headers: { ...baseHeaders, 'Content-Type': derivative.mime, 'Content-Length': String(body.length) },
      body,
    };
  }

  return originalResponse(file, baseHeaders, request);
}

const etagFor = (file: File, transform?: string): string =>
  `"${file.checksum.slice(0, 32)}${transform ? `-${sha256Hex(transform).slice(0, 8)}` : ''}"`;

type OriginalRequest = Pick<DeliveryRequest, 'range' | 'acceptsGzip'>;

/** The stored file itself (no transform), streamed with range support. */
async function originalResponse(file: File, baseHeaders: Record<string, string>, request: OriginalRequest): Promise<DeliveryResponse> {
  if (file.contentEncoding === GZIP_ENCODING) return deliverGzipped(file, baseHeaders, request);

  const object = await getObject(file.storageKey, request.range);
  const headers: Record<string, string> = { ...baseHeaders, 'Content-Type': file.mime, 'Accept-Ranges': 'bytes' };
  if (object.contentLength !== undefined) headers['Content-Length'] = String(object.contentLength);
  if (object.contentRange) headers['Content-Range'] = object.contentRange;
  // SVG can carry scripts; sandbox it so a hosted SVG cannot run code on this origin.
  if (file.ext === 'svg') headers['Content-Security-Policy'] = SVG_CSP;

  recordUsage(file.accountId, UsageKind.DELIVERY, object.contentLength ?? 0);
  return { statusCode: object.contentRange ? status.PARTIAL_CONTENT : status.OK, headers, body: object.body };
}

export interface OwnFileRequest extends OriginalRequest {
  isDownload: boolean;
  ifNoneMatch?: string;
}

/** Bytes of a file for its own account (dashboard session or API key) — works for private files without a signed link. */
export async function deliverOwnFile(file: File, request: OwnFileRequest): Promise<DeliveryResponse> {
  const etag = etagFor(file);
  const baseHeaders: Record<string, string> = {
    ETag: etag,
    'Cache-Control': 'private, no-store',
    'Last-Modified': file.updatedAt.toUTCString(),
    'Content-Disposition': contentDisposition(file.originalName, request.isDownload ? 'attachment' : 'inline'),
    'X-Content-Type-Options': 'nosniff',
  };
  if (request.ifNoneMatch === etag) return { statusCode: status.NOT_MODIFIED, headers: baseHeaders };
  return originalResponse(file, baseHeaders, request);
}
