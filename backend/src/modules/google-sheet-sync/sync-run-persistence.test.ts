import { extractFailureDetails } from './sync-run-persistence';

describe('extractFailureDetails', () => {
    it('captures message and stack from Error', () => {
        const err = new Error('Mongo transaction failed');
        const details = extractFailureDetails(err);
        expect(details.message).toBe('Mongo transaction failed');
        expect(details.stack).toContain('Mongo transaction failed');
    });
});
