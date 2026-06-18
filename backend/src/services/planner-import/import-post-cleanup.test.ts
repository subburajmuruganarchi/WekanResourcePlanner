import { inferImportSheet } from './import-post-cleanup';

describe('inferImportSheet', () => {
    it('detects Resource-only webhook', () => {
        expect(
            inferImportSheet({ resourceRows: [{}], resourceOnly: true })
        ).toBe('Resource');
    });

    it('detects Project-only webhook', () => {
        expect(inferImportSheet({ projectRows: [{}] })).toBe('Project');
    });

    it('detects Allocation-only webhook', () => {
        expect(inferImportSheet({ allocationRows: [{}] })).toBe('Project_Allocation');
    });
});
