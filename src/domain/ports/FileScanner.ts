import { FileEntity } from '../entities/File';

export interface FileScanner {
  scanDirectory(path: string): Promise<FileEntity[]>;
  extractContent(filePath: string): Promise<string>;
  watchDirectory(path: string, callback: (file: FileEntity, action: 'added' | 'modified' | 'deleted') => void): void;
  stopWatching(): void;
}
