import compression from 'compression';
import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from '@/config/config';
import logger from '@/config/logger';
import { openApiDocument } from '@/docs/openapi';
import { errorHandler, notFoundHandler } from '@/middleware/error';
import apiRoutes from '@/routes/apiRoutes';
import deliveryRoutes from '@/routes/deliveryRoutes';
import v1Routes from '@/routes/v1Routes';

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Delivered files are embedded from any origin (img/iframe/pdf), so resources must be cross-origin readable.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(compression());
  if (config.env !== 'test') {
    app.use(morgan('tiny', { stream: { write: (line) => logger.http(line.trim()) } }));
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/f', cors({ origin: '*', exposedHeaders: ['Content-Length', 'Content-Range', 'ETag'] }), deliveryRoutes);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: 'StorageBox API' }));
  app.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(express.json({ limit: '1mb' }));
  app.use('/v1', cors({ origin: '*', exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'] }), v1Routes);
  app.use('/api', cors({ origin: config.corsOrigins, credentials: true }), apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
