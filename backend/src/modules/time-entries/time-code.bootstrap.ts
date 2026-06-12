import { TimeCode } from './time-code.model';

const DEFAULT_TIME_CODES = [
    { code: 'DEV', description: 'Development work', isBillable: true },
    { code: 'BILLABLE', description: 'Billable project work', isBillable: true },
    { code: 'NON_BILLABLE', description: 'Non-billable project work', isBillable: false },
    { code: 'MEETING', description: 'Meetings', isBillable: false },
    { code: 'TESTING', description: 'QA and testing', isBillable: true },
    { code: 'SUPPORT', description: 'Support activities', isBillable: true },
] as const;

const PREFERRED_CODES = ['DEV', 'BILLABLE', 'MEETING', 'TESTING', 'SUPPORT', 'NON_BILLABLE'];

/** Ensures general-purpose time codes exist in time_codes (upsert, safe with legacy rows). */
export async function ensureDefaultTimeCodes(): Promise<void> {
    for (const tc of DEFAULT_TIME_CODES) {
        await TimeCode.findOneAndUpdate(
            { code: tc.code },
            {
                $set: { description: tc.description, isBillable: tc.isBillable },
                $setOnInsert: { code: tc.code, status: 'Active' },
            },
            { upsert: true }
        );
    }
}

export function mapTimeCodeResponse(tc: {
    _id: { toString(): string };
    code: string;
    description?: string;
    isBillable?: boolean;
    type?: string;
    status?: string;
}) {
    return {
        id: tc._id.toString(),
        code: tc.code,
        description: tc.description || tc.type || tc.code,
        isBillable: tc.isBillable ?? tc.type === 'Project',
    };
}

export function sortTimeCodesForEntry<T extends { code: string }>(codes: T[]): T[] {
    return [...codes].sort((a, b) => {
        const ai = PREFERRED_CODES.indexOf(a.code);
        const bi = PREFERRED_CODES.indexOf(b.code);
        if (ai === -1 && bi === -1) return a.code.localeCompare(b.code);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
}
