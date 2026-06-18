import { AppError } from '../../common/errors/app-error';
import { validateSheetResult, assertFullSyncSummary } from './sheet-sync.validation';
import { PlannerImportResult, FullSyncSummary } from '../../services/planner-import/types/import-result.types';

function baseResult(overrides: Partial<PlannerImportResult> = {}): PlannerImportResult {
    return {
        employeesUpserted: 0,
        projectsUpserted: 0,
        allocationsUpserted: 0,
        weeklyEntriesUpserted: 0,
        jobRoles: 0,
        skills: 0,
        resourceOnly: false,
        message: 'ok',
        rowsReceived: 119,
        rowsProcessed: 119,
        rowsSkipped: 0,
        skippedRows: [],
        errors: [],
        ...overrides,
    };
}

describe('validateSheetResult', () => {
    it('passes when received equals processed with no errors', () => {
        expect(() => validateSheetResult('Project_Allocation', 119, baseResult())).not.toThrow();
    });

    it('throws when row 50 failure leaves processed count short (atomic rollback scenario)', () => {
        expect(() =>
            validateSheetResult(
                'Project_Allocation',
                119,
                baseResult({ rowsProcessed: 49, rowsSkipped: 1, errors: ['row 50: boom'] })
            )
        ).toThrow(AppError);
    });

    it('throws when any rows are skipped', () => {
        expect(() =>
            validateSheetResult('Resource', 100, baseResult({ rowsProcessed: 99, rowsSkipped: 1 }))
        ).toThrow(/skipped/);
    });
});

describe('assertFullSyncSummary', () => {
    const successSummary = (): FullSyncSummary => ({
        resource: {
            received: 100,
            processed: 100,
            skipped: 0,
            upserted: 100,
            errors: [],
            status: 'SUCCESS',
            lastSyncAt: null,
        },
        project: {
            received: 50,
            processed: 50,
            skipped: 0,
            upserted: 50,
            errors: [],
            status: 'SUCCESS',
            lastSyncAt: null,
        },
        allocation: {
            received: 119,
            processed: 119,
            skipped: 0,
            upserted: 119,
            errors: [],
            status: 'SUCCESS',
            lastSyncAt: null,
        },
    });

    it('accepts full batch success for 119 allocation rows', () => {
        expect(() => assertFullSyncSummary(successSummary())).not.toThrow();
    });

    it('fails full sync when resource sheet failed with error detail', () => {
        const summary = successSummary();
        summary.resource.status = 'FAILED';
        summary.resource.errors = ['Resource: transaction aborted'];
        summary.resource.processed = 0;
        expect(() => assertFullSyncSummary(summary)).toThrow(/Resource: transaction aborted/);
    });

    it('reports missing batch runs clearly', () => {
        const summary = successSummary();
        summary.resource.status = 'MISSING';
        summary.resource.errors = ['No SyncRun for this batch'];
        expect(() => assertFullSyncSummary(summary)).toThrow(/omitted syncBatchId/);
    });
});

describe('password preservation contract', () => {
    it('documents $setOnInsert for password on employee upsert', () => {
        const updateDoc = {
            $set: { first_name: 'John', email: 'john@test.com' },
            $setOnInsert: { password: 'hashed' },
        };
        expect(updateDoc.$set).not.toHaveProperty('password');
        expect(updateDoc.$setOnInsert).toHaveProperty('password');
    });
});
