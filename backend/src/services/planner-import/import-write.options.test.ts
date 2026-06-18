import { failOrSkipRow } from './types/import-write.options';

describe('failOrSkipRow', () => {
    it('throws in atomic mode (transaction rollback)', () => {
        const skipped: { identifier: string; reason: string }[] = [];
        expect(() =>
            failOrSkipRow({ atomic: true }, skipped, 'row-81', 'validation failed')
        ).toThrow(/row-81/);
        expect(skipped).toHaveLength(0);
    });

    it('accumulates skips in non-atomic mode', () => {
        const skipped: { identifier: string; reason: string }[] = [];
        failOrSkipRow(undefined, skipped, 'row-1', 'bad email');
        expect(skipped).toHaveLength(1);
    });
});
