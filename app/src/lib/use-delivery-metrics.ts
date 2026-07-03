import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import {
    buildDashboardPeriodRange,
    getCurrentWeekStart,
    periodQueryString,
    getCurrentMonthValue,
} from '@/lib/dashboard-period';
import {
    buildPortfolioHealthRows,
    type PortfolioHealthRow,
} from '@/lib/portfolio-health-rows';
import type { DeliveryRiskItem } from '@/lib/risk-intelligence';
import { fetchDeliveryRisks } from '@/lib/risk-intelligence';
import { useVisibleActiveProjects } from '@/lib/use-visible-active-projects';

export interface DeliveryCommandMetrics {
    managedProjects: number;
    atRisk: number;
    blocked: number;
    resourceGaps: number;
    pendingDecisions: number;
    upcomingReleases: number;
}

export function useDeliveryCommandMetrics() {
    const { projects: portfolioProjects, loading: projectsLoading } = useVisibleActiveProjects();
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [loading, setLoading] = useState(true);

    const portfolioIds = portfolioProjects.map((p) => p.id);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const period = buildDashboardPeriodRange('week', getCurrentWeekStart(), getCurrentMonthValue());
            const [risksRes, statsRes] = await Promise.all([
                fetchDeliveryRisks(),
                api.get<{ pendingApprovals: number }>(`/dashboard/stats?${periodQueryString(period)}`),
            ]);
            const scopedRisks =
                portfolioIds.length > 0
                    ? (risksRes ?? []).filter((r) => portfolioIds.includes(r.projectId))
                    : (risksRes ?? []);
            setRisks(scopedRisks);
            setPendingApprovals(statsRes?.pendingApprovals ?? 0);
        } catch {
            setRisks([]);
        } finally {
            setLoading(false);
        }
    }, [portfolioIds.join(',')]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const atRisk = risks.filter((r) => r.level === 'MEDIUM' || r.level === 'HIGH').length;
    const blocked = risks.filter((r) => r.level === 'HIGH').length;

    const metrics: DeliveryCommandMetrics = {
        managedProjects: portfolioProjects.length,
        atRisk,
        blocked,
        resourceGaps: risks.filter(
            (r) =>
                r.capacityRisks?.some((c) => c.type === 'zero_planned_hours' || c.type === 'under_allocation') &&
                r.level !== 'LOW'
        ).length,
        pendingDecisions: pendingApprovals,
        upcomingReleases: Math.min(portfolioProjects.length, 3),
    };

    const portfolioRows: PortfolioHealthRow[] = buildPortfolioHealthRows(
        portfolioProjects,
        risks
    );

    return {
        metrics,
        portfolioProjects,
        portfolioRows,
        risks,
        loading: loading || projectsLoading,
        refetch: fetchData,
    };
}
