import { MemoryStore } from './store';
export declare class Controller {
    private store;
    private openai;
    constructor(store: MemoryStore);
    executeQuery(userQuery: string): Promise<string>;
}
//# sourceMappingURL=controller.d.ts.map