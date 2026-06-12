import { recordApiFailure } from './error-tracker';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    requestId?: string;
}

function currentRoute(): string {
    return typeof window !== 'undefined' ? window.location.pathname : '';
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('r360_auth_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (networkErr) {
        const message = networkErr instanceof Error ? networkErr.message : 'Network error';
        recordApiFailure({
            endpoint,
            status: 0,
            message,
            route: currentRoute(),
        });
        throw new Error(message);
    }

    if (response.status === 401) {
        recordApiFailure({
            endpoint,
            status: 401,
            message: 'Unauthorized',
            route: currentRoute(),
        });
        localStorage.removeItem('r360_auth_token');
        localStorage.removeItem('r360_auth_user');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('Unauthorized');
    }

    let json: ApiResponse<T> & T;
    try {
        json = await response.json();
    } catch {
        const message = 'Invalid API response';
        recordApiFailure({
            endpoint,
            status: response.status,
            message,
            route: currentRoute(),
        });
        throw new Error(message);
    }

    if (!response.ok || (json.status && json.status === 'error')) {
        const message = json.message || 'API request failed';
        recordApiFailure({
            endpoint,
            status: response.status,
            message,
            route: currentRoute(),
        });
        throw new Error(message);
    }

    return (json.data !== undefined ? json.data : json) as T;
}

export const api = {
    get: <T>(endpoint: string) => fetchApi<T>(endpoint),
    post: <T>(endpoint: string, data: unknown) =>
        fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    put: <T>(endpoint: string, data: unknown) =>
        fetchApi<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    patch: <T>(endpoint: string, data: unknown) =>
        fetchApi<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: <T>(endpoint: string, data?: unknown) =>
        fetchApi<T>(endpoint, {
            method: 'DELETE',
            ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
        }),
};
