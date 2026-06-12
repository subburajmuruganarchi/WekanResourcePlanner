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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeIndexer = void 0;
const web_tree_sitter_1 = __importDefault(require("web-tree-sitter"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
class CodeIndexer {
    parser = null;
    langTs = null;
    graph = { files: {}, functions: {}, classes: {}, edges: [] };
    async init() {
        await web_tree_sitter_1.default.init();
        this.parser = new web_tree_sitter_1.default();
        // In a real production setup, we'd load the .wasm files from a local copy.
        // Assuming the .wasm file is available in the run directory.
        // For now, we'll configure the basic structure to load it.
        try {
            // NOTE: User must run `npx tree-sitter build --wasm` or copy tree-sitter-typescript.wasm
            const wasmPath = path.join(__dirname, '../tree-sitter-typescript.wasm');
            if (fs.existsSync(wasmPath)) {
                this.langTs = await web_tree_sitter_1.default.Language.load(wasmPath);
                this.parser.setLanguage(this.langTs);
            }
            else {
                console.warn(`WASM not found at ${wasmPath}. Please place the appropriate tree-sitter WASM file.`);
            }
        }
        catch (e) {
            console.error('Failed to load tree-sitter language:', e);
        }
    }
    async indexFile(filePath) {
        if (!this.parser || !this.langTs) {
            throw new Error("Parser not initialized");
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const hash = (0, types_1.generateFileHash)(filePath);
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
    extractNodes(root, fileId, content) {
        // Basic traversal for TypeScript/JavaScript
        // A robust implementation uses tree-sitter query languages, but we can do recursive walks
        const walk = (node) => {
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
                walk(node.child(i));
            }
        };
        walk(root);
    }
}
exports.CodeIndexer = CodeIndexer;
//# sourceMappingURL=indexer.js.map