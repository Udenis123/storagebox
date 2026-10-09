import Redis from 'ioredis';
import { config } from '@/config/config';
import logger from '@/config/logger';

let client: Redis | null = null;
let isUnavailable = false;

/** Shared Valkey client, or null when Valkey is unreachable (callers fall back to memory). */
export function getValkey(): Redis | null {
  if (isUnavailable) return null;
  if (client) return client;
  client = new Redis(config.valkeyUrl, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3_000 });
  client.on('error', (error) => logger.warn(`Valkey error: ${error.message}`));
  return client;
}

export async function connectValkey(): Promise<void> {
  const valkey = getValkey();
  if (!valkey) return;
  try {
    if (valkey.status === 'wait') await valkey.connect();
    await valkey.ping();
    logger.info('Valkey connected');
  } catch (error) {
    isUnavailable = true;
    logger.warn('Valkey unavailable; rate limiting falls back to in-memory counters', error);
    valkey.disconnect();
    client = null;
  }
}

export async function disconnectValkey(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  } finally {
    client = null;
  }
}
