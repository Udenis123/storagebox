import { RequestHandler, Router } from 'express';
import {
  createCollectionHandler,
  deleteCollectionHandler,
  getSharingHandler,
  listCollectionsHandler,
  shareCollectionHandler,
  unshareCollectionHandler,
  updateCollectionHandler,
} from '@/controllers/collectionController';
import {
  bulkAccessHandler,
  bulkDeleteFilesHandler,
  deleteFileHandler,
  fileContentHandler,
  getFileHandler,
  listFilesHandler,
  signedLinkHandler,
  updateFileHandler,
  uploadFilesHandler,
} from '@/controllers/fileController';
import { acceptUploads } from '@/middleware/upload';
import validation from '@/middleware/validation';
import * as schemas from '@/validations/storageboxValidation';

const passThrough: RequestHandler = (_req, _res, next) => next();

/**
 * Collection and file routes shared by the dashboard (`/api`, files by `:id`) and the
 * developer API (`/v1`, files by `:publicId`). `write` guards mutating routes (API key scope).
 */
export function collectionRoutes(idParam: string, write: RequestHandler = passThrough): Router {
  const router = Router();
  router.get('/', listCollectionsHandler);
  router.post('/', write, validation(schemas.createCollectionSchema), createCollectionHandler);
  router.get(`/${idParam}/share`, getSharingHandler);
  router.post(`/${idParam}/share`, write, shareCollectionHandler);
  router.delete(`/${idParam}/share`, write, unshareCollectionHandler);
  router.patch(`/${idParam}`, write, validation(schemas.updateCollectionSchema), updateCollectionHandler);
  router.delete(`/${idParam}`, write, validation(schemas.deleteCollectionQuerySchema, 'query'), deleteCollectionHandler);
  return router;
}

export function fileRoutes(refParam: ':id' | ':publicId', write: RequestHandler = passThrough): Router {
  const router = Router();
  router.get('/', validation(schemas.listFilesQuerySchema, 'query'), listFilesHandler);
  router.post('/', write, ...acceptUploads, validation(schemas.uploadSchema), uploadFilesHandler);
  router.post('/bulk-delete', write, validation(schemas.bulkDeleteSchema), bulkDeleteFilesHandler);
  router.post('/bulk-access', write, validation(schemas.bulkAccessSchema), bulkAccessHandler);
  router.get(`/${refParam}`, getFileHandler);
  router.get(`/${refParam}/content`, fileContentHandler);
  router.patch(`/${refParam}`, write, validation(schemas.updateFileSchema), updateFileHandler);
  router.delete(`/${refParam}`, write, deleteFileHandler);
  router.post(`/${refParam}/signed-url`, validation(schemas.signedLinkSchema), signedLinkHandler);
  return router;
}
