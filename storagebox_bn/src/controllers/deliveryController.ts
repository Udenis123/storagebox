import { Request, Response } from 'express';
import status from 'http-status';
import { VIEWER_ASSETS } from '@/lib/documentViewer';
import { deliver } from '@/services/deliveryService';
import catchAsync from '@/utils/catchAsync';
import { param } from '@/utils/request';
import { sendDelivery } from '@/utils/sendDelivery';

/** A person opening the link (address bar or iframe), not code fetching the bytes. */
function isBrowserNavigation(req: Request): boolean {
  if (req.query.raw === '1') return false;
  const destination = req.get('sec-fetch-dest');
  if (destination) return destination === 'document' || destination === 'iframe';
  return Boolean(req.get('accept')?.includes('text/html'));
}

export const viewerAssetHandler = (req: Request, res: Response): void => {
  const assetPath = VIEWER_ASSETS[param(req, 'name')];
  if (!assetPath) {
    res.status(status.NOT_FOUND).end();
    return;
  }
  res.sendFile(assetPath, { maxAge: '7d', immutable: true, headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
};

export const deliveryHandler = catchAsync(async (req: Request, res: Response) => {
  await sendDelivery(res, () =>
    deliver({
      cloudName: param(req, 'cloudName'),
      asset: param(req, 'asset'),
      transform: req.params.transform,
      expires: req.query.expires,
      sig: req.query.sig,
      isDownload: req.query.dl === '1',
      range: req.headers.range,
      ifNoneMatch: req.headers['if-none-match'],
      viewerPath: isBrowserNavigation(req) ? req.originalUrl : undefined,
      acceptsGzip: req.acceptsEncodings('gzip') === 'gzip',
    }),
  );
});
