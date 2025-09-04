import { FileEntity, SearchQuery, SearchResult } from '../entities/File';
import { FileRepository } from '../ports/FileRepository';
import { FileScanner } from '../ports/FileScanner';

export class SearchService {
  constructor(
    private fileRepository: FileRepository,
    private fileScanner: FileScanner
  ) {}

  async indexDirectory(directoryPath: string): Promise<void> {
    const files = await this.fileScanner.scanDirectory(directoryPath);
    
    for (const file of files) {
      try {
        file.content = await this.fileScanner.extractContent(file.path);
      } catch (error) {
        console.warn(`Could not extract content from ${file.path}:`, error);
      }
      
      await this.fileRepository.indexFile(file);
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    return this.fileRepository.search(query);
  }

  async getFile(id: string): Promise<FileEntity | null> {
    return this.fileRepository.getFile(id);
  }

  async deleteFile(id: string): Promise<void> {
    await this.fileRepository.deleteFile(id);
  }

  async updateFile(file: FileEntity): Promise<void> {
    await this.fileRepository.updateFile(file);
  }

  async initializeIndex(): Promise<void> {
    const exists = await this.fileRepository.indexExists();
    if (!exists) {
      await this.fileRepository.createIndex();
    }
  }

  async resetIndex(): Promise<void> {
    await this.fileRepository.deleteIndex();
    await this.fileRepository.createIndex();
  }

  startWatching(directoryPath: string): void {
    this.fileScanner.watchDirectory(directoryPath, async (file, action) => {
      try {
        switch (action) {
          case 'added':
          case 'modified':
            file.content = await this.fileScanner.extractContent(file.path);
            await this.fileRepository.indexFile(file);
            break;
          case 'deleted':
            await this.fileRepository.deleteFile(file.id);
            break;
        }
      } catch (error) {
        console.error(`Error handling file ${action}:`, error);
      }
    });
  }

  stopWatching(): void {
    this.fileScanner.stopWatching();
  }
}
