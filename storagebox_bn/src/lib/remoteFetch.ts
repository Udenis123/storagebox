import { lookup } from 'dns/promises';
import { createWriteStream } from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream } from 'stream/web';
import { isIP } from 'net';
import status from 'http-status';
import { config, isProduction } from '@/config/config';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';
import { extensionForMime, extensionOf } from './fileTypes';
import { removeTempFiles, tempUploadPath } from './tempFiles';

/** Covers the whole download, which can be several GB. */
const FETCH_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_REDIRECTS = 5;

export interface RemoteFile {
  path: string;
  size: number;
  originalName: string;
  mime?: string;
}

const fetchFailed = (message: string) => new ApiError(status.BAD_REQUEST, message, ERROR_CODES.REMOTE_FETCH_FAILED);

const PRIVATE_RANGES = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^::1$/, /^f[cd]/i, /^fe80/i];

const isPrivateAddress = (address: string): boolean => PRIVATE_RANGES.some((range) => range.test(address));

/** Blocks server-side request forgery into the internal network (allowed locally for testing). */
async function assertPublicHost(url: URL): Promise<void> {
  if (!isProduction) return;
  const addresses = isIP(url.hostname) ? [url.hostname] : (await lookup(url.hostname, { all: true })).map((entry) => entry.address);
  if (addresses.some(isPrivateAddress)) throw fetchFailed('Remote URL must point to a public host');
}

const tooLarge = () => new ApiError(status.BAD_REQUEST, 'Remote file is larger than the upload limit', ERROR_CODES.FILE_TOO_LARGE);

/** Streams the body to a temp file, stopping as soon as it passes the upload limit. */
async function downloadLimited(response: Response): Promise<{ path: string; size: number }> {
  if (!response.body) throw fetchFailed('Remote URL returned an empty body');
  const filePath = tempUploadPath();
  let size = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      callback(size > config.limits.maxUploadBytes ? tooLarge() : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body as ReadableStream<Uint8Array>), limiter, createWriteStream(filePath));
  } catch (error) {
    await removeTempFiles([filePath]);
    throw error instanceof ApiError ? error : fetchFailed('Could not download the remote file');
  }
  return { path: filePath, size };
}

function fileNameFor(url: URL, mime: string | undefined): string {
  const lastSegment = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '') || 'remote-file';
  if (extensionOf(lastSegment)) return lastSegment;
  const ext = mime ? extensionForMime(mime) : undefined;
  return ext ? `${lastSegment}.${ext}` : lastSegment;
}

/** Every redirect hop is re-checked so a public URL cannot bounce the fetch into the internal network. */
async function fetchFollowingSafeRedirects(initialUrl: URL): Promise<{ response: Response; url: URL }> {
  let url = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!['http:', 'https:'].includes(url.protocol)) throw fetchFailed('Remote URL must use http or https');
    await assertPublicHost(url);
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: 'manual' });
    } catch {
      throw fetchFailed('Could not reach the remote URL');
    }
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) return { response, url };
    url = new URL(location, url);
  }
  throw fetchFailed('Remote URL redirected too many times');
}

export async function fetchRemoteFile(rawUrl: string): Promise<RemoteFile> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw fetchFailed('Remote URL is not valid');
  }
  const { response, url: finalUrl } = await fetchFollowingSafeRedirects(url);
  if (!response.ok) throw fetchFailed(`Remote URL responded with status ${response.status}`);

  const mime = response.headers.get('content-type') ?? undefined;
  const { path, size } = await downloadLimited(response);
  return { path, size, originalName: fileNameFor(finalUrl, mime), mime };
}
