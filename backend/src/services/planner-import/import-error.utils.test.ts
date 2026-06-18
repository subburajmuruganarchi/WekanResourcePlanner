import { unwrapImportError } from './import-error.utils';

describe('unwrapImportError', () => {
    it('surfaces root Mongo error behind transaction aborted wrapper', () => {
        const root = Object.assign(new Error('E11000 duplicate key error collection: r360.employees'), {
            code: 11000,
            codeName: 'DuplicateKey',
        });
        const wrapper = Object.assign(
            new Error('Transaction with { txnNumber: 9 } has been aborted.'),
            { cause: root }
        );

        const unwrapped = unwrapImportError(wrapper);
        expect(unwrapped.message).toContain('duplicate key');
        expect(unwrapped.code).toBe(11000);
        expect(unwrapped.codeName).toBe('DuplicateKey');
    });

    it('unwraps errorResponse.errmsg from bulk write failures', () => {
        const bulkErr = Object.assign(new Error('bulk write failed'), {
            errorResponse: {
                errmsg: 'Plan executor error during update :: caused by :: E11000 duplicate key',
                code: 11000,
                codeName: 'DuplicateKey',
            },
        });
        const unwrapped = unwrapImportError(bulkErr);
        expect(unwrapped.message).toContain('duplicate key');
        expect(unwrapped.code).toBe(11000);
    });

    it('does not return bare transaction aborted when only wrapper exists', () => {
        const wrapper = new Error('Transaction with { txnNumber: 9 } has been aborted.');
        const unwrapped = unwrapImportError(wrapper);
        expect(unwrapped.message).not.toBe('Transaction with { txnNumber: 9 } has been aborted.');
        expect(unwrapped.message).toContain('transaction aborted');
    });

    it('unwraps MongoBulkWriteError writeErrors array', () => {
        const bulkErr = Object.assign(new Error('bulk write failed'), {
            writeErrors: [
                {
                    errmsg: 'E11000 duplicate key error collection: r360.employees index: email_1',
                    code: 11000,
                    codeName: 'DuplicateKey',
                    index: 0,
                },
            ],
        });
        const unwrapped = unwrapImportError(bulkErr);
        expect(unwrapped.message).toContain('duplicate key');
        expect(unwrapped.code).toBe(11000);
    });

    it('passes through normal errors unchanged', () => {
        const err = new Error('Invalid email');
        const unwrapped = unwrapImportError(err);
        expect(unwrapped.message).toBe('Invalid email');
    });
});
