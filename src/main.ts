import * as dotenv from 'dotenv';
import { ElasticsearchClient, ElasticsearchConfig } from './infrastructure/elasticsearch/ElasticsearchClient';
import { ElasticsearchFileRepository } from './infrastructure/elasticsearch/ElasticsearchFileRepository';
import { LocalFileScanner } from './infrastructure/filesystem/LocalFileScanner';
import { SearchService } from './domain/services/SearchService';
import { SearchController } from './application/SearchController';
import { WebServer } from './infrastructure/web/server';

dotenv.config();

async function main() {
  try {
    const esConfig: ElasticsearchConfig = {
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
      apiKey: process.env.ELASTICSEARCH_API_KEY
    };

    console.log(`Connecting to Elasticsearch at ${esConfig.node}...`);
    
    if (esConfig.apiKey) {
      console.log('Using API key auth');
    } else if (esConfig.username && esConfig.password) {
      console.log('Using username/password auth');
    } else {
      console.log('no authentication');
    }

    const esClient = new ElasticsearchClient(esConfig);
    
    const isConnected = await esClient.ping();
    if (!isConnected) {
      console.error('Cannot connect to elastic.');
      console.log('');
      console.log('Troubleshooting:');
      console.log('1. Ensure Elasticsearch is running: curl -fsSL https://elastic.co/start-local | sh');
      console.log('2. Check your .env file has correct credentials');
      console.log('3. Verify the ELASTICSEARCH_NODE URL is correct');
      process.exit(1);
    }
    console.log('Connected to Elasticsearch');

    const fileRepository = new ElasticsearchFileRepository(esClient);
    const fileScanner = new LocalFileScanner();
    const searchService = new SearchService(fileRepository, fileScanner);
    
    console.log('Initializing search index...');
    await searchService.initializeIndex();
    console.log('Search index ready');

    const searchController = new SearchController(searchService);
    const port = parseInt(process.env.PORT || '3000', 10);
    const webServer = new WebServer(searchController, port);

    await webServer.start();
    console.log('Local File Search application is running!');
    console.log(`UI: http://localhost:${port}`);
    console.log(`API: http://localhost:${port}/api`);
    
    process.on('SIGTERM', () => {
      console.log('Shutting down gracefully...');
      searchService.stopWatching();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('Shutting down gracefully...');
      searchService.stopWatching();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();
