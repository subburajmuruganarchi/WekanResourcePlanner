import { useCallback, useEffect, useState } from 'react';
import { useProjects } from '@/lib/use-projects';
import { usePortfolioScope } from '@/lib/use-portfolio-scope';
import { useAuth } from '@/lib/auth-context';
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
import { projectCustomerLabel } from '@/lib/project-customer-label';
import { isDeliveryManager } from '@/lib/roles';
import { isOperationalProject } from '@/lib/project-status';
import type { DeliveryRiskItem } from '@/lib/risk-intelligence';
import { fetchDeliveryRisks } from '@/lib/risk-intelligence';

export interface DeliveryCommandMetrics {
    managedProjects: number;
    atRisk: number;
    blocked: number;
    resourceGaps: number;
    pendingDecisions: number;
    upcomingReleases: number;
}

export interface ResourceRecommendation {
    id: string;
    developer: string;
    fromProject: string;
    toProject: string;
    impact: string;
}

export function useDeliveryCommandMetrics() {
    const { user } = useAuth();
    const { projectIds } = usePortfolioScope(user?.role);
    const { projects, loading: projectsLoading } = useProjects();
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [loading, setLoading] = useState(true);

    const portfolioProjects =
        projectIds.length > 0
            ? projects.filter((p) => projectIds.includes(p.id))
            : isDeliveryManager(user?.role)
              ? []
              : projects.filter((p) => isOperationalProject(p));

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const period = buildDashboardPeriodRange('week', getCurrentWeekStart(), getCurrentMonthValue());
            const [risksRes, statsRes] = await Promise.all([
                fetchDeliveryRisks(),
                api.get<{ pendingApprovals: number }>(`/dashboard/stats?${periodQueryString(period)}`),
            ]);
            const scopedRisks =
                projectIds.length > 0
                    ? (risksRes ?? []).filter((r) => projectIds.includes(r.projectId))
                    : (risksRes ?? []);
            setRisks(scopedRisks);
            setPendingApprovals(statsRes?.pendingApprovals ?? 0);
        } catch {
            setRisks([]);
        } finally {
            setLoading(false);
        }
    }, [projectIds]);

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

    const recommendations: ResourceRecommendation[] = risks.slice(0, 3).map((r, i) => ({
        id: String(i),
        developer: 'Available bench resource',
        fromProject: projectCustomerLabel(
            portfolioProjects[i % Math.max(1, portfolioProjects.length)] ?? { name: 'Bench' }
        ),
        toProject: r.name,
        impact: r.recommendations?.[0] ?? 'Update planner hours for the current week',
    }));

    const portfolioRows: PortfolioHealthRow[] = buildPortfolioHealthRows(
        portfolioProjects,
        risks
    );

    return {
        metrics,
        portfolioProjects,
        portfolioRows,
        risks,
        recommendations,
        loading: loading || projectsLoading,
        refetch: fetchData,
    };
}
