import { FileEntity, SearchQuery, SearchResult } from '../entities/File';

export interface FileRepository {
  indexFile(file: FileEntity): Promise<void>;
  updateFile(file: FileEntity): Promise<void>;
  deleteFile(id: string): Promise<void>;
  getFile(id: string): Promise<FileEntity | null>;
  search(query: SearchQuery): Promise<SearchResult[]>;
  indexExists(): Promise<boolean>;
  createIndex(): Promise<void>;
  deleteIndex(): Promise<void>;
}
