import { Router } from 'express';
import {
  changePasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
  updateProfileHandler,
} from '@/controllers/authController';
import {
  latestStorageRequestHandler,
  listAccountsHandler,
  listStorageRequestsHandler,
  platformStatsHandler,
  requestStorageHandler,
  reviewStorageRequestHandler,
  updateAccountHandler,
} from '@/controllers/adminController';
import {
  activityHandler,
  createApiKeyHandler,
  createWebhookHandler,
  deleteWebhookHandler,
  listApiKeysHandler,
  listWebhooksHandler,
  revokeApiKeyHandler,
  testWebhookHandler,
  updateWebhookHandler,
  usageHandler,
} from '@/controllers/developerController';
import auth from '@/middleware/auth';
import validation from '@/middleware/validation';
import { UserRole } from '@/types/api';
import * as schemas from '@/validations/storageboxValidation';
import { collectionRoutes, fileRoutes } from './assetRoutes';

/** Dashboard API: JWT-authenticated, used by storagebox_fn. */
const router = Router();

router.post('/auth/register', validation(schemas.registerSchema), registerHandler);
router.post('/auth/login', validation(schemas.loginSchema), loginHandler);
router.post('/auth/refresh', validation(schemas.refreshSchema), refreshHandler);
router.post('/auth/logout', validation(schemas.refreshSchema), logoutHandler);
router.get('/auth/me', auth(), meHandler);
router.patch('/auth/me', auth(), validation(schemas.updateProfileSchema), updateProfileHandler);
router.post('/auth/password', auth(), validation(schemas.changePasswordSchema), changePasswordHandler);

router.use('/collections', auth(), collectionRoutes(':id'));
router.use('/files', auth(), fileRoutes(':id'));

router.get('/keys', auth(), listApiKeysHandler);
router.post('/keys', auth(), validation(schemas.createApiKeySchema), createApiKeyHandler);
router.post('/keys/:id/revoke', auth(), revokeApiKeyHandler);

router.get('/webhooks', auth(), listWebhooksHandler);
router.post('/webhooks', auth(), validation(schemas.createWebhookSchema), createWebhookHandler);
router.patch('/webhooks/:id', auth(), validation(schemas.updateWebhookSchema), updateWebhookHandler);
router.delete('/webhooks/:id', auth(), deleteWebhookHandler);
router.post('/webhooks/:id/test', auth(), testWebhookHandler);

router.get('/usage', auth(), usageHandler);
router.get('/storage-requests/latest', auth(), latestStorageRequestHandler);
router.post('/storage-requests', auth(), validation(schemas.requestStorageSchema), requestStorageHandler);

router.get('/activity', auth(), validation(schemas.paginationQuerySchema, 'query'), activityHandler);

router.get('/admin/stats', auth(UserRole.ADMIN), platformStatsHandler);
router.get('/admin/accounts', auth(UserRole.ADMIN), listAccountsHandler);
router.patch('/admin/accounts/:id', auth(UserRole.ADMIN), validation(schemas.updateAccountSchema), updateAccountHandler);
router.get('/admin/storage-requests', auth(UserRole.ADMIN), listStorageRequestsHandler);
router.patch(
  '/admin/storage-requests/:id',
  auth(UserRole.ADMIN),
  validation(schemas.reviewStorageRequestSchema),
  reviewStorageRequestHandler,
);

export default router;
