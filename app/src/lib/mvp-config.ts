/** Mirror backend feature flags — also overridable via Vite env for local dev. */

export type MvpFeatureFlags = {
    mvpMode: boolean;
    timeEntryEnabled: boolean;
    timesheetApprovalEnabled: boolean;
    weeklyAllocationsEnabled: boolean;
};

const envMvp =
    import.meta.env.VITE_FEATURE_MVP_MODE === 'true' ||
    import.meta.env.VITE_FEATURE_MVP_MODE === '1';

const envTimeEntry = import.meta.env.VITE_FEATURE_TIME_ENTRY_ENABLED;
const envApproval = import.meta.env.VITE_FEATURE_TIMESHEET_APPROVAL_ENABLED;

let cached: MvpFeatureFlags | null = null;
let fetchPromise: Promise<MvpFeatureFlags> | null = null;

function resolveFromEnv(): MvpFeatureFlags {
    const mvpMode = envMvp || import.meta.env.VITE_FEATURE_MVP_MODE !== 'false';
    const timeEntryEnabled =
        envTimeEntry === 'true' || envTimeEntry === '1'
            ? true
            : envTimeEntry === 'false' || envTimeEntry === '0'
              ? false
              : !mvpMode;
    const timesheetApprovalEnabled =
        envApproval === 'true' || envApproval === '1'
            ? true
            : envApproval === 'false' || envApproval === '0'
              ? false
              : !mvpMode;

    return {
        mvpMode,
        timeEntryEnabled,
        timesheetApprovalEnabled,
        weeklyAllocationsEnabled: true,
    };
}

export function getMvpFeatures(): MvpFeatureFlags {
    return cached ?? resolveFromEnv();
}

export async function loadMvpFeatures(apiBase?: string): Promise<MvpFeatureFlags> {
    if (cached) return cached;
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
        try {
            const base = apiBase ?? import.meta.env.VITE_API_URL ?? '';
            const res = await fetch(`${base}/api/config/features`);
            if (res.ok) {
                const json = await res.json();
                cached = {
                    mvpMode: Boolean(json.data?.mvpMode),
                    timeEntryEnabled: Boolean(json.data?.timeEntryEnabled),
                    timesheetApprovalEnabled: Boolean(json.data?.timesheetApprovalEnabled),
                    weeklyAllocationsEnabled: Boolean(json.data?.weeklyAllocationsEnabled ?? true),
                };
                return cached;
            }
        } catch {
            // fall through to env defaults
        }
        cached = resolveFromEnv();
        return cached;
    })();

    return fetchPromise;
}

/** Paths hidden when corresponding MVP flags are off (code remains; routes blocked in UI). */
export function isNavPathEnabled(path: string, flags: MvpFeatureFlags = getMvpFeatures()): boolean {
    if (!flags.timeEntryEnabled && path === '/time-entry') return false;
    if (!flags.timesheetApprovalEnabled && (path === '/pm-approvals' || path === '/approvals')) return false;
    if (flags.mvpMode) {
        const mvpHidden = new Set([
            '/approvals',
            '/resource-requests',
            '/okrs',
            '/insights',
            '/executive/risk-radar',
            '/delivery/recommendations',
            '/pm/timeline',
            '/pm/risks',
            '/pm/decisions',
            '/pm/communication',
            '/inputs',
            '/portfolios',
        ]);
        if (mvpHidden.has(path)) return false;
    }
    return true;
}
