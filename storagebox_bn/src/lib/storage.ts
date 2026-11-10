import { Readable } from 'stream';
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '@/config/config';
import logger from '@/config/logger';

const DELETE_BATCH_SIZE = 1000;
const MULTIPART_PART_BYTES = 16 * 1024 * 1024;
const MULTIPART_CONCURRENCY = 4;

const client = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  forcePathStyle: true,
  credentials: { accessKeyId: config.s3.accessKey, secretAccessKey: config.s3.secretKey },
});

export interface StoredObject {
  body: Readable;
  contentLength?: number;
  contentRange?: string;
}

export async function ensureBucket(): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: config.s3.bucket }));
    logger.info(`Created storage bucket ${config.s3.bucket}`);
  }
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await client.send(new PutObjectCommand({ Bucket: config.s3.bucket, Key: key, Body: body, ContentType: contentType }));
}

/** Streams in parts, so file size is bounded by the bucket rather than by memory. */
export async function putObjectStream(key: string, body: Readable, contentType: string): Promise<void> {
  await new Upload({
    client,
    params: { Bucket: config.s3.bucket, Key: key, Body: body, ContentType: contentType },
    partSize: MULTIPART_PART_BYTES,
    queueSize: MULTIPART_CONCURRENCY,
  }).done();
}

export async function getObject(key: string, range?: string): Promise<StoredObject> {
  const result = await client.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key, Range: range }));
  if (!(result.Body instanceof Readable)) throw new Error(`Storage object ${key} has no readable body`);
  return { body: result.Body, contentLength: result.ContentLength, contentRange: result.ContentRange };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const { body } = await getObject(key);
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks);
}

export async function listObjectKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: config.s3.bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

/** Uploads every file under `localDir` to `prefix/` (relative paths preserved). */
export async function putDirectory(prefix: string, localDir: string, files: string[]): Promise<void> {
  for (const relative of files) {
    const key = `${prefix}/${relative}`.replace(/\/+/g, '/');
    const filePath = path.join(localDir, relative);
    const contentType = contentTypeFor(relative);
    const { size } = await stat(filePath);
    if (size < MULTIPART_PART_BYTES) {
      await putObject(key, await readFile(filePath), contentType);
    } else {
      await putObjectStream(key, createReadStream(filePath), contentType);
    }
  }
}

const contentTypeFor = (fileName: string): string => {
  if (fileName.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (fileName.endsWith('.ts')) return 'video/mp2t';
  return 'application/octet-stream';
};

/** Best-effort: storage cleanup must never block the metadata change that triggered it. */
export async function deleteObjects(keys: string[]): Promise<void> {
  for (let start = 0; start < keys.length; start += DELETE_BATCH_SIZE) {
    const batch = keys.slice(start, start + DELETE_BATCH_SIZE);
    try {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.s3.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    } catch (error) {
      logger.warn(`Could not delete ${batch.length} stored object(s)`, error);
    }
  }
}

export async function deletePrefix(prefix: string): Promise<void> {
  const keys = await listObjectKeys(prefix.endsWith('/') ? prefix : `${prefix}/`);
  if (keys.length) await deleteObjects(keys);
}
