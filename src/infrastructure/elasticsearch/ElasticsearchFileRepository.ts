import { FileRepository } from '../../domain/ports/FileRepository';
import { FileEntity, SearchQuery, SearchResult } from '../../domain/entities/File';
import { ElasticsearchClient } from './ElasticsearchClient';

// this class handles all the elasticsearch operations for our file search
// think of it as a translator between our app and elasticsearch
export class ElasticsearchFileRepository implements FileRepository {
  constructor(private esClient: ElasticsearchClient) {}

  async indexFile(file: FileEntity): Promise<void> {
    // this adds a file to elasticsearch's index (like adding a book to a library catalog)
    // the .index() method either creates a new document or updates an existing one
    await this.esClient.getClient().index({
      index: this.esClient.getIndexName(), // which "database table" to use
      id: file.id,                         // unique identifier for this file
      body: file                           // the actual file data to store
    });
  }

  async updateFile(file: FileEntity): Promise<void> {
    // updating is the same as indexing in elasticsearch - it just overwrites the existing document
    await this.indexFile(file);
  }

  async deleteFile(id: string): Promise<void> {
    try {
      // removes a document from the index by its id (like removing a book from the library)
      await this.esClient.getClient().delete({
        index: this.esClient.getIndexName(), // which index to delete from
        id                                   // the document id to remove
      });
    } catch (error: any) {
      // if the file doesn't exist (404 error), that's fine - we wanted it gone anyway
      if (error.meta?.statusCode !== 404) {
        throw error;
      }
    }
  }

  async getFile(id: string): Promise<FileEntity | null> {
    try {
      // retrieves a single document by its id (like looking up a specific book)
      const response = await this.esClient.getClient().get({
        index: this.esClient.getIndexName(), // which index to search in
        id                                   // the document id we want
      });
      // _source contains the actual document data we stored
      return response._source as FileEntity;
    } catch (error: any) {
      // if file not found, return null instead of throwing an error
      if (error.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    // build the complex elasticsearch query based on what the user wants
    const searchBody = this.buildSearchQuery(query);
    
    // this is the main search method - like asking the librarian to find books matching your criteria
    const response = await this.esClient.getClient().search({
      index: this.esClient.getIndexName(), // which index to search in
      body: searchBody,                    // the search query (built below)
      size: query.limit || 20,             // how many results to return (pagination)
      from: query.offset || 0              // where to start from (for pagination)
    });

    // convert elasticsearch's response format into our app's format
    return response.hits.hits.map((hit: any) => ({
      file: hit._source as FileEntity,     // the actual file data
      score: hit._score || 0,              // relevance score (higher = better match)
      highlights: hit.highlight ? Object.values(hit.highlight).flat().map(String) : undefined // highlighted text snippets
    }));
  }

  async indexExists(): Promise<boolean> {
    // checks if our search index exists (like checking if a library catalog exists)
    return this.esClient.indexExists();
  }

  async createIndex(): Promise<void> {
    // creates a new index with our custom settings (like setting up a new library catalog)
    await this.esClient.createIndex();
  }

  async deleteIndex(): Promise<void> {
    // deletes the entire index and all its data (like burning down the library - use carefully!)
    await this.esClient.deleteIndex();
  }

  private buildSearchQuery(query: SearchQuery): any {
    // this builds the actual elasticsearch query - it's like writing instructions for a librarian
    const must: any[] = [];    // conditions that MUST match
    const filter: any[] = [];  // conditions to filter by (but don't affect scoring)

    switch (query.searchType) {
      case 'semantic':
        // semantic search = finding by meaning/context (like asking for "car stuff" and finding "automotive")
        must.push({
          multi_match: {
            query: query.query,         // what the user typed
            fields: ['name^2', 'content'], // search in filename (2x weight) and file content
            type: 'best_fields',        // find the best matching field for each document
            fuzziness: 'AUTO'           // allows typos/similar words (teh -> the)
          }
        });
        break;
      
      case 'lexical':
        // lexical search = exact word matching (like ctrl+f in a document)
        must.push({
          multi_match: {
            query: query.query,         // what the user typed
            fields: ['name^2', 'content'], // search in filename and content
            type: 'phrase_prefix'       // matches exact phrases and allows partial matches at the end
          }
        });
        break;
      
      case 'hybrid':
        // hybrid = combines both semantic and lexical search for best results
        must.push({
          bool: {
            should: [  // "should" means any of these can match (like OR)
              {
                multi_match: {
                  query: query.query,         // semantic search part
                  fields: ['name^3', 'content'], // filename gets 3x weight
                  type: 'best_fields',        // meaning-based matching
                  fuzziness: 'AUTO',          // handle typos
                  boost: 1.2                  // give this slightly higher importance
                }
              },
              {
                multi_match: {
                  query: query.query,         // lexical search part
                  fields: ['name^2', 'content'], // filename gets 2x weight
                  type: 'phrase_prefix',      // exact matching
                  boost: 0.8                  // slightly less important than semantic
                }
              }
            ]
          }
        });
        break;
    }

    // add filters - these don't affect scoring but narrow down results
    if (query.filters?.extensions?.length) {
      // only show files with these extensions (like filtering by file type)
      filter.push({
        terms: { extension: query.filters.extensions } // "terms" = match any of these values
      });
    }

    if (query.filters?.modifiedAfter) {
      // only show files modified after this date
      filter.push({
        range: { modifiedAt: { gte: query.filters.modifiedAfter } } // gte = greater than or equal
      });
    }

    if (query.filters?.modifiedBefore) {
      // only show files modified before this date
      filter.push({
        range: { modifiedAt: { lte: query.filters.modifiedBefore } } // lte = less than or equal
      });
    }

    // put it all together - this is the final query elasticsearch will execute
    return {
      query: {
        bool: {           // bool query lets us combine different conditions
          must,           // all conditions in here MUST match
          filter          // all conditions in here must match but don't affect scoring
        }
      },
      highlight: {        // tells elasticsearch to highlight matching text
        fields: {
          name: { number_of_fragments: 1 },    // highlight 1 piece of the filename
          content: { 
            number_of_fragments: 3,            // highlight up to 3 pieces of content
            fragment_size: 150                 // each piece should be ~150 characters
          }
        }
      },
      sort: [             // how to order the results
        { _score: { order: 'desc' } },        // best matches first
        { modifiedAt: { order: 'desc' } }     // then newest files first
      ]
    };
  }
}
