export interface FileEntity {
  id: string;
  name: string;
  path: string;
  extension: string;
  size: number;
  modifiedAt: Date;
  content?: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  file: FileEntity;
  score: number;
  highlights?: string[];
}

export interface SearchQuery {
  query: string;
  searchType: 'semantic' | 'lexical' | 'hybrid';
  filters?: {
    extensions?: string[];
    modifiedAfter?: Date;
    modifiedBefore?: Date;
  };
  limit?: number;
  offset?: number;
}
