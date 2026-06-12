const Parser = require('web-tree-sitter').default || require('web-tree-sitter') || require('web-tree-sitter').Parser;
import * as fs from 'fs';
import * as path from 'path';
import { MemoryGraph, FileNode, FunctionNode, ClassNode, Edge, generateFileHash } from './types';

export class CodeIndexer {
  private parser: any; // Fallback type due to CJS import restrictions
  private langTs: any;
  public graph: MemoryGraph = { files: {}, functions: {}, classes: {}, edges: [] };

  async init() {
    try {
      if (typeof Parser === 'function' && typeof Parser.init === 'function') {
         await Parser.init();
         this.parser = new Parser();
      } else if (Parser.default && typeof Parser.default.init === 'function') {
         await Parser.default.init();
         this.parser = new Parser.default();
      } else {
         throw new Error("Cannot find Parser.init");
      }
    } catch(e) {
       console.log("Parser init error:", e);
    }
    
    // In a real production setup, we'd load the .wasm files from a local copy.
    // Assuming the .wasm file is available in the run directory.
    // For now, we'll configure the basic structure to load it.
    try {
      // NOTE: User must run `npx tree-sitter build --wasm` or copy tree-sitter-typescript.wasm
      const wasmPath = path.join(__dirname, '../tree-sitter-typescript.wasm');
      if (fs.existsSync(wasmPath)) {
         this.langTs = await Parser.Language.load(wasmPath);
         this.parser.setLanguage(this.langTs);
      } else {
         console.warn(`WASM not found at ${wasmPath}. Please place the appropriate tree-sitter WASM file.`);
      }
    } catch (e) {
      console.error('Failed to load tree-sitter language:', e);
    }
  }

  async indexFile(filePath: string) {
    if (!this.parser || !this.langTs) {
        throw new Error("Parser not initialized");
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const hash = generateFileHash(filePath);

    // Skip if unchanged
    if (this.graph.files[filePath] && this.graph.files[filePath].hash === hash) {
      return;
    }

    // Add/Update File Node
    this.graph.files[filePath] = {
      type: 'file',
      id: filePath,
      path: filePath,
      hash,
    };

    const tree = this.parser.parse(content);
    
    // Extract functions, classes, imports
    this.extractNodes(tree.rootNode, filePath, content);
  }

  private extractNodes(root: any, fileId: string, content: string) {
    // Basic traversal for TypeScript/JavaScript
    // A robust implementation uses tree-sitter query languages, but we can do recursive walks
    
    const walk = (node: any) => {
      // Functions
      if (node.type === 'function_declaration' || node.type === 'method_definition') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const fnName = nameNode.text;
          const fnId = `${fileId}::${fnName}`;
          
          this.graph.functions[fnId] = {
            type: 'function',
            id: fnId,
            file_id: fileId,
            name: fnName,
            params: [], // Naive for now, would extract parameter nodes
            start_line: node.startPosition.row,
            end_line: node.endPosition.row,
            code: content.slice(node.startIndex, node.endIndex)
          };
        }
      }

      // Classes
      if (node.type === 'class_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const className = nameNode.text;
          const classId = `${fileId}::${className}`;
          
          this.graph.classes[classId] = {
             type: 'class',
             id: classId,
             file_id: fileId,
             name: className,
             methods: [],
             start_line: node.startPosition.row,
             end_line: node.endPosition.row
          };
        }
      }

      // Imports (Edge extraction)
      if (node.type === 'import_statement') {
         const sourceNode = node.childForFieldName('source');
         if (sourceNode) {
            const importPath = sourceNode.text.replace(/['"]/g, '');
            this.graph.edges.push({
               source: fileId,
               target: importPath, // Normally we'd resolve this to an absolute path
               relation: 'IMPORTS'
            });
         }
      }

      // Function calls (Edge extraction)
      if (node.type === 'call_expression') {
          const fnNode = node.childForFieldName('function');
          if (fnNode) {
             const callerId = fileId; // A complete implementation resolves the enclosing function scope
             this.graph.edges.push({
                 source: callerId,
                 target: fnNode.text,
                 relation: 'CALLS'
             });
          }
      }

      for (let i = 0; i < node.childCount; i++) {
        walk(node.child(i)!);
      }
    };

    walk(root);
  }
}
