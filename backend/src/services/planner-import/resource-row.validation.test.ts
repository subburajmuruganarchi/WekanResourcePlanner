import {
    normalizeResourceEmail,
    isValidResourceEmail,
    validateResourceRow,
    assertResourceRowsValid,
    ResourceValidationError,
    shouldSkipResourceRow,
    filterImportableResourceRows,
} from './resource-row.validation';
import { ResourceImportRow } from './types/resource-row.dto';
import {
    googleSheetRowToResourceRow,
    googleSheetRowsToImportableResourceRows,
} from './adapters/google-sheet-row.adapter';
import {
    isResourceAvailableFromSheet,
    employeeStatusFromSheetAvailability,
} from './planner-import.utils';

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

    describe('shouldSkipResourceRow', () => {
        it('skips dummy Z-prefix rows', () => {
            expect(
                shouldSkipResourceRow(
                    row({ employeeCode: 'Z001', name: 'z Dummy Architect', email: '#ref!' })
                )
            ).toBe(true);
        });

        it('skips placeholder slots with EID but no Name', () => {
            expect(shouldSkipResourceRow(row({ employeeCode: 'E071', name: '', email: '' }))).toBe(true);
        });

        it('skips completely empty rows', () => {
            expect(shouldSkipResourceRow(row({ employeeCode: '', name: '', email: '' }))).toBe(true);
        });

        it('does not skip real employees with valid email', () => {
            expect(
                shouldSkipResourceRow(
                    row({ employeeCode: 'E001', name: 'Babu Reddy', email: 'babur@wekancode.com' })
                )
            ).toBe(false);
        });

        it('does not skip E069 — empty email is a validation error not a skip', () => {
            expect(
                shouldSkipResourceRow(row({ employeeCode: 'E069', name: 'Manikandan', email: '' }))
            ).toBe(false);
        });
    });

    describe('filterImportableResourceRows', () => {
        it('filters 126-row sheet down to importable employees only', () => {
            const rows: ResourceImportRow[] = [
                row({ employeeCode: 'E001', name: 'Babu Reddy', email: 'babur@wekancode.com' }),
                row({ employeeCode: 'E071', name: '', email: '' }),
                row({ employeeCode: 'Z001', name: 'z Dummy Architect', email: '#ref!' }),
                row({ employeeCode: '', name: '', email: '' }),
            ];
            const importable = filterImportableResourceRows(rows);
            expect(importable).toHaveLength(1);
            expect(importable[0].employeeCode).toBe('E001');
        });

        it('assertResourceRowsValid ignores skipped rows', () => {
            const rows: ResourceImportRow[] = [
                row({ employeeCode: 'E001', email: 'a@b.com' }),
                row({ employeeCode: 'Z001', name: 'z Dummy', email: '#ref!' }),
            ];
            expect(() => assertResourceRowsValid(rows)).not.toThrow();
        });
    });

    describe('Apps Script column mapping', () => {
        it('maps Role, Type, Availablility, Skill (from HR) from webhook payload', () => {
            const mapped = googleSheetRowToResourceRow({
                ID: 'E001',
                EID: 'E001',
                Name: 'Babu Reddy',
                Role: 'Architect',
                Type: 'Backend',
                Availablility: 'Available',
                Email: 'babur@wekancode.com',
                Location: 'Bengalore',
                'Skill (from HR)': 'NodeJS, NestJS, MongoDB, AWS',
                Skills: 'NodeJS, NestJS, MongoDB, AWS',
            });
            expect(mapped.employeeCode).toBe('E001');
            expect(mapped.jobRole).toBe('Architect');
            expect(mapped.resourceType).toBe('Backend');
            expect(mapped.availability).toBe('Available');
            expect(mapped.skills).toEqual(['NodeJS', 'NestJS', 'MongoDB', 'AWS']);
        });

        it('reads Status column when Availability is absent', () => {
            const mapped = googleSheetRowToResourceRow({
                EID: 'E002',
                Name: 'Jane Doe',
                Email: 'jane@wekancode.com',
                Role: 'SDE II',
                Status: 'Not Available',
            });
            expect(mapped.availability).toBe('Not Available');
            expect(isResourceAvailableFromSheet(mapped.availability)).toBe(false);
            expect(employeeStatusFromSheetAvailability(mapped.availability)).toBe('Inactive');
        });

        it('reads Avalability typo header', () => {
            const mapped = googleSheetRowToResourceRow({
                EID: 'E004',
                Name: 'Pat',
                Email: 'pat@wekancode.com',
                Avalability: 'On Notice Period',
            });
            expect(mapped.availability).toBe('On Notice Period');
            expect(isResourceAvailableFromSheet(mapped.availability)).toBe(true);
        });

        it('reads Availability column (including typo header)', () => {
            const mapped = googleSheetRowToResourceRow({
                EID: 'E003',
                Name: 'Bob',
                Email: 'bob@wekancode.com',
                Availablility: 'Not Available',
            });
            expect(mapped.availability).toBe('Not Available');
            expect(isResourceAvailableFromSheet(mapped.availability)).toBe(false);
        });
    });

    describe('Resource sheet Availability → active roster', () => {
        it('treats Available as active', () => {
            expect(isResourceAvailableFromSheet('Available')).toBe(true);
            expect(employeeStatusFromSheetAvailability('Available')).toBe('Active');
        });

        it('treats Not Available as inactive', () => {
            expect(isResourceAvailableFromSheet('Not Available')).toBe(false);
            expect(employeeStatusFromSheetAvailability('Not Available')).toBe('Inactive');
        });

        it('defaults empty Availability to active', () => {
            expect(isResourceAvailableFromSheet('')).toBe(true);
        });

        it('treats any non-Not-Available value as active', () => {
            expect(isResourceAvailableFromSheet('On Notice Period')).toBe(true);
            expect(isResourceAvailableFromSheet('Inactive')).toBe(true);
            expect(isResourceAvailableFromSheet('Available')).toBe(true);
        });
    });

    describe('googleSheetRowsToImportableResourceRows', () => {
        it('drops dummies from raw webhook rows', () => {
            const importable = googleSheetRowsToImportableResourceRows([
                {
                    EID: 'E001',
                    Name: 'Babu Reddy',
                    Email: 'babur@wekancode.com',
                    Role: 'Architect',
                },
                { EID: 'Z001', Name: 'z Dummy Architect', Email: '#ref!' },
                { EID: 'E071', Name: '', Email: '' },
            ]);
            expect(importable).toHaveLength(1);
        });
    });
});
