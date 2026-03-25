import { globSync } from 'glob';
import * as path from 'path';

export class FileScanner {
  private baseDir: string;
  private ignorePatterns: string[];

  constructor(baseDir: string, ignorePatterns: string[] = ['node_modules/**', 'dist/**', 'build/**', '.git/**']) {
    this.baseDir = baseDir;
    this.ignorePatterns = ignorePatterns;
  }

  scan(): string[] {
    const pattern = path.join(this.baseDir, '**/*.{ts,js,tsx,jsx,py}');
    
    // Glob uses forward slashes, even on Windows
    const normalizedPattern = pattern.replace(/\\/g, '/');
    
    const files = globSync(normalizedPattern, {
      ignore: this.ignorePatterns.map(p => path.join(this.baseDir, p).replace(/\\/g, '/')),
      absolute: true
    });
    
    return files;
  }
}
