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

export interface SubmitWeeklyResult {
    submitted: number;
    totalWeeklyHours: number;
    warnings: string[];
}

interface UseTimeEntriesResult {
    submitTimeEntry: (request: TimeEntryRequest) => Promise<TimeEntryResponse>;
    submitWeeklyTimesheet: (employeeId: string, weekStart: string) => Promise<SubmitWeeklyResult>;
    deleteTimeEntry: (entryId: string, employeeId: string) => Promise<void>;
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

    const submitWeeklyTimesheet = useCallback(async (
        employeeId: string,
        weekStart: string
    ): Promise<SubmitWeeklyResult> => {
        setLoading(true);
        setError(null);
        try {
            return await api.post<SubmitWeeklyResult>('/time-entries/submit', { employeeId, weekStart });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit timesheet';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteTimeEntry = useCallback(async (entryId: string, employeeId: string) => {
        setLoading(true);
        setError(null);
        try {
            await api.delete(`/time-entries/${entryId}`, { employeeId });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete time entry';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return { submitTimeEntry, submitWeeklyTimesheet, deleteTimeEntry, loading, error, clearError };
}
