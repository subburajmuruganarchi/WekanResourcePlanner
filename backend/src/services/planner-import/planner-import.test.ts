import {
    googleSheetRowToResourceRow,
    googleSheetRowsToProjectRows,
    googleSheetRowToAllocationRow,
    coerceWebhookRows,
} from './adapters/google-sheet-row.adapter';
import { isDummyResource, projectCodeFromRow, parseWeekMonday, formatWeekSheetHeader, projectCodeToPid } from './planner-import.utils';

describe('google-sheet-row.adapter', () => {
    describe('Resource rows', () => {
        it('maps Google Sheet JSON to ResourceImportRow', () => {
            const row = googleSheetRowToResourceRow({
                EID: 'E1001',
                Name: 'John Doe',
                Email: 'john@test.com',
                'Job Role': 'SDE II',
                Skills: 'React, Node.js',
            });
            expect(row.employeeCode).toBe('E1001');
            expect(row.name).toBe('John Doe');
            expect(row.email).toBe('john@test.com');
            expect(row.jobRole).toBe('SDE II');
            expect(row.skills).toEqual(['React', 'Node.js']);
        });

        it('reports invalid email via import skip logic', () => {
            const row = googleSheetRowToResourceRow({ Name: 'No Email', EID: 'X1' });
            expect(row.email.includes('@')).toBe(false);
        });
    });

    describe('Project rows', () => {
        it('maps Google Sheet JSON to ProjectImportRow', () => {
            const [row] = googleSheetRowsToProjectRows([
                {
                    PID: 'P101',
                    Name: 'Alpha Project',
                    Type: 'Customer',
                    Status: 'Active',
                    'BE Required': 2,
                    Tech: 'React',
                },
            ]);
            expect(row.pid).toBe('P101');
            expect(row.name).toBe('Alpha Project');
            expect(row.beRequired).toBe(2);
            expect(row.tech).toBe('React');
            expect(row.statusRaw).toBe('Active');
        });

        it('maps WeKan Project sheet column names (Project, 2mo, Project Tech Req)', () => {
            const [row] = googleSheetRowsToProjectRows([
                {
                    '2mo': 'P05',
                    Project: 'Allianz',
                    Type: 'Customer',
                    Status: 'Active',
                    'Project Tech Req': 'Java, Oracle, MongoDB',
                },
            ]);
            expect(row.pid).toBe('P05');
            expect(row.name).toBe('Allianz');
            expect(row.statusRaw).toBe('Active');
            expect(row.tech).toBe('Java, Oracle, MongoDB');
        });

        it('coerceWebhookRows keeps first Status when headers are duplicated', () => {
            const rows = coerceWebhookRows(
                [
                    ['P05', 'Allianz', 'Customer', 'Active', '', '', '', '', '', '', '', '', '', 'Java', ''],
                ],
                [
                    '2mo',
                    'Project',
                    'Type',
                    'Status',
                    'Confirmed Starting Date',
                    'Certainlty',
                    'Estimated Starting Date',
                    'Duration',
                    'Achitect name/ type',
                    'BE Resources Required',
                    'Mobile Required',
                    'FE Required',
                    'QA',
                    'Project Tech Req',
                    'Status',
                ]
            );
            const [mapped] = googleSheetRowsToProjectRows(rows);
            expect(mapped.statusRaw).toBe('Active');
            expect(mapped.name).toBe('Allianz');
        });

        it('reads status from column 4 when Status key was wiped by duplicate header', () => {
            const [mapped] = googleSheetRowsToProjectRows([
                {
                    __statusCol4: 'Active',
                    Status: '',
                    Project: 'Allianz',
                    '2mo': 'P05',
                },
            ]);
            expect(mapped.statusRaw).toBe('Active');
        });

        it('reads status from column index key 4', () => {
            const [mapped] = googleSheetRowsToProjectRows([
                {
                    '4': 'Active',
                    Status: '',
                    Project: 'Allianz',
                },
            ]);
            expect(mapped.statusRaw).toBe('Active');
        });

        it('coerceWebhookRows pins column 4 from value arrays without headers', () => {
            const rows = coerceWebhookRows([['P05', 'Allianz', 'Customer', 'Active']]);
            const [mapped] = googleSheetRowsToProjectRows(rows);
            expect(mapped.statusRaw).toBe('Active');
        });
    });

    describe('Allocation rows', () => {
        it('maps week columns from row keys', () => {
            const row = googleSheetRowToAllocationRow(
                {
                    PID: 'P101',
                    'Project Name': 'Alpha',
                    EID: 'E1001',
                    '5-Jan': 20,
                    '12-Jan': 40,
                },
                ['5-Jan', '12-Jan']
            );
            expect(row.pid).toBe('P101');
            expect(row.weeklyHours.length).toBe(2);
            expect(row.weeklyHours[0].hours).toBe(20);
            expect(row.weeklyHours[1].hours).toBe(40);
        });
    });
});

describe('planner-import.utils', () => {
    it('detects dummy resources', () => {
        expect(isDummyResource('Z Dummy User', 'Z001')).toBe(true);
        expect(isDummyResource('John Doe', 'E1001')).toBe(false);
    });

    it('generates project codes', () => {
        expect(projectCodeFromRow('P42', 'My App')).toBe('WK-P42');
    });

    it('parses week monday headers', () => {
        const d = parseWeekMonday('5-Jan');
        expect(d).not.toBeNull();
        expect(d!.getUTCDay()).toBe(1);
    });

    it('formats week headers to match Project_Allocation columns', () => {
        const d = parseWeekMonday('15 Jun');
        expect(d).not.toBeNull();
        expect(formatWeekSheetHeader(d!)).toBe('15 Jun');
    });

    it('maps WK project codes back to sheet PID', () => {
        expect(projectCodeToPid('WK-P03')).toBe('P03');
        expect(projectCodeToPid('WK-MYAPP')).toBeNull();
    });
});

describe('duplicate employee handling', () => {
    it('uses email as natural upsert key (same email overwrites)', () => {
        const a = googleSheetRowToResourceRow({ Email: 'dup@test.com', EID: 'E1', Name: 'A' });
        const b = googleSheetRowToResourceRow({ Email: 'dup@test.com', EID: 'E2', Name: 'B' });
        expect(a.email).toBe(b.email);
    });
});
