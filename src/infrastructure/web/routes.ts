import { Router } from 'express';
import { SearchController } from '../../application/SearchController';

export function createRoutes(searchController: SearchController): Router {
  const router = Router();

  router.get('/search', (req, res) => searchController.search(req, res));
  router.get('/files/:id', (req, res) => searchController.getFile(req, res));
  router.delete('/files/:id', (req, res) => searchController.deleteFile(req, res));
  
  router.post('/index', (req, res) => searchController.indexDirectory(req, res));
  router.post('/index/reset', (req, res) => searchController.resetIndex(req, res));
  
  router.post('/watch/start', (req, res) => searchController.startWatching(req, res));
  router.post('/watch/stop', (req, res) => searchController.stopWatching(req, res));

  return router;
}
