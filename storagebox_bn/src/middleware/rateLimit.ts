import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { config } from '@/config/config';
import { getValkey } from '@/config/valkey';
import ApiError from '@/utils/ApiError';
import { ERROR_CODES } from '@/utils/errorCodes';

const WINDOW_SECONDS = 60;
const memoryCounters = new Map<string, number>();

async function incrementWindow(key: string): Promise<number> {
  const valkey = getValkey();
  if (valkey) {
    try {
      const [[, count]] = (await valkey.multi().incr(key).expire(key, WINDOW_SECONDS).exec()) as [[Error | null, number]];
      return count;
    } catch {
      /* fall through to the in-memory counter */
    }
  }
  if (memoryCounters.size > 10_000) memoryCounters.clear();
  const count = (memoryCounters.get(key) ?? 0) + 1;
  memoryCounters.set(key, count);
  return count;
}

/** Fixed one-minute window per API key (falls back to account for dashboard callers). */
export const rateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subject = req.context?.apiKeyId ?? req.context?.accountId ?? req.ip ?? 'anonymous';
    const window = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
    const limit = config.limits.rateLimitPerMinute;
    const count = await incrementWindow(`rl:${subject}:${window}`);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
    if (count > limit) {
      res.setHeader('Retry-After', WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % WINDOW_SECONDS));
      throw new ApiError(status.TOO_MANY_REQUESTS, 'Rate limit exceeded, slow down', ERROR_CODES.RATE_LIMITED);
    }
    next();
  } catch (error) {
    next(error);
  }
};
