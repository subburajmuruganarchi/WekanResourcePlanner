import { useCallback, useEffect, useState } from 'react';
import { api } from './api-client';
import type { PortfolioCapacityForecast } from '@/types/capacity-forecast';

export function usePortfolioCapacityForecast() {
    const [forecast, setForecast] = useState<PortfolioCapacityForecast | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchForecast = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<PortfolioCapacityForecast>('/dashboard/capacity-forecast');
            setForecast(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load capacity forecast');
            setForecast(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchForecast();
    }, [fetchForecast]);

    return { forecast, loading, error, refetch: fetchForecast };
}
