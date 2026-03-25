import chokidar from 'chokidar';
import { CodeIndexer } from './indexer';
import { MemoryStore } from './store';
import * as path from 'path';

export class WatcherDaemon {
  private indexer: CodeIndexer;
  private store: MemoryStore;
  private rootDirs: string[];
  
  constructor(store: MemoryStore, indexer: CodeIndexer, rootDirs: string[]) {
    this.store = store;
    this.indexer = indexer;
    this.rootDirs = rootDirs;
  }

  start() {
    console.log(`\n[Codebase Memory System] Starting file watcher daemon on:`);
    this.rootDirs.forEach(dir => console.log(`  - ${dir}`));
    
    // Ignore heavy non-code paths
    const ignoredPaths = [
       '**/node_modules/**', 
       '**/dist/**', 
       '**/.git/**', 
       '**/*.sqlite',
       '**/*.sqlite-journal'
    ];

    const watcher = chokidar.watch(this.rootDirs, {
      ignored: ignoredPaths,
      persistent: true,
      ignoreInitial: true // We assume the initial index is complete or we handle it separately
    });

    const handleChange = async (filePath: string) => {
        if (!filePath.match(/\.(ts|js|tsx|jsx|py)$/)) return;
        
        console.log(`[Codebase Action] File modified: ${filePath}`);
        try {
            await this.indexer.indexFile(filePath);
            await this.store.saveGraph(this.indexer.graph);
            console.log(`[Codebase Memory] Live Index Updated: ${path.basename(filePath)}`);
        } catch (e) {
            console.error(`[Codebase Memory Error] Failed to incremental-index ${filePath}`, e);
        }
    };

    watcher
      .on('add', handleChange)
      .on('change', handleChange)
      .on('error', error => console.log(`Watcher error: ${error}`));
      
    // Ideally we should handle 'unlink' to delete nodes, but overriding them on UPSERT suffices for changes
  }
}
