import { useCallback, useState } from 'react';
import { api } from './api-client';
import type {
    UtilizationDashboardSummary,
    UtilizationVarianceResponse,
} from '@/types/utilization';

export function useUtilizationVariance() {
    const [data, setData] = useState<UtilizationVarianceResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVariance = useCallback(
        async (params: {
            weekStartFrom: string;
            weekStartTo: string;
            employeeId?: string;
            projectId?: string;
        }) => {
            setLoading(true);
            setError(null);
            try {
                const q = new URLSearchParams({
                    weekStartFrom: params.weekStartFrom,
                    weekStartTo: params.weekStartTo,
                });
                if (params.employeeId) q.set('employeeId', params.employeeId);
                if (params.projectId) q.set('projectId', params.projectId);
                const result = await api.get<UtilizationVarianceResponse>(
                    `/utilization/variance?${q}`
                );
                setData(result);
                return result;
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to load utilization';
                setError(msg);
                setData(null);
                return null;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return { data, loading, error, fetchVariance };
}

export function useUtilizationDashboardSummary() {
    const [summary, setSummary] = useState<UtilizationDashboardSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async (weekStart?: string) => {
        setLoading(true);
        setError(null);
        try {
            const q = weekStart ? `?weekStart=${weekStart}` : '';
            const result = await api.get<UtilizationDashboardSummary>(
                `/utilization/dashboard-summary${q}`
            );
            setSummary(result);
            return result;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load utilization summary';
            setError(msg);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const syncActuals = useCallback(
        async (params: {
            weekStartFrom: string;
            weekStartTo: string;
            employeeId?: string;
            projectId?: string;
        }) => {
            return api.post<{ syncBatchId: string; cellsUpdated: number; cellsCreated: number }>(
                '/utilization/sync',
                params
            );
        },
        []
    );

    return { summary, loading, error, fetchSummary, syncActuals };
}
