import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useProjects } from '@/lib/use-projects';
import {
    buildDashboardPeriodRange,
    getCurrentWeekStart,
    periodQueryString,
    getCurrentMonthValue,
} from '@/lib/dashboard-period';
import type { DeliveryRiskItem } from '@/lib/risk-intelligence';
import { fetchDeliveryRisks } from '@/lib/risk-intelligence';

export interface ExecutiveMetrics {
    activeProjects: number;
    onTrack: number;
    atRisk: number;
    critical: number;
    totalEmployees: number;
    utilization: number;
    benchCount: number;
    hiringRisk: 'Low' | 'Medium' | 'High';
    deliveryConfidence: number;
    planDeliveryPercent: number;
    pendingApprovals: number;
}

export interface PortfolioRow {
    customer: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    health: 'Green' | 'Amber' | 'Red';
    progress: number;
    confidence: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    owner: string;
}

export interface ExecutiveRisk {
    id: string;
    title: string;
    impact: 'Low' | 'Medium' | 'High';
    reason: string;
    action: string;
    projectName?: string;
}

export interface CustomerDeliveryRow {
    customer: string;
    projectCount: number;
    health: 'Green' | 'Amber' | 'Red';
    upcomingMilestone: string;
    escalations: number;
}

function healthFromRisk(level?: string, score?: number): 'Green' | 'Amber' | 'Red' {
    if (level === 'HIGH' || (score ?? 0) >= 55) return 'Red';
    if (level === 'MEDIUM' || (score ?? 0) >= 25) return 'Amber';
    return 'Green';
}

function confidenceFromHealth(health: 'Green' | 'Amber' | 'Red', progress: number): number {
    const base = health === 'Green' ? 88 : health === 'Amber' ? 68 : 52;
    return Math.min(99, Math.max(40, Math.round((base + progress) / 2)));
}

export function useExecutiveMetrics() {
    const { projects, loading: projectsLoading } = useProjects();
    const [stats, setStats] = useState<ExecutiveMetrics | null>(null);
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const period = buildDashboardPeriodRange('week', getCurrentWeekStart(), getCurrentMonthValue());
        const query = periodQueryString(period);
        try {
            const [statsRes, risksRes] = await Promise.all([
                api.get<{
                    activeProjects: number;
                    totalEmployees: number;
                    avgUtilization: number;
                    planDeliveryPercent: number;
                    pendingApprovals: number;
                }>(`/dashboard/stats?${query}`),
                fetchDeliveryRisks(),
            ]);
            setRisks(risksRes ?? []);
            const critical = (risksRes ?? []).filter((r) => r.level === 'HIGH').length;
            const atRisk = (risksRes ?? []).filter((r) => r.level === 'MEDIUM').length;
            const active = statsRes?.activeProjects ?? projects.filter((p) => p.status === 'Active').length;
            const onTrack = Math.max(0, active - atRisk - critical);
            const util = statsRes?.avgUtilization ?? 0;
            const bench = Math.max(0, Math.round((statsRes?.totalEmployees ?? 0) * (1 - util / 100) * 0.3));
            const deliveryConfidence = Math.round(
                (statsRes?.planDeliveryPercent ?? 0) * 0.4 +
                    (100 - Math.min(100, critical * 15 + atRisk * 8)) * 0.35 +
                    util * 0.25
            );

            setStats({
                activeProjects: active,
                onTrack,
                atRisk,
                critical,
                totalEmployees: statsRes?.totalEmployees ?? 0,
                utilization: util,
                benchCount: bench,
                hiringRisk: bench > 8 ? 'High' : bench > 4 ? 'Medium' : 'Low',
                deliveryConfidence: Math.min(99, Math.max(50, deliveryConfidence)),
                planDeliveryPercent: statsRes?.planDeliveryPercent ?? 0,
                pendingApprovals: statsRes?.pendingApprovals ?? 0,
            });
        } catch {
            setStats(null);
            setRisks([]);
        } finally {
            setLoading(false);
        }
    }, [projects]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const portfolioRows: PortfolioRow[] = projects
        .filter((p) => p.status === 'Active' || p.status === 'Planning')
        .map((p) => {
            const risk = risks.find((r) => r.projectId === p.id);
            const health = healthFromRisk(risk?.level, risk?.score);
            const progress = risk ? Math.max(35, 100 - risk.score) : 85;
            return {
                customer: p.clientName || p.owner || 'Internal',
                projectId: p.id,
                projectName: p.name,
                projectCode: p.code,
                health,
                progress,
                confidence: confidenceFromHealth(health, progress),
                riskLevel: health === 'Red' ? 'High' : health === 'Amber' ? 'Medium' : 'Low',
                owner: p.managerName || '—',
            };
        });

    const executiveRisks: ExecutiveRisk[] = risks.slice(0, 8).map((r, i) => ({
        id: r.projectId || String(i),
        title:
            r.level === 'HIGH'
                ? 'Current delivery risk — planner or allocation'
                : r.level === 'MEDIUM'
                  ? 'Planner capacity needs attention'
                  : 'Portfolio watch item',
        impact: r.level === 'HIGH' ? 'High' : r.level === 'MEDIUM' ? 'Medium' : 'Low',
        reason: r.reasons?.[0] || 'Review Project_Allocation and current-week planner hours',
        action: r.recommendations?.[0] ?? 'Confirm weekly planner hours match allocated team members',
        projectName: r.name,
    }));

    const customerMap = new Map<string, CustomerDeliveryRow>();
    for (const row of portfolioRows) {
        const cur = customerMap.get(row.customer) ?? {
            customer: row.customer,
            projectCount: 0,
            health: 'Green' as const,
            upcomingMilestone: 'Next release window',
            escalations: 0,
        };
        cur.projectCount += 1;
        if (row.health === 'Red') {
            cur.health = 'Red';
            cur.escalations += 1;
        } else if (row.health === 'Amber' && cur.health !== 'Red') cur.health = 'Amber';
        customerMap.set(row.customer, cur);
    }

    return {
        stats,
        portfolioRows,
        executiveRisks,
        customerRows: [...customerMap.values()],
        loading: loading || projectsLoading,
        refetch: fetchData,
    };
}

export function useCapacityForecast() {
    const { stats, loading } = useExecutiveMetrics();
    const available = stats ? Math.round(stats.totalEmployees * (1 - stats.utilization / 100)) : 0;
    const committed = stats ? Math.round(stats.totalEmployees * (stats.utilization / 100)) : 0;
    const gap = Math.max(0, Math.round(committed * 0.12 - available * 0.5));
    const recommendation =
        gap > 0
            ? `${gap} additional engineer${gap > 1 ? 's' : ''} recommended for next quarter based on committed load and bench.`
            : 'Capacity appears balanced for the next quarter at current utilization.';

    return { available, committed, gap, recommendation, utilization: stats?.utilization ?? 0, loading };
}
