"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const types_1 = require("./types");
class MemoryStore {
    db;
    constructor(dbPath = 'memory.sqlite') {
        this.db = new sqlite3_1.default.Database(dbPath);
        this.initSchema();
    }
    initSchema() {
        this.db.serialize(() => {
            this.db.run(`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          path TEXT,
          hash TEXT
        )
      `);
            this.db.run(`
        CREATE TABLE IF NOT EXISTS functions (
          id TEXT PRIMARY KEY,
          file_id TEXT,
          name TEXT,
          params TEXT,
          start_line INTEGER,
          end_line INTEGER,
          code TEXT,
          FOREIGN KEY(file_id) REFERENCES files(id)
        )
      `);
            this.db.run(`
        CREATE TABLE IF NOT EXISTS edges (
          source TEXT,
          target TEXT,
          relation TEXT
        )
      `);
        });
    }
    async saveGraph(graph) {
        this.db.serialize(() => {
            this.db.run('BEGIN TRANSACTION');
            // Clear existing data (in a robust version, we'd UPSERT only deltas)
            this.db.run('DELETE FROM functions');
            this.db.run('DELETE FROM files');
            this.db.run('DELETE FROM edges');
            const fileStmt = this.db.prepare('INSERT INTO files (id, path, hash) VALUES (?, ?, ?)');
            for (const file of Object.values(graph.files)) {
                fileStmt.run(file.id, file.path, file.hash);
            }
            fileStmt.finalize();
            const fnStmt = this.db.prepare('INSERT INTO functions (id, file_id, name, params, start_line, end_line, code) VALUES (?, ?, ?, ?, ?, ?, ?)');
            for (const fn of Object.values(graph.functions)) {
                fnStmt.run(fn.id, fn.file_id, fn.name, JSON.stringify(fn.params), fn.start_line, fn.end_line, fn.code);
            }
            fnStmt.finalize();
            const edgeStmt = this.db.prepare('INSERT INTO edges (source, target, relation) VALUES (?, ?, ?)');
            for (const edge of graph.edges) {
                edgeStmt.run(edge.source, edge.target, edge.relation);
            }
            edgeStmt.finalize();
            this.db.run('COMMIT');
        });
    }
    // QUERY ENGINE DETERMINISTIC METHODS -> LLMS READ JSON NOT RAW FILES
    async findFunction(name) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM functions WHERE name = ?', [name], (err, rows) => {
                if (err)
                    reject(err);
                resolve(rows.map(r => ({
                    ...r,
                    type: 'function',
                    params: JSON.parse(r.params)
                })));
            });
        });
    }
    async findDependencies(fileId) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT target FROM edges WHERE source = ? AND relation = "IMPORTS"', [fileId], (err, rows) => {
                if (err)
                    reject(err);
                resolve(rows.map(r => r.target));
            });
        });
    }
    async traceCallPath(functionName) {
        // Finds everything this function CALLS (forward trace)
        return new Promise((resolve, reject) => {
            this.db.all('SELECT target FROM edges WHERE relation = "CALLS" AND source IN (SELECT id FROM functions WHERE name = ?)', [functionName], (err, rows) => {
                if (err)
                    reject(err);
                resolve(rows.map(r => r.target));
            });
        });
    }
    async impactAnalysis(functionName) {
        // Reverse trace: finds who calls this function
        return new Promise((resolve, reject) => {
            this.db.all(`
        SELECT DISTINCT functions.name as caller 
        FROM edges 
        JOIN functions ON edges.source = functions.id OR edges.source = functions.file_id
        WHERE edges.target = ? AND relation = "CALLS"`, [functionName], (err, rows) => {
                if (err)
                    reject(err);
                resolve(rows.map(r => r.caller));
            });
        });
    }
    async searchKeyword(keyword) {
        return new Promise((resolve, reject) => {
            const query = `%${keyword}%`;
            this.db.all('SELECT * FROM functions WHERE name LIKE ? OR code LIKE ?', [query, query], (err, rows) => {
                if (err)
                    reject(err);
                resolve(rows.map(r => ({
                    ...r,
                    type: 'function',
                    params: JSON.parse(r.params)
                })));
            });
        });
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=store.js.map