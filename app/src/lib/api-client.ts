const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    const json: ApiResponse<T> & T = await response.json();

    if (!response.ok || (json.status && json.status === 'error')) {
        throw new Error(json.message || 'API request failed');
    }

    // If json has a data field, return it, otherwise return the whole object (for non-wrapped responses)
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
    delete: <T>(endpoint: string) =>
        fetchApi<T>(endpoint, { method: 'DELETE' }),
};
