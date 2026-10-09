import { createHash, randomUUID } from 'crypto';
import { createReadStream, mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import os from 'os';
import path from 'path';

/** Uploads are spooled here instead of memory, so a multi-GB file never sits in the API's RAM. */
export const UPLOAD_TEMP_DIR = path.join(os.tmpdir(), 'storagebox-uploads');
mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });

export const tempUploadPath = (): string => path.join(UPLOAD_TEMP_DIR, randomUUID());

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

export async function removeTempFiles(paths: string[]): Promise<void> {
  await Promise.allSettled(paths.map((filePath) => rm(filePath, { force: true })));
}
