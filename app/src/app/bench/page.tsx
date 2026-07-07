import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserMinus, Users, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
    PageHeader,
    Section,
    MetricCard,
    MetricGrid,
    EnterpriseDataTable,
    type DataTableColumn,
    PageSkeleton,
    StatusBadge,
} from '@/components/patterns';
import { api } from '@/lib/api-client';
import {
    buildDashboardPeriodRange,
    getCurrentWeekStart,
    getCurrentMonthValue,
    periodQueryString,
} from '@/lib/dashboard-period';
import { useAuth } from '@/lib/auth-context';
import { canSeeManagementDashboard } from '@/lib/roles';
import { Navigate } from 'react-router-dom';

interface BenchEmployee {
    id: string;
    name: string;
    totalPercent: number;
    availablePercent: number;
}

const BENCH_THRESHOLD = 20;

export default function BenchManagementPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const canAccess = canSeeManagementDashboard(user?.role);

    const [employees, setEmployees] = useState<BenchEmployee[]>([]);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!canAccess) return;
        const period = buildDashboardPeriodRange('week', getCurrentWeekStart(), getCurrentMonthValue());
        setLoading(true);
        api
            .get<{
                employees: { id: string; name: string; totalPercent: number }[];
                meta?: { totalEmployees: number };
            }>(`/dashboard/allocation-heatmap?${periodQueryString(period)}`)
            .then((data) => {
                const list = (data.employees ?? [])
                    .filter((e) => e.totalPercent < BENCH_THRESHOLD)
                    .map((e) => ({
                        id: e.id,
                        name: e.name,
                        totalPercent: e.totalPercent,
                        availablePercent: Math.max(0, 100 - e.totalPercent),
                    }))
                    .sort((a, b) => a.totalPercent - b.totalPercent);
                setEmployees(list);
                setTotalEmployees(data.meta?.totalEmployees ?? data.employees?.length ?? 0);
            })
            .catch(() => {
                setEmployees([]);
                setTotalEmployees(0);
            })
            .finally(() => setLoading(false));
    }, [canAccess]);

    const columns: DataTableColumn<BenchEmployee>[] = useMemo(
        () => [
            {
                id: 'name',
                header: 'Employee',
                accessor: (r) => <span className="font-medium">{r.name}</span>,
                sortValue: (r) => r.name,
                exportValue: (r) => r.name,
            },
            {
                id: 'allocated',
                header: 'Allocated',
                accessor: (r) => <span className="tabular-nums">{r.totalPercent}%</span>,
                sortValue: (r) => r.totalPercent,
                exportValue: (r) => `${r.totalPercent}%`,
            },
            {
                id: 'available',
                header: 'Available',
                accessor: (r) => (
                    <StatusBadge variant={r.availablePercent >= 80 ? 'success' : 'info'}>
                        {r.availablePercent}%
                    </StatusBadge>
                ),
                sortValue: (r) => r.availablePercent,
                exportValue: (r) => `${r.availablePercent}%`,
            },
        ],
        []
    );

    if (!canAccess) {
        return <Navigate to="/" replace />;
    }

    if (loading) {
        return <PageSkeleton />;
    }

    const benchRate = totalEmployees > 0 ? Math.round((employees.length / totalEmployees) * 100) : 0;

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="Resource Intelligence"
                title="Bench Management"
                description={`Employees with less than ${BENCH_THRESHOLD}% allocation this week — available for new assignments.`}
                action={
                    <Button onClick={() => navigate('/allocation')} className="gap-2">
                        Open Planner
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                }
            />

            <MetricGrid columns={{ sm: 2, xl: 3 }}>
                <MetricCard
                    label="Bench Resources"
                    value={String(employees.length)}
                    icon={UserMinus}
                    accent="slate"
                    hint={`Below ${BENCH_THRESHOLD}% allocated`}
                />
                <MetricCard
                    label="Total Workforce"
                    value={String(totalEmployees)}
                    icon={Users}
                    accent="sky"
                />
                <MetricCard
                    label="Bench Rate"
                    value={`${benchRate}%`}
                    hint={benchRate > 15 ? 'Consider new project staffing' : 'Healthy bench level'}
                    accent={benchRate > 15 ? 'amber' : 'emerald'}
                    icon={UserMinus}
                />
            </MetricGrid>

            <Section title="Available resources" description="Sort by allocation to find the most available people first.">
                <EnterpriseDataTable
                    columns={columns}
                    rows={employees}
                    rowKey={(r) => r.id}
                    exportFilename="bench-resources"
                    storageKey="r360-bench-cols"
                    onRowClick={() => navigate('/allocation')}
                    emptyTitle="No bench resources"
                    emptyDescription="All employees are above the bench threshold this week."
                    mobileCardRender={(r) => (
                        <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {r.totalPercent}% allocated · {r.availablePercent}% available
                            </p>
                        </div>
                    )}
                />
            </Section>
        </PageContainer>
    );
}