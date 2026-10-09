import { Router } from 'express';
import { usageHandler } from '@/controllers/developerController';
import { apiKeyAuth, requireWrite } from '@/middleware/apiKeyAuth';
import { rateLimit } from '@/middleware/rateLimit';
import { collectionRoutes, fileRoutes } from './assetRoutes';

/** Developer API: API-key authenticated and rate limited. */
const router = Router();

router.use(apiKeyAuth, rateLimit);
router.use('/collections', collectionRoutes(':id', requireWrite));
router.use('/files', fileRoutes(':publicId', requireWrite));
router.get('/usage', usageHandler);

export default router;
