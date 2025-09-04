import { Request, Response } from 'express';
import { SearchService } from '../domain/services/SearchService';
import { SearchQuery } from '../domain/entities/File';

export class SearchController {
  constructor(private searchService: SearchService) {}

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { 
        q: query, 
        type = 'hybrid', 
        extensions, 
        modifiedAfter, 
        modifiedBefore,
        limit = 20,
        offset = 0
      } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query parameter "q" is required' });
        return;
      }

      const searchQuery: SearchQuery = {
        query,
        searchType: type as 'semantic' | 'lexical' | 'hybrid',
        limit: Number(limit),
        offset: Number(offset),
        filters: {}
      };

      if (extensions && typeof extensions === 'string') {
        searchQuery.filters!.extensions = extensions.split(',');
      }

      if (modifiedAfter && typeof modifiedAfter === 'string') {
        searchQuery.filters!.modifiedAfter = new Date(modifiedAfter);
      }

      if (modifiedBefore && typeof modifiedBefore === 'string') {
        searchQuery.filters!.modifiedBefore = new Date(modifiedBefore);
      }

      const results = await this.searchService.search(searchQuery);
      res.json({ results });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const file = await this.searchService.getFile(id);
      
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      res.json({ file });
    } catch (error) {
      console.error('Get file error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.searchService.deleteFile(id);
      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async indexDirectory(req: Request, res: Response): Promise<void> {
    try {
      const { path } = req.body;
      
      if (!path || typeof path !== 'string') {
        res.status(400).json({ error: 'Directory path is required' });
        return;
      }

      await this.searchService.indexDirectory(path);
      res.json({ message: 'Directory indexed successfully' });
    } catch (error) {
      console.error('Index directory error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async resetIndex(req: Request, res: Response): Promise<void> {
    try {
      await this.searchService.resetIndex();
      res.json({ message: 'Index reset successfully' });
    } catch (error) {
      console.error('Reset index error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async startWatching(req: Request, res: Response): Promise<void> {
    try {
      const { path } = req.body;
      
      if (!path || typeof path !== 'string') {
        res.status(400).json({ error: 'Directory path is required' });
        return;
      }

      this.searchService.startWatching(path);
      res.json({ message: 'Started watching directory' });
    } catch (error) {
      console.error('Start watching error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async stopWatching(req: Request, res: Response): Promise<void> {
    try {
      this.searchService.stopWatching();
      res.json({ message: 'Stopped watching directories' });
    } catch (error) {
      console.error('Stop watching error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
