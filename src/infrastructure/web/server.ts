import express from 'express';
import cors from 'cors';
import { createRoutes } from './routes';
import { SearchController } from '../../application/SearchController';

export class WebServer {
  private app: express.Application;
  
  constructor(private searchController: SearchController, private port: number = 3000) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  private setupRoutes(): void {
    this.app.use('/api', createRoutes(this.searchController));
    
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`Server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }
}
