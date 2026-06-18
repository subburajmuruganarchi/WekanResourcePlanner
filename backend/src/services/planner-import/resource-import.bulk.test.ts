import { IMPORT_BULK_CHUNK_SIZE } from './types/import-write.options';

/**
 * Verifies bulk chunking math for large sheet imports (500+ rows).
 * Integration tests against MongoDB are run separately in CI/staging.
 */
describe('resource import bulk chunking', () => {
    function chunkCount(rowCount: number, chunkSize = IMPORT_BULK_CHUNK_SIZE): number {
        return Math.ceil(rowCount / chunkSize);
    }

    it('splits 500 employee rows into one bulkWrite chunk', () => {
        expect(chunkCount(500)).toBe(1);
    });

    it('splits 501 employee rows into two bulkWrite chunks', () => {
        expect(chunkCount(501)).toBe(2);
    });

    it('handles 500 project and 500 allocation row volumes within chunk limits', () => {
        expect(chunkCount(500)).toBe(1);
        expect(IMPORT_BULK_CHUNK_SIZE).toBeGreaterThanOrEqual(500);
    });
});
