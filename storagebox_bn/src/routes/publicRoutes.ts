import { Router } from 'express';
import { galleryHandler } from '@/controllers/galleryController';

/** Unauthenticated read-only endpoints behind share links. */
const router = Router();

router.get('/galleries/:token', galleryHandler);

export default router;
