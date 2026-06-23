import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { isDeliveryManager } from '@/lib/roles';

export function usePortfolioScope(role: string | undefined) {
    const [projectIds, setProjectIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(isDeliveryManager(role));

    const fetchScope = useCallback(async () => {
        if (!isDeliveryManager(role)) {
            setProjectIds([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await api.get<{ projectIds: string[] }>('/delivery-portfolios/my-projects');
            setProjectIds(data.projectIds ?? []);
        } catch {
            setProjectIds([]);
        } finally {
            setLoading(false);
        }
    }, [role]);

    useEffect(() => {
        void fetchScope();
    }, [fetchScope]);

    const editableProjectIds = useMemo(
        () => (projectIds.length > 0 ? new Set(projectIds) : undefined),
        [projectIds]
    );

    return { projectIds, editableProjectIds, loading, refetch: fetchScope };
}
