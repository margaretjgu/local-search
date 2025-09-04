import { Client } from '@elastic/elasticsearch';

export interface ElasticsearchConfig {
  node: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

export class ElasticsearchClient {
  private client: Client;
  private readonly indexName = 'local-files';

  constructor(config: ElasticsearchConfig) {
    const clientConfig: any = { node: config.node };

    if (config.apiKey) {
      clientConfig.auth = {
        apiKey: config.apiKey
      };
    } else if (config.username && config.password) {
      clientConfig.auth = {
        username: config.username,
        password: config.password
      };
    }

    // Accept self-signed certificates for local development
    if (config.node.includes('localhost') || config.node.includes('127.0.0.1')) {
      clientConfig.tls = {
        rejectUnauthorized: false
      };
      clientConfig.ssl = {
        rejectUnauthorized: false
      };
    }

    this.client = new Client(clientConfig);
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async createIndex(): Promise<void> {
    await this.client.indices.create({
      index: this.indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              content_analyzer: {
                type: 'standard',
                stopwords: '_english_'
              }
            }
          }
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: { 
              type: 'text',
              analyzer: 'content_analyzer',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            path: { type: 'keyword' },
            extension: { type: 'keyword' },
            size: { type: 'long' },
            modifiedAt: { type: 'date' },
            content: { 
              type: 'text',
              analyzer: 'content_analyzer'
            },
            metadata: { type: 'object' }
          }
        }
      }
    });
  }

  async deleteIndex(): Promise<void> {
    try {
      await this.client.indices.delete({ index: this.indexName });
    } catch (error: any) {
      if (error.meta?.statusCode !== 404) {
        throw error;
      }
    }
  }

  async indexExists(): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index: this.indexName });
      return response;
    } catch {
      return false;
    }
  }

  getClient(): Client {
    return this.client;
  }

  getIndexName(): string {
    return this.indexName;
  }
}
