import { Router } from 'express';
import { deliveryHandler } from '@/controllers/deliveryController';

/** Public file delivery: `/f/:cloudName/[:transform/]:publicId.:ext`. */
const router = Router();

router.get('/:cloudName/:asset', deliveryHandler);
router.get('/:cloudName/:transform/:asset', deliveryHandler);

export default router;
