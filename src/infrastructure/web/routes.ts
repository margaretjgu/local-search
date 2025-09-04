import { Router } from 'express';
import { SearchController } from '../../application/SearchController';

export function createRoutes(searchController: SearchController): Router {
  const router = Router();

  // API info endpoint
  router.get('/', (req, res) => {
    res.json({
      name: 'Local File Search API',
      version: '1.0.0',
      endpoints: {
        'GET /api/search': 'Search files (query params: q, type, extensions, limit, offset)',
        'GET /api/files/:id': 'Get file details by ID',
        'DELETE /api/files/:id': 'Remove file from index',
        'POST /api/index': 'Index a directory (body: {path})',
        'POST /api/index/reset': 'Reset the entire index',
        'POST /api/watch/start': 'Start watching directory (body: {path})',
        'POST /api/watch/stop': 'Stop watching directories'
      },
      examples: {
        search: '/api/search?q=medical%20documents&type=hybrid&limit=10',
        indexDirectory: 'POST /api/index with body: {"path": "/Users/username/Documents"}'
      }
    });
  });

  router.get('/search', (req, res) => searchController.search(req, res));
  router.get('/files/:id', (req, res) => searchController.getFile(req, res));
  router.delete('/files/:id', (req, res) => searchController.deleteFile(req, res));
  
  router.post('/index', (req, res) => searchController.indexDirectory(req, res));
  router.post('/index/reset', (req, res) => searchController.resetIndex(req, res));
  
  router.post('/watch/start', (req, res) => searchController.startWatching(req, res));
  router.post('/watch/stop', (req, res) => searchController.stopWatching(req, res));

  return router;
}
