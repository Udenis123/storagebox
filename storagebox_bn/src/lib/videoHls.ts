import { spawn } from 'child_process';
import { mkdir, mkdtemp, readdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import logger from '@/config/logger';

export type HlsVariant = {
  name: string;
  height: number;
  videoBitrate: string;
  maxrate: string;
  bufsize: string;
  audioBitrate: string;
};

/** Ladder ordered low → high. Source height decides how many rungs we keep. */
export const HLS_VARIANTS: HlsVariant[] = [
  { name: '480p', height: 480, videoBitrate: '1200k', maxrate: '1500k', bufsize: '2400k', audioBitrate: '96k' },
  { name: '720p', height: 720, videoBitrate: '2800k', maxrate: '3500k', bufsize: '5600k', audioBitrate: '128k' },
  { name: '1080p', height: 1080, videoBitrate: '5000k', maxrate: '6000k', bufsize: '10000k', audioBitrate: '160k' },
];

const SEGMENT_SECONDS = 4;
let ffmpegAvailable: boolean | undefined;

export async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== undefined) return ffmpegAvailable;
  const available = await new Promise<boolean>((resolve) => {
    const child = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
  ffmpegAvailable = available;
  return available;
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}: ${stderr.trim() || 'no output'}`));
    });
  });
}

async function probe(sourcePath: string, entries: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', entries, '-of', 'csv=p=0', sourcePath],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let out = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on('error', () => resolve(''));
    child.on('exit', () => resolve(out.trim()));
  });
}

export async function probeVideoHeight(sourcePath: string): Promise<number> {
  const height = Number.parseInt(await probe(sourcePath, 'stream=height'), 10);
  return Number.isFinite(height) ? height : 0;
}

async function hasAudioStream(sourcePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', sourcePath],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let out = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on('error', () => resolve(false));
    child.on('exit', () => resolve(out.includes('audio')));
  });
}

export function variantsForHeight(sourceHeight: number): HlsVariant[] {
  const usable = HLS_VARIANTS.filter((variant) => sourceHeight <= 0 || sourceHeight >= Math.floor(variant.height * 0.85));
  if (usable.length > 0) return usable;
  const fallback = HLS_VARIANTS[0];
  if (!fallback) throw new Error('HLS ladder is empty');
  return [fallback];
}

export type PackagedHls = {
  masterPath: string;
  files: string[];
  workDir: string;
};

async function collectFiles(root: string, relative = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const next = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await collectFiles(root, next)));
    else files.push(next);
  }
  return files;
}

/** Builds a multi-bitrate HLS VOD package. Caller must remove `workDir` when done. */
export async function packageHls(sourcePath: string): Promise<PackagedHls> {
  if (!(await isFfmpegAvailable())) throw new Error('ffmpeg is not installed');

  const workDir = await mkdtemp(path.join(os.tmpdir(), 'storagebox-hls-'));
  const height = await probeVideoHeight(sourcePath);
  const withAudio = await hasAudioStream(sourcePath);
  const variants = variantsForHeight(height);

  for (let index = 0; index < variants.length; index += 1) {
    await mkdir(path.join(workDir, String(index)), { recursive: true });
  }

  const filter = variants.map((variant, index) => `[0:v]scale=-2:${variant.height}:flags=lanczos[v${index}]`).join(';');
  const maps: string[] = [];
  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index]!;
    maps.push('-map', `[v${index}]`);
    if (withAudio) maps.push('-map', 'a:0');
    maps.push(
      `-c:v:${index}`, 'libx264',
      '-preset', 'veryfast',
      '-profile:v', 'main',
      `-b:v:${index}`, variant.videoBitrate,
      `-maxrate:v:${index}`, variant.maxrate,
      `-bufsize:v:${index}`, variant.bufsize,
    );
    if (withAudio) {
      maps.push(`-c:a:${index}`, 'aac', `-b:a:${index}`, variant.audioBitrate, `-ac:a:${index}`, '2');
    }
  }
  const varStreamMap = variants.map((_, index) => (withAudio ? `v:${index},a:${index}` : `v:${index}`)).join(' ');
  const args = [
    '-y',
    '-i', sourcePath,
    '-filter_complex', filter,
    ...maps,
    '-f', 'hls',
    '-hls_time', String(SEGMENT_SECONDS),
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments',
    '-master_pl_name', 'index.m3u8',
    '-var_stream_map', varStreamMap,
    '-hls_segment_filename', path.join(workDir, '%v', 'seg_%03d.ts'),
    path.join(workDir, '%v', 'playlist.m3u8'),
  ];

  logger.info(`Packaging HLS (${variants.map((v) => v.name).join(', ')}) from ${path.basename(sourcePath)}`);
  try {
    await run('ffmpeg', args);
    const files = await collectFiles(workDir);
    if (!files.includes('index.m3u8')) throw new Error('HLS master playlist was not created');
    return { masterPath: path.join(workDir, 'index.m3u8'), files, workDir };
  } catch (error) {
    await rm(workDir, { recursive: true, force: true });
    throw error;
  }
}

export async function removeHlsWorkDir(workDir: string): Promise<void> {
  await rm(workDir, { recursive: true, force: true });
}
