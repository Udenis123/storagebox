import { createApp } from '@/app';
import { config } from '@/config/config';
import logger from '@/config/logger';
import prisma from '@/config/prisma';
import { connectValkey, disconnectValkey } from '@/config/valkey';
import { ensureBucket } from '@/lib/storage';

async function start(): Promise<void> {
  await prisma.$connect();
  await connectValkey();
  await ensureBucket();
  createApp().listen(config.port, () => {
    logger.info(`StorageBox API listening on ${config.publicUrl} (docs at /docs)`);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`Shutting down (${signal})`);
  await Promise.allSettled([prisma.$disconnect(), disconnectValkey()]);
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

start().catch((error) => {
  logger.error('StorageBox API failed to start', error);
  process.exit(1);
});
