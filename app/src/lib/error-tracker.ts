const STORAGE_KEY = 'r360_api_failures';
const MAX_FAILURES = 20;

export interface ApiFailureRecord {
    route: string;
    endpoint: string;
    status: number;
    message: string;
    timestamp: string;
}

function readStore(): ApiFailureRecord[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ApiFailureRecord[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStore(records: ApiFailureRecord[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_FAILURES)));
}

/** Record a client-side API failure (local only, no external telemetry). */
export function recordApiFailure(params: {
    endpoint: string;
    status: number;
    message: string;
    route?: string;
}): void {
    const record: ApiFailureRecord = {
        route: params.route ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
        endpoint: params.endpoint,
        status: params.status,
        message: params.message,
        timestamp: new Date().toISOString(),
    };
    const next = [record, ...readStore()].slice(0, MAX_FAILURES);
    writeStore(next);
}

export function getRecentApiFailures(): ApiFailureRecord[] {
    return readStore();
}

export function clearApiFailures(): void {
    localStorage.removeItem(STORAGE_KEY);
}
