import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface FileNode {
  type: 'file';
  id: string; // Absolute path
  path: string;
  hash: string;
  content?: string;
}

export interface FunctionNode {
  type: 'function';
  id: string; // e.g., "src/auth.ts::login"
  file_id: string;
  name: string;
  params: string[];
  start_line: number;
  end_line: number;
  docstring?: string;
  code?: string;
}

export interface ClassNode {
  type: 'class';
  id: string;
  file_id: string;
  name: string;
  methods: string[]; // Method IDs
  start_line: number;
  end_line: number;
  docstring?: string;
}

export interface Edge {
  source: string;
  target: string;
  relation: 'CALLS' | 'IMPORTS' | 'DEFINES';
}

export interface MemoryGraph {
  files: Record<string, FileNode>;
  functions: Record<string, FunctionNode>;
  classes: Record<string, ClassNode>;
  edges: Edge[];
}

export function generateFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}
