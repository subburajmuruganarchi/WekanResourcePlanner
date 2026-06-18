import {
    normalizeResourceEmail,
    isValidResourceEmail,
    validateResourceRow,
    assertResourceRowsValid,
    ResourceValidationError,
} from './resource-row.validation';
import { ResourceImportRow } from './types/resource-row.dto';

function row(overrides: Partial<ResourceImportRow> = {}): ResourceImportRow {
    return {
        employeeCode: 'E1001',
        name: 'Jane Doe',
        jobRole: 'SDE II',
        resourceType: 'Engineering',
        availability: 'Available',
        email: 'jane@test.com',
        location: 'Remote',
        skills: ['React'],
        ...overrides,
    };
}

describe('resource-row.validation', () => {
    describe('normalizeResourceEmail', () => {
        it('trims spaces and lowercases', () => {
            expect(normalizeResourceEmail('  Jane@Test.COM  ')).toBe('jane@test.com');
        });
    });

    describe('isValidResourceEmail', () => {
        it('accepts valid email', () => {
            expect(isValidResourceEmail('user@example.com')).toBe(true);
        });

        it('rejects empty email', () => {
            expect(isValidResourceEmail('')).toBe(false);
        });

        it('rejects invalid format', () => {
            expect(isValidResourceEmail('not-an-email')).toBe(false);
        });
    });

    describe('validateResourceRow', () => {
        it('returns null for valid email', () => {
            expect(validateResourceRow(row())).toBeNull();
        });

        it('rejects empty email with value in message', () => {
            const issue = validateResourceRow(row({ email: '' }));
            expect(issue).not.toBeNull();
            expect(issue!.eid).toBe('E1001');
            expect(issue!.reason).toBe('E1001: Invalid email value=""');
        });

        it('rejects invalid email with actual value', () => {
            const issue = validateResourceRow(row({ email: 'bad-email', employeeCode: 'E069' }));
            expect(issue!.reason).toBe('E069: Invalid email value="bad-email"');
        });

        it('rejects whitespace-only email as empty', () => {
            const issue = validateResourceRow(row({ email: '   ', employeeCode: 'E069' }));
            expect(issue!.reason).toBe('E069: Invalid email value=""');
        });

        it('accepts email with surrounding spaces when inner value is valid', () => {
            expect(validateResourceRow(row({ email: '  user@test.com  ' }))).toBeNull();
        });

        it('rejects missing EID', () => {
            const issue = validateResourceRow(row({ employeeCode: '' }));
            expect(issue!.reason).toBe('unknown: Missing required field EID');
        });

        it('rejects missing Name', () => {
            const issue = validateResourceRow(row({ name: '  ', employeeCode: 'E069' }));
            expect(issue!.reason).toBe('E069: Missing required field Name');
        });
    });

    describe('assertResourceRowsValid', () => {
        it('throws ResourceValidationError for invalid rows (atomic rollback path)', () => {
            expect(() =>
                assertResourceRowsValid([row({ email: 'invalid', employeeCode: 'E069' })])
            ).toThrow(ResourceValidationError);

            try {
                assertResourceRowsValid([row({ email: '', employeeCode: 'E069' })]);
            } catch (err) {
                const validationErr = err as ResourceValidationError;
                expect(validationErr.errors).toContain('E069: Invalid email value=""');
                expect(validationErr.validationReport[0].eid).toBe('E069');
            }
        });

        it('does not throw when all rows are valid', () => {
            expect(() => assertResourceRowsValid([row(), row({ employeeCode: 'E1002', email: 'b@c.com' })])).not.toThrow();
        });
    });
});
