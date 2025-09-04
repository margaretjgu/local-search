import { FileScanner } from '../../domain/ports/FileScanner';
import { FileEntity } from '../../domain/entities/File';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import chokidar from 'chokidar';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class LocalFileScanner implements FileScanner {
  private watcher?: chokidar.FSWatcher;
  private readonly supportedExtensions = new Set([
    '.txt', '.md', '.pdf', '.doc', '.docx', '.json', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h'
  ]);

  async scanDirectory(directoryPath: string): Promise<FileEntity[]> {
    const files: FileEntity[] = [];
    
    const scanRecursive = async (currentPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scanRecursive(fullPath);
          } else if (entry.isFile()) {
            const extension = path.extname(entry.name).toLowerCase();
            if (this.supportedExtensions.has(extension)) {
              const stats = await fs.stat(fullPath);
              const file: FileEntity = {
                id: this.generateFileId(fullPath),
                name: entry.name,
                path: fullPath,
                extension,
                size: stats.size,
                modifiedAt: stats.mtime
              };
              files.push(file);
            }
          }
        }
      } catch (error) {
        console.warn(`Error scanning directory ${currentPath}:`, error);
      }
    };

    await scanRecursive(directoryPath);
    return files;
  }

  async extractContent(filePath: string): Promise<string> {
    const extension = path.extname(filePath).toLowerCase();
    
    try {
      switch (extension) {
        case '.pdf':
          return await this.extractPdfContent(filePath);
        case '.doc':
        case '.docx':
          return await this.extractDocContent(filePath);
        case '.txt':
        case '.md':
        case '.js':
        case '.ts':
        case '.py':
        case '.java':
        case '.cpp':
        case '.c':
        case '.h':
        case '.json':
          return await this.extractTextContent(filePath);
        default:
          return '';
      }
    } catch (error) {
      console.warn(`Could not extract content from ${filePath}:`, error);
      return '';
    }
  }

  watchDirectory(
    directoryPath: string, 
    callback: (file: FileEntity, action: 'added' | 'modified' | 'deleted') => void
  ): void {
    this.watcher = chokidar.watch(directoryPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('add', async (filePath) => {
        if (this.isSupported(filePath)) {
          const file = await this.createFileEntity(filePath);
          callback(file, 'added');
        }
      })
      .on('change', async (filePath) => {
        if (this.isSupported(filePath)) {
          const file = await this.createFileEntity(filePath);
          callback(file, 'modified');
        }
      })
      .on('unlink', (filePath) => {
        if (this.isSupported(filePath)) {
          const file: FileEntity = {
            id: this.generateFileId(filePath),
            name: path.basename(filePath),
            path: filePath,
            extension: path.extname(filePath).toLowerCase(),
            size: 0,
            modifiedAt: new Date()
          };
          callback(file, 'deleted');
        }
      });
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }

  private async createFileEntity(filePath: string): Promise<FileEntity> {
    const stats = await fs.stat(filePath);
    return {
      id: this.generateFileId(filePath),
      name: path.basename(filePath),
      path: filePath,
      extension: path.extname(filePath).toLowerCase(),
      size: stats.size,
      modifiedAt: stats.mtime
    };
  }

  private generateFileId(filePath: string): string {
    return crypto.createHash('md5').update(filePath).digest('hex');
  }

  private isSupported(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.has(extension);
  }

  private async extractTextContent(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.slice(0, 50000); // Limit content size
  }

  private async extractPdfContent(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text.slice(0, 50000);
  }

  private async extractDocContent(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value.slice(0, 50000);
  }
}
