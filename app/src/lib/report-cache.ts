const DAILY_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEnvelope<T> {
    savedAt: number;
    data: T;
}

export function readDailyCache<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CacheEnvelope<T>;
        if (Date.now() - parsed.savedAt > DAILY_TTL_MS) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

export function writeDailyCache<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(envelope));
}

export function clearDailyCache(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
}

export const REPORTS_PREVIEW_CACHE_KEY = 'r360-reports-previews';
export const REPORTS_RISKS_CACHE_KEY = 'r360-reports-risks';
