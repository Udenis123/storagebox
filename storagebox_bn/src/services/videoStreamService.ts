import { writeFile } from 'fs/promises';
import { File } from '@prisma/client';
import prisma from '@/config/prisma';
import logger from '@/config/logger';
import { kindForExtension } from '@/lib/fileTypes';
import { deletePrefix, getObjectBuffer, putDirectory } from '@/lib/storage';
import { removeTempFiles, tempUploadPath } from '@/lib/tempFiles';
import { isFfmpegAvailable, packageHls, removeHlsWorkDir } from '@/lib/videoHls';

const inFlight = new Set<string>();

export const streamPrefixFor = (accountId: string, fileId: string): string => `${accountId}/stream/${fileId}`;

export const streamMasterKey = (streamKey: string): string => `${streamKey}/index.m3u8`;

/**
 * Fire-and-forget HLS packaging so uploads stay fast. Safe to call repeatedly.
 * When `sourcePath` is passed, this worker owns that file and deletes it when done.
 */
export function enqueueVideoStream(file: Pick<File, 'id' | 'accountId' | 'ext' | 'storageKey' | 'streamKey'>, sourcePath?: string): void {
  if (file.streamKey || kindForExtension(file.ext) !== 'video') return;
  if (inFlight.has(file.id)) {
    if (sourcePath) void removeTempFiles([sourcePath]);
    return;
  }
  inFlight.add(file.id);
  void buildVideoStream(file, sourcePath).finally(() => inFlight.delete(file.id));
}

async function buildVideoStream(
  file: Pick<File, 'id' | 'accountId' | 'ext' | 'storageKey'>,
  sourcePath?: string,
): Promise<void> {
  if (!(await isFfmpegAvailable())) {
    logger.warn('Skipping HLS packaging — ffmpeg is not available on this host');
    if (sourcePath) await removeTempFiles([sourcePath]);
    return;
  }

  const localPath = sourcePath ?? `${tempUploadPath()}.${file.ext}`;
  let workDir: string | undefined;
  try {
    if (!sourcePath) await writeFile(localPath, await getObjectBuffer(file.storageKey));

    const packaged = await packageHls(localPath);
    workDir = packaged.workDir;
    const streamKey = streamPrefixFor(file.accountId, file.id);
    await putDirectory(streamKey, packaged.workDir, packaged.files);
    await prisma.file.update({ where: { id: file.id }, data: { streamKey } });
    logger.info(`HLS ready for file ${file.id} (${packaged.files.length} objects)`);
  } catch (error) {
    logger.warn(`HLS packaging failed for file ${file.id}`, error);
  } finally {
    if (workDir) await removeHlsWorkDir(workDir);
    await removeTempFiles([localPath]);
  }
}

export async function deleteVideoStream(streamKey: string | null | undefined): Promise<void> {
  if (!streamKey) return;
  await deletePrefix(streamKey);
}
