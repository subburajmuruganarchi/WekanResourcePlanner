import { useState, useCallback } from 'react';
import { api } from './api-client';

export interface TimeEntryRequest {
    employeeId: string;
    projectId: string;
    timeCodeId: string;
    date: string;
    hours: number;
    comments?: string;
}

export interface TimeEntryResponse {
    id: string;
    employeeId: string;
    projectId: string;
    timeCodeId: string;
    date: string;
    hours: number;
    comments?: string;
    weekStartDate: string;
    status: string;
}

interface UseTimeEntriesResult {
    submitTimeEntry: (request: TimeEntryRequest) => Promise<TimeEntryResponse>;
    loading: boolean;
    error: string | null;
    clearError: () => void;
}

export function useTimeEntries(): UseTimeEntriesResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitTimeEntry = useCallback(async (request: TimeEntryRequest): Promise<TimeEntryResponse> => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post<TimeEntryResponse>('/time-entries', request);
            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit time entry';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return { submitTimeEntry, loading, error, clearError };
}
