/** HTTP statuses where Google Apps Script /exec URLs redirect to googleusercontent.com. */
const APPS_SCRIPT_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface AppsScriptPostResult {
    response: Response;
    text: string;
}

/**
 * POST JSON to a Google Apps Script web app URL.
 *
 * GAS /exec endpoints respond with 302 to script.googleusercontent.com. Node's
 * fetch with redirect:'follow' turns redirected POSTs into GETs and drops the
 * body, so PATCH_ALLOCATION_CELLS never reaches doPost. Re-POST manually.
 */
export async function postJsonToAppsScriptWebApp(
    url: string,
    body: unknown,
    options: {
        headers?: Record<string, string>;
        signal?: AbortSignal;
    } = {}
): Promise<AppsScriptPostResult> {
    const init: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: JSON.stringify(body),
        signal: options.signal,
        redirect: 'manual',
    };

    let response = await fetch(url, init);

    if (APPS_SCRIPT_REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
            throw new Error(`Apps Script redirect missing Location header (HTTP ${response.status})`);
        }
        response = await fetch(location, init);
    }

    const text = await response.text();
    return { response, text };
}

export interface AppsScriptActionResponse {
    status?: string;
    applied?: number;
    failed?: Array<{ reason?: string }>;
    error?: string;
    message?: string;
}

export function parseAppsScriptActionResponse(text: string): AppsScriptActionResponse {
    try {
        return JSON.parse(text) as AppsScriptActionResponse;
    } catch {
        return {};
    }
}

export function isAppsScriptActionSuccess(parsed: AppsScriptActionResponse): boolean {
    if (!parsed.status) return true;
    return parsed.status === 'SUCCESS' || parsed.status === 'PARTIAL';
}
