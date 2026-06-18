import { extractFailureDetails } from './sync-run-persistence';
import { unwrapImportError } from '../../services/planner-import/import-error.utils';
import { syncResponseFromRun } from './sync-run-idempotency';
import { Types } from 'mongoose';

describe('webhook failure JSON contract', () => {
    it('surfaces duplicate key from MongoBulkWriteError for Apps Script', () => {
        const err = Object.assign(new Error('bulk write failed'), {
            writeErrors: [
                {
                    errmsg: 'E11000 duplicate key error dup key: { email: "a@b.com" }',
                    code: 11000,
                    codeName: 'DuplicateKey',
                },
            ],
        });
        const details = extractFailureDetails(err);
        expect(details.message).toContain('duplicate key');
        expect(details.code).toBe(11000);
        expect(details.codeName).toBe('DuplicateKey');
    });

    it('does not return bare transaction aborted as final message when cause exists', () => {
        const root = new Error('E11000 duplicate key');
        const wrapper = Object.assign(
            new Error('Transaction with { txnNumber: 9 } has been aborted.'),
            { cause: root }
        );
        const unwrapped = unwrapImportError(wrapper);
        expect(unwrapped.message).toBe('E11000 duplicate key');
    });
});

describe('syncResponseFromRun cached flag', () => {
    it('can be extended with cached:true by caller', () => {
        const run = {
            _id: new Types.ObjectId(),
            sheet: 'Resource',
            status: 'SUCCESS' as const,
            rowsReceived: 10,
            rowsProcessed: 10,
            rowsSkipped: 0,
            errorMessages: [],
            startedAt: new Date('2026-01-01T00:00:00Z'),
            completedAt: new Date('2026-01-01T00:00:05Z'),
            syncId: 'sync-1',
        };
        const response = { ...syncResponseFromRun(run as never, 'REQ-1'), cached: true };
        expect(response.cached).toBe(true);
        expect(response.rowsProcessed).toBe(10);
    });
});

describe('extractFailureDetails', () => {
    it('captures message and stack from Error', () => {
        const err = new Error('Mongo transaction failed');
        const details = extractFailureDetails(err);
        expect(details.message).toBe('Mongo transaction failed');
        expect(details.stack).toContain('Mongo transaction failed');
    });

    it('unwraps transaction aborted to original Mongo error (not bare abort message)', () => {
        const root = new Error('E11000 duplicate key error index: email_1 dup key: { email: "a@b.com" }');
        const wrapper = Object.assign(
            new Error('Transaction with { txnNumber: 9 } has been aborted.'),
            { reason: root }
        );
        const details = extractFailureDetails(wrapper);
        expect(details.message).toContain('duplicate key');
        expect(details.message).not.toBe('Transaction with { txnNumber: 9 } has been aborted.');
    });
});
