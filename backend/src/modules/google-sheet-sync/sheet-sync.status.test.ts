import { buildBatchSheetStatus } from './sheet-sync.status';

describe('buildBatchSheetStatus', () => {
    it('maps batch sheet states for status polling', () => {
        const status = buildBatchSheetStatus([
            { sheet: 'Resource', status: 'SUCCESS' },
            { sheet: 'Project', status: 'RUNNING' },
            { sheet: 'Project_Allocation', status: 'PENDING' },
        ]);

        expect(status).toEqual({
            Resource: 'SUCCESS',
            Project: 'RUNNING',
            Project_Allocation: 'PENDING',
        });
    });

    it('defaults missing sheets to PENDING', () => {
        const status = buildBatchSheetStatus([]);
        expect(status.Resource).toBe('PENDING');
        expect(status.Project).toBe('PENDING');
        expect(status.Project_Allocation).toBe('PENDING');
    });
});
