import { Router } from 'express';
import { deliveryHandler, streamHandler, viewerAssetHandler } from '@/controllers/deliveryController';
import { VIEWER_ASSET_PREFIX } from '@/lib/documentViewer';

/** Public file delivery: `/f/:cloudName/[:transform/]:publicId.:ext`. */
const router = Router();

router.get(`/${VIEWER_ASSET_PREFIX}/:name`, viewerAssetHandler);
router.get('/:cloudName/_stream/:publicId/:variant', streamHandler);
router.get('/:cloudName/_stream/:publicId/:variant/:file', streamHandler);
router.get('/:cloudName/:asset', deliveryHandler);
router.get('/:cloudName/:transform/:asset', deliveryHandler);

export default router;
