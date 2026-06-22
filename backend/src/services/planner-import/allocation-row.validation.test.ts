import {
    shouldSkipAllocationRow,
    filterImportableAllocationRows,
} from './allocation-row.validation';
import { AllocationImportRow } from './types/allocation-row.dto';

function allocRow(overrides: Partial<AllocationImportRow> = {}): AllocationImportRow {
    return {
        pid: 'P04',
        projectName: 'AIA Singapore',
        projectType: 'Customer',
        projectStatus: 'Active',
        employeeCode: 'E006',
        resourceName: 'Satnam Singh',
        jobRole: 'SDE II (Full Stack)',
        resourceType: 'Fullstack',
        activeFlag: 'Available',
        weeklyHours: [{ weekStart: new Date('2026-07-13T00:00:00.000Z'), hours: 20 }],
        ...overrides,
    };
}

describe('allocation-row.validation', () => {
    it('skips dummy Z-prefix allocation rows', () => {
        expect(
            shouldSkipAllocationRow(
                allocRow({
                    pid: 'P58',
                    employeeCode: 'Z018',
                    resourceName: 'z Dummy SDE III (Backend)',
                    weeklyHours: [{ weekStart: new Date(), hours: 40 }],
                })
            )
        ).toBe(true);
    });

    it('keeps real allocation rows with hours', () => {
        expect(shouldSkipAllocationRow(allocRow())).toBe(false);
    });

    it('keeps assigned rows even when weekly hours are all zero', () => {
        expect(
            shouldSkipAllocationRow(
                allocRow({
                    weeklyHours: [{ weekStart: new Date('2026-06-22T00:00:00.000Z'), hours: 0 }],
                })
            )
        ).toBe(false);
    });

    it('skips rows with no assignment identity', () => {
        expect(
            shouldSkipAllocationRow(
                allocRow({
                    pid: '',
                    projectName: '',
                    employeeCode: '',
                    resourceName: '',
                    weeklyHours: [],
                })
            )
        ).toBe(true);
    });

    it('filters dummy rows from batch like P58:Z018', () => {
        const rows = [
            allocRow(),
            allocRow({
                pid: 'P58',
                employeeCode: 'Z018',
                resourceName: 'z Dummy SDE III (Backend)',
                weeklyHours: [{ weekStart: new Date(), hours: 40 }],
            }),
        ];
        const importable = filterImportableAllocationRows(rows);
        expect(importable).toHaveLength(1);
        expect(importable[0].employeeCode).toBe('E006');
    });
});
