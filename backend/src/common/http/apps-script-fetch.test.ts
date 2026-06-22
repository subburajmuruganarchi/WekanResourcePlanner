import {
    isAppsScriptActionSuccess,
    parseAppsScriptActionResponse,
    postJsonToAppsScriptWebApp,
} from './apps-script-fetch';

describe('postJsonToAppsScriptWebApp', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('re-POSTs JSON body after GAS 302 redirect', async () => {
        const calls: Array<{ url: string; init?: RequestInit }> = [];

        global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
            const href = typeof url === 'string' ? url : url.toString();
            calls.push({ url: href, init });

            if (href.includes('script.google.com')) {
                return new Response(null, {
                    status: 302,
                    headers: { Location: 'https://script.googleusercontent.com/macros/exec?token=abc' },
                });
            }

            return new Response(JSON.stringify({ status: 'SUCCESS', applied: 1 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }) as typeof fetch;

        const { response, text } = await postJsonToAppsScriptWebApp(
            'https://script.google.com/macros/s/ABC/exec',
            { action: 'PATCH_ALLOCATION_CELLS', cells: [{ pid: 'P01', eid: 'E01' }] }
        );

        expect(calls).toHaveLength(2);
        expect(calls[0].init?.redirect).toBe('manual');
        expect(calls[1].url).toContain('googleusercontent.com');
        expect(calls[1].init?.method).toBe('POST');
        expect(calls[1].init?.body).toContain('PATCH_ALLOCATION_CELLS');
        expect(response.status).toBe(200);
        expect(text).toContain('SUCCESS');
    });
});

describe('parseAppsScriptActionResponse', () => {
    it('treats SUCCESS and PARTIAL as successful actions', () => {
        expect(isAppsScriptActionSuccess(parseAppsScriptActionResponse('{"status":"SUCCESS"}'))).toBe(
            true
        );
        expect(isAppsScriptActionSuccess(parseAppsScriptActionResponse('{"status":"PARTIAL"}'))).toBe(
            true
        );
        expect(isAppsScriptActionSuccess(parseAppsScriptActionResponse('{"status":"FAILED"}'))).toBe(
            false
        );
        expect(isAppsScriptActionSuccess(parseAppsScriptActionResponse('{"status":"IGNORED"}'))).toBe(
            false
        );
    });
});
