import { Request, Response } from 'express';
import status from 'http-status';
import { renderAccessDeniedPage } from '@/lib/accessDeniedPage';
import { VIEWER_ASSETS } from '@/lib/documentViewer';
import { deliver } from '@/services/deliveryService';
import ApiError from '@/utils/ApiError';
import catchAsync from '@/utils/catchAsync';
import { ERROR_CODES } from '@/utils/errorCodes';
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

const ACCESS_DENIED_CODES = new Set<string>([ERROR_CODES.FILE_PRIVATE, ERROR_CODES.LINK_EXPIRED, ERROR_CODES.INVALID_SIGNATURE]);

function accessDeniedCopy(error: ApiError): { title: string; message: string; hint: string } {
  if (error.errorCode === ERROR_CODES.LINK_EXPIRED) {
    return { title: 'This link has expired', message: error.message, hint: 'Ask the owner for a new signed link.' };
  }
  if (error.errorCode === ERROR_CODES.FILE_PRIVATE) {
    const kind = error.message.includes('image') ? 'image' : error.message.includes('video') ? 'video' : error.message.includes('audio') ? 'audio' : 'file';
    return { title: `This ${kind} is private`, message: error.message, hint: 'Ask the owner for a signed link, or to make it public.' };
  }
  return { title: 'This link is not valid', message: error.message, hint: 'Ask the owner for a new signed link.' };
}

function sendAccessDeniedPage(res: Response, error: ApiError): void {
  const { html, csp } = renderAccessDeniedPage(accessDeniedCopy(error));
  res
    .status(error.statusCode)
    .set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': csp,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    .send(html);
}

export const deliveryHandler = catchAsync(async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    if (error instanceof ApiError && ACCESS_DENIED_CODES.has(error.errorCode) && isBrowserNavigation(req)) {
      sendAccessDeniedPage(res, error);
      return;
    }
    throw error;
  }
});
