import sqlite3 from 'sqlite3';
import { MemoryGraph, FileNode, FunctionNode, ClassNode } from './types';

export class MemoryStore {
  private db: sqlite3.Database;

  constructor(dbPath: string = 'memory.sqlite') {
    this.db = new sqlite3.Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
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

  async saveGraph(graph: MemoryGraph): Promise<void> {
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

  async findFunction(name: string): Promise<FunctionNode[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM functions WHERE name = ?', [name], (err, rows: any[]) => {
        if (err) reject(err);
        resolve(rows.map(r => ({
           ...r,
           type: 'function',
           params: JSON.parse(r.params)
        })));
      });
    });
  }

  async findDependencies(fileId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT target FROM edges WHERE source = ? AND relation = "IMPORTS"', [fileId], (err, rows: any[]) => {
        if (err) reject(err);
        resolve(rows.map(r => r.target));
      });
    });
  }

  async traceCallPath(functionName: string): Promise<string[]> {
    // Finds everything this function CALLS (forward trace)
    return new Promise((resolve, reject) => {
      this.db.all('SELECT target FROM edges WHERE relation = "CALLS" AND source IN (SELECT id FROM functions WHERE name = ?)', [functionName], (err, rows: any[]) => {
        if (err) reject(err);
        resolve(rows.map(r => r.target));
      });
    });
  }

  async impactAnalysis(functionName: string): Promise<string[]> {
    // Reverse trace: finds who calls this function
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT DISTINCT functions.name as caller 
        FROM edges 
        JOIN functions ON edges.source = functions.id OR edges.source = functions.file_id
        WHERE edges.target = ? AND relation = "CALLS"`, 
      [functionName], (err, rows: any[]) => {
        if (err) reject(err);
        resolve(rows.map(r => r.caller));
      });
    });
  }

  async searchKeyword(keyword: string): Promise<FunctionNode[]> {
     return new Promise((resolve, reject) => {
        const query = `%${keyword}%`;
        this.db.all('SELECT * FROM functions WHERE name LIKE ? OR code LIKE ?', [query, query], (err, rows: any[]) => {
           if (err) reject(err);
           resolve(rows.map(r => ({
               ...r,
               type: 'function',
               params: JSON.parse(r.params)
           })));
        });
     });
  }
}
