import { FileScanner } from './scanner';
import { CodeIndexer } from './indexer';
import { MemoryStore } from './store';
import { Controller } from './controller';
import * as path from 'path';

async function bootstrap() {
    console.log('--- INITIALIZING CODEBASE MEMORY SYSTEM ---');
    
    // 1. Initialize Stores & Indexers
    const store = new MemoryStore('local_memory.sqlite');
    const indexer = new CodeIndexer();
    await indexer.init(); // Requires WASM

    // 2. Scan Directory
    const repoPath = process.argv[2] || path.join(__dirname, '../..');
    console.log(`Scanning Repo: ${repoPath}`);
    const scanner = new FileScanner(repoPath);
    const files = scanner.scan();
    console.log(`Found ${files.length} valid source files to index.`);

    // 3. Populate Index (Offline process)
    // Note: To make this script run properly without errors, you'd need the WASM file
    /* 
    for (const file of files) {
        try {
            await indexer.indexFile(file);
        } catch (e) {
            console.error(`Failed to index ${file}`, e);
        }
    }
    await store.saveGraph(indexer.graph);
    console.log('Indexing Complete & Saved to Memory.');
    */

    // 4. Test Controller
    const controller = new Controller(store);
    
    // Mocking some data for the sake of the test script without running full AST pass
    store['db'].serialize(() => {    
      store['db'].run(`INSERT OR IGNORE INTO files (id, path, hash) VALUES ('src/auth.ts', 'src/auth.ts', 'hash123')`);
      store['db'].run(`INSERT OR IGNORE INTO functions (id, file_id, name, params, start_line, end_line, code) VALUES ('src/auth.ts::login', 'src/auth.ts', 'login', '["username", "password"]', 10, 20, 'function login(u, p) { return true; }')`);
      store['db'].run(`INSERT OR IGNORE INTO functions (id, file_id, name, params, start_line, end_line, code) VALUES ('src/auth.ts::verifyToken', 'src/auth.ts', 'verifyToken', '["token"]', 22, 30, 'function verifyToken(t) { return isValid; }')`);
      store['db'].run(`INSERT OR IGNORE INTO edges (source, target, relation) VALUES ('src/auth.ts::login', 'src/auth.ts::verifyToken', 'CALLS')`);
    });

    // Emulate CLI Queries
    const testCases = [
       "Where is the login function defined and what are its parameters?",
       "What functions are called by login?",
       "Who depends on the login functionality?"
    ];

    console.log('\n--- RUNNING QUERIES ---');
    for (const query of testCases) {
       console.log(`\n\nQuery: ${query}`);
       // NOTE: Since OPENAI_API_KEY isn't actually set here, it will gracefully fallback 
       // to keyword search and return the raw string formatting error
       const result = await controller.executeQuery(query);
       console.log(`Result:\n${result}`);
    }
}

bootstrap().catch(console.error);
