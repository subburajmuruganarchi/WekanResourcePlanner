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
import type { StaffingRiskItem } from '@/components/dashboard/staffing-risk-cards';

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
    const [risks, setRisks] = useState<StaffingRiskItem[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [loading, setLoading] = useState(true);

    const portfolioProjects =
        projectIds.length > 0
            ? projects.filter((p) => projectIds.includes(p.id))
            : projects.filter((p) => p.status === 'Active' || p.status === 'Planning');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const period = buildDashboardPeriodRange('week', getCurrentWeekStart(), getCurrentMonthValue());
            const [risksRes, statsRes] = await Promise.all([
                api.get<StaffingRiskItem[]>('/dashboard/staffing-risks'),
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
        resourceGaps: risks.filter((r) => (r.unfulfilledHeadcount ?? 0) > 0).length,
        pendingDecisions: pendingApprovals,
        upcomingReleases: Math.min(portfolioProjects.length, 3),
    };

    const recommendations: ResourceRecommendation[] = risks.slice(0, 3).map((r, i) => ({
        id: String(i),
        developer: 'Available bench resource',
        fromProject: portfolioProjects[i % Math.max(1, portfolioProjects.length)]?.name ?? 'Bench',
        toProject: r.name,
        impact: 'Reduce delivery risk by ~20%',
    }));

    return {
        metrics,
        portfolioProjects,
        risks,
        recommendations,
        loading: loading || projectsLoading,
        refetch: fetchData,
    };
}
