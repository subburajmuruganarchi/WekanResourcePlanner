import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';

// ── Types ──────────────────────────────────────────────────────

export interface KeyResult {
    id: string;
    title: string;
    target: number;
    achieved: number;
    unit: string;
    status: string;
    achievementPercent: number;
}

export interface OkrEntry {
    id: string;
    employeeId: string;
    employeeName?: string;
    objective: string;
    period: string;
    periodQuarter: string;
    periodYear: number;
    status: string;
    keyResults: KeyResult[];
    achievementPercent: number;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface OkrSummary {
    okrs: OkrEntry[];
    overallScore: number;
}

export interface CreateOkrPayload {
    employeeId: string;
    objective: string;
    periodQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    periodYear: number;
    status?: string;
    keyResults: {
        title: string;
        target: number;
        unit: string;
    }[];
}

// ── Hook ────────────────────────────────────────────────────────

export function useOkrs(employeeId?: string, period?: string) {
    const [okrs, setOkrs] = useState<OkrEntry[]>([]);
    const [overallScore, setOverallScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOkrs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (employeeId) {
                const params = period ? `?period=${period}` : '';
                const data = await api.get<OkrSummary>(`/okrs/employee/${employeeId}${params}`);
                setOkrs(data.okrs);
                setOverallScore(data.overallScore);
            } else {
                const params = period ? `?period=${period}` : '';
                const data = await api.get<OkrEntry[]>(`/okrs${params}`);
                setOkrs(data);
                // Overall score for all employees: average of individual scores
                if (data.length > 0) {
                    const total = data.reduce((sum, o) => sum + o.achievementPercent, 0);
                    setOverallScore(Math.round(total / data.length));
                } else {
                    setOverallScore(0);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch OKRs');
            console.error('Failed to fetch OKRs:', err);
        } finally {
            setLoading(false);
        }
    }, [employeeId, period]);

    useEffect(() => {
        fetchOkrs();
    }, [fetchOkrs]);

    return { okrs, overallScore, loading, error, refetch: fetchOkrs };
}

export function useOkrPeriods() {
    const [periods, setPeriods] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPeriods = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<string[]>('/okrs/periods');
            setPeriods(data);
        } catch (err) {
            console.error('Failed to fetch OKR periods:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPeriods();
    }, [fetchPeriods]);

    return { periods, loading, refetch: fetchPeriods };
}

// ── Mutation Helpers ────────────────────────────────────────────

export async function createOkr(data: CreateOkrPayload): Promise<OkrEntry> {
    return api.post<OkrEntry>('/okrs', data);
}

export async function updateOkr(okrId: string, data: {
    objective?: string;
    status?: string;
    keyResults?: { title: string; target: number; achieved?: number; unit: string; status?: string }[];
}): Promise<OkrEntry> {
    return api.put<OkrEntry>(`/okrs/${okrId}`, data);
}

export async function updateKeyResultProgress(
    okrId: string,
    keyResultId: string,
    achieved: number,
    status?: string
): Promise<OkrEntry> {
    return api.patch<OkrEntry>(`/okrs/${okrId}/progress`, { keyResultId, achieved, status });
}

export async function deleteOkr(okrId: string): Promise<void> {
    return api.delete<void>(`/okrs/${okrId}`);
}
