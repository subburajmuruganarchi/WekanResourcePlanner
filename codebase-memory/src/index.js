"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const scanner_1 = require("./scanner");
const indexer_1 = require("./indexer");
const store_1 = require("./store");
const controller_1 = require("./controller");
const path = __importStar(require("path"));
async function bootstrap() {
    console.log('--- INITIALIZING CODEBASE MEMORY SYSTEM ---');
    // 1. Initialize Stores & Indexers
    const store = new store_1.MemoryStore('local_memory.sqlite');
    const indexer = new indexer_1.CodeIndexer();
    await indexer.init(); // Requires WASM
    // 2. Scan Directory
    const repoPath = process.argv[2] || path.join(__dirname, '../..');
    console.log(`Scanning Repo: ${repoPath}`);
    const scanner = new scanner_1.FileScanner(repoPath);
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
    const controller = new controller_1.Controller(store);
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
//# sourceMappingURL=index.js.map