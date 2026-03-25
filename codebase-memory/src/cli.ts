#!/usr/bin/env node
import { Command } from 'commander';
import { MemoryStore } from './store';
import { CodeIndexer } from './indexer';
import { FileScanner } from './scanner';
import { Controller } from './controller';
import { WatcherDaemon } from './watcher';
import * as path from 'path';

const program = new Command();
program
  .name('r360-memory')
  .description('Universal Codebase Memory System CLI for LLMs and Developers')
  .version('1.0.0');

// Shared directory configuration
const DEFAULT_DIRS = [
  path.resolve(__dirname, '../../backend'),
  path.resolve(__dirname, '../../app')
];
const DB_PATH = path.resolve(__dirname, '../local_memory.sqlite');

program
  .command('index')
  .description('Perform a full offline AST indexing of the repository')
  .action(async () => {
    console.log('[Codebase Memory] Starting full index...');
    const store = new MemoryStore(DB_PATH);
    const indexer = new CodeIndexer();
    await indexer.init();

    // Resetting for a full index
    indexer.graph.files = {};
    indexer.graph.functions = {};
    indexer.graph.classes = {};
    indexer.graph.edges = [];

    for (const dir of DEFAULT_DIRS) {
      console.log(`Scanning: ${dir}`);
      const scanner = new FileScanner(dir);
      const files = scanner.scan();
      for (const file of files) {
        try {
           await indexer.indexFile(file);
        } catch(e) { /* ignore */ }
      }
    }

    await store.saveGraph(indexer.graph);
    console.log('[Codebase Memory] Indexing complete and saved to SQLite.');
  });

program
  .command('watch')
  .description('Start the background file watcher to incrementally update memory')
  .action(async () => {
    const store = new MemoryStore(DB_PATH);
    const indexer = new CodeIndexer();
    await indexer.init();

    const daemon = new WatcherDaemon(store, indexer, DEFAULT_DIRS);
    daemon.start();
  });

program
  .command('query')
  .description('Query the codebase memory system deterministically (JSON context)')
  .argument('<text>', 'The question or intent to query')
  .action(async (text) => {
    // LLMs run this command. It suppresses logs and just outputs JSON context.
    const store = new MemoryStore(DB_PATH);
    const controller = new Controller(store);
    
    // We modify controller.execute to return exactly what the LLM needs
    const answer = await controller.executeQuery(text);
    console.log(answer);
  });

program.parse(process.argv);
