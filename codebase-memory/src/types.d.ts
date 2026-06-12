export interface FileNode {
    type: 'file';
    id: string;
    path: string;
    hash: string;
    content?: string;
}
export interface FunctionNode {
    type: 'function';
    id: string;
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
    methods: string[];
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
export declare function generateFileHash(filePath: string): string;
//# sourceMappingURL=types.d.ts.map