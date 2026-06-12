import { MemoryGraph } from './types';
export declare class CodeIndexer {
    private parser;
    private langTs;
    graph: MemoryGraph;
    init(): Promise<void>;
    indexFile(filePath: string): Promise<void>;
    private extractNodes;
}
//# sourceMappingURL=indexer.d.ts.map