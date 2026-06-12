import { MemoryGraph, FunctionNode } from './types';
export declare class MemoryStore {
    private db;
    constructor(dbPath?: string);
    private initSchema;
    saveGraph(graph: MemoryGraph): Promise<void>;
    findFunction(name: string): Promise<FunctionNode[]>;
    findDependencies(fileId: string): Promise<string[]>;
    traceCallPath(functionName: string): Promise<string[]>;
    impactAnalysis(functionName: string): Promise<string[]>;
    searchKeyword(keyword: string): Promise<FunctionNode[]>;
}
//# sourceMappingURL=store.d.ts.map