import { Request, Response } from 'express';
import status from 'http-status';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { deliver } from '@/services/deliveryService';
import catchAsync from '@/utils/catchAsync';
import { param } from '@/utils/request';

const isS3Error = (error: unknown, name: string): boolean => error instanceof Error && error.name === name;

const isClientDisconnect = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | undefined)?.code === 'ERR_STREAM_PREMATURE_CLOSE';

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
