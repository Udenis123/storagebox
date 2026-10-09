import { Request, Response } from 'express';
import status from 'http-status';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { VIEWER_ASSETS } from '@/lib/documentViewer';
import { deliver } from '@/services/deliveryService';
import catchAsync from '@/utils/catchAsync';
import { param } from '@/utils/request';

const isS3Error = (error: unknown, name: string): boolean => error instanceof Error && error.name === name;

/** A person opening the link (address bar or iframe), not code fetching the bytes. */
function isBrowserNavigation(req: Request): boolean {
  if (req.query.raw === '1') return false;
  const destination = req.get('sec-fetch-dest');
  if (destination) return destination === 'document' || destination === 'iframe';
  return Boolean(req.get('accept')?.includes('text/html'));
}

const isClientDisconnect = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | undefined)?.code === 'ERR_STREAM_PREMATURE_CLOSE';

export const viewerAssetHandler = (req: Request, res: Response): void => {
  const assetPath = VIEWER_ASSETS[param(req, 'name')];
  if (!assetPath) {
    res.status(status.NOT_FOUND).end();
    return;
  }
  res.sendFile(assetPath, { maxAge: '7d', immutable: true, headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
};

export const deliveryHandler = catchAsync(async (req: Request, res: Response) => {
  try {
    const result = await deliver({
      cloudName: param(req, 'cloudName'),
      asset: param(req, 'asset'),
      transform: req.params.transform,
      expires: req.query.expires,
      sig: req.query.sig,
      isDownload: req.query.dl === '1',
      range: req.headers.range,
      ifNoneMatch: req.headers['if-none-match'],
      viewerPath: isBrowserNavigation(req) ? req.originalUrl : undefined,
    });

    res.status(result.statusCode).set(result.headers);
    if (!result.body) {
      res.end();
      return;
    }
    if (Buffer.isBuffer(result.body)) {
      res.end(result.body);
      return;
    }
    await pipeline(result.body as Readable, res);
  } catch (error) {
    if (isS3Error(error, 'InvalidRange')) {
      res.status(status.REQUESTED_RANGE_NOT_SATISFIABLE).end();
      return;
    }
    if (isS3Error(error, 'NoSuchKey')) {
      res.status(status.NOT_FOUND).end();
      return;
    }
    if (isClientDisconnect(error)) return;
    throw error;
  }
});
