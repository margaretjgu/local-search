import { FileRepository } from '../../domain/ports/FileRepository';
import { FileEntity, SearchQuery, SearchResult } from '../../domain/entities/File';
import { ElasticsearchClient } from './ElasticsearchClient';

export class ElasticsearchFileRepository implements FileRepository {
  constructor(private esClient: ElasticsearchClient) {}

  async indexFile(file: FileEntity): Promise<void> {
    await this.esClient.getClient().index({
      index: this.esClient.getIndexName(),
      id: file.id,
      body: file
    });
  }

  async updateFile(file: FileEntity): Promise<void> {
    await this.indexFile(file);
  }

  async deleteFile(id: string): Promise<void> {
    try {
      await this.esClient.getClient().delete({
        index: this.esClient.getIndexName(),
        id
      });
    } catch (error: any) {
      if (error.meta?.statusCode !== 404) {
        throw error;
      }
    }
  }

  async getFile(id: string): Promise<FileEntity | null> {
    try {
      const response = await this.esClient.getClient().get({
        index: this.esClient.getIndexName(),
        id
      });
      return response._source as FileEntity;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const searchBody = this.buildSearchQuery(query);
    
    const response = await this.esClient.getClient().search({
      index: this.esClient.getIndexName(),
      body: searchBody,
      size: query.limit || 20,
      from: query.offset || 0
    });

    return response.hits.hits.map((hit: any) => ({
      file: hit._source as FileEntity,
      score: hit._score || 0,
      highlights: hit.highlight ? Object.values(hit.highlight).flat().map(String) : undefined
    }));
  }

  async indexExists(): Promise<boolean> {
    return this.esClient.indexExists();
  }

  async createIndex(): Promise<void> {
    await this.esClient.createIndex();
  }

  async deleteIndex(): Promise<void> {
    await this.esClient.deleteIndex();
  }

  private buildSearchQuery(query: SearchQuery): any {
    const must: any[] = [];
    const filter: any[] = [];

    switch (query.searchType) {
      case 'semantic':
        must.push({
          multi_match: {
            query: query.query,
            fields: ['name^2', 'content'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
        break;
      
      case 'lexical':
        must.push({
          multi_match: {
            query: query.query,
            fields: ['name^2', 'content'],
            type: 'phrase_prefix'
          }
        });
        break;
      
      case 'hybrid':
        must.push({
          bool: {
            should: [
              {
                multi_match: {
                  query: query.query,
                  fields: ['name^3', 'content'],
                  type: 'best_fields',
                  fuzziness: 'AUTO',
                  boost: 1.2
                }
              },
              {
                multi_match: {
                  query: query.query,
                  fields: ['name^2', 'content'],
                  type: 'phrase_prefix',
                  boost: 0.8
                }
              }
            ]
          }
        });
        break;
    }

    if (query.filters?.extensions?.length) {
      filter.push({
        terms: { extension: query.filters.extensions }
      });
    }

    if (query.filters?.modifiedAfter) {
      filter.push({
        range: { modifiedAt: { gte: query.filters.modifiedAfter } }
      });
    }

    if (query.filters?.modifiedBefore) {
      filter.push({
        range: { modifiedAt: { lte: query.filters.modifiedBefore } }
      });
    }

    return {
      query: {
        bool: {
          must,
          filter
        }
      },
      highlight: {
        fields: {
          name: { number_of_fragments: 1 },
          content: { 
            number_of_fragments: 3,
            fragment_size: 150
          }
        }
      },
      sort: [
        { _score: { order: 'desc' } },
        { modifiedAt: { order: 'desc' } }
      ]
    };
  }
}
