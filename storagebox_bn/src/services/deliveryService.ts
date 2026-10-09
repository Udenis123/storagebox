import { Readable } from 'stream';
import { File, UsageKind } from '@prisma/client';
import status from 'http-status';
import prisma from '@/config/prisma';
import { DeliveryTarget, verifyDeliverySignature } from '@/lib/deliveryUrl';
import { isTransformable } from '@/lib/fileTypes';
import { getObject, getObjectBuffer, putObject } from '@/lib/storage';
import { applyTransform, parseTransform, TransformParseError } from '@/lib/transform';
import { FileAccess } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { contentDisposition } from '@/utils/contentDisposition';
import { sha256Hex } from '@/utils/crypto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { recordUsage } from './usageService';

const PUBLIC_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';
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

export async function deliver(request: DeliveryRequest): Promise<DeliveryResponse> {
  const { publicId, ext } = splitAsset(request.asset);
  const file = await findDeliverableFile(request.cloudName, publicId, ext);
  const target: DeliveryTarget = { cloudName: request.cloudName, publicId, ext, transform: request.transform };
  const expires = assertAccess(file, target, request);

  const etag = `"${file.checksum.slice(0, 32)}${request.transform ? `-${sha256Hex(request.transform).slice(0, 8)}` : ''}"`;
  const baseHeaders: Record<string, string> = {
    ETag: etag,
    'Cache-Control': cacheControl(expires),
    'Last-Modified': file.updatedAt.toUTCString(),
    'Content-Disposition': contentDisposition(file.originalName, request.isDownload ? 'attachment' : 'inline'),
    'X-Content-Type-Options': 'nosniff',
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

  const object = await getObject(file.storageKey, request.range);
  const headers: Record<string, string> = { ...baseHeaders, 'Content-Type': file.mime, 'Accept-Ranges': 'bytes' };
  if (object.contentLength !== undefined) headers['Content-Length'] = String(object.contentLength);
  if (object.contentRange) headers['Content-Range'] = object.contentRange;
  // SVG can carry scripts; sandbox it so a hosted SVG cannot run code on this origin.
  if (file.ext === 'svg') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

  recordUsage(file.accountId, UsageKind.DELIVERY, object.contentLength ?? 0);
  return { statusCode: object.contentRange ? status.PARTIAL_CONTENT : status.OK, headers, body: object.body };
}
