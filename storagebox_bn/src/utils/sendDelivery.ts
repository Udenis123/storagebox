import { Response } from 'express';
import status from 'http-status';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { DeliveryResponse } from '@/services/deliveryService';

const isS3Error = (error: unknown, name: string): boolean => error instanceof Error && error.name === name;

const isClientDisconnect = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | undefined)?.code === 'ERR_STREAM_PREMATURE_CLOSE';

/** Writes a file response, mapping storage errors to HTTP and ignoring clients that hang up mid-stream. */
export async function sendDelivery(res: Response, produce: () => Promise<DeliveryResponse>): Promise<void> {
  try {
    const result = await produce();
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
}
