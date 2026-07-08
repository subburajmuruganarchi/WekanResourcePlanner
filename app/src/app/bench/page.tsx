import { useMemo } from 'react';
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
import { useEmployees } from '@/lib/use-employees';
import { useAuth } from '@/lib/auth-context';
import { canSeeManagementDashboard } from '@/lib/roles';
import { Navigate } from 'react-router-dom';

interface BenchEmployee {
    id: string;
    name: string;
    roleLabel: string;
    totalPercent: number;
    availablePercent: number;
}

/** Employees below this peak allocation % are considered on the bench. */
const BENCH_THRESHOLD = 20;

export default function BenchManagementPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const canAccess = canSeeManagementDashboard(user?.role);
    const { employees, loading } = useEmployees({ activeOnly: true });

    const benchEmployees = useMemo((): BenchEmployee[] => {
        return employees
            .map((e) => {
                const availablePercent = Math.round(e.availability ?? 100);
                const totalPercent = Math.max(0, 100 - availablePercent);
                return {
                    id: e.id,
                    name: e.name,
                    roleLabel: e.jobRole || e.position || e.department || e.role || '—',
                    totalPercent,
                    availablePercent,
                };
            })
            .filter((e) => e.totalPercent < BENCH_THRESHOLD)
            .sort((a, b) => a.totalPercent - b.totalPercent);
    }, [employees]);

    const columns: DataTableColumn<BenchEmployee>[] = useMemo(
        () => [
            {
                id: 'name',
                header: 'Employee',
                accessor: (r) => (
                    <div>
                        <span className="font-medium">{r.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.roleLabel}</p>
                    </div>
                ),
                sortValue: (r) => r.name,
                exportValue: (r) => r.name,
            },
            {
                id: 'allocated',
                header: 'Peak allocated',
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

    const benchRate =
        employees.length > 0 ? Math.round((benchEmployees.length / employees.length) * 100) : 0;

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="Resource Intelligence"
                title="Bench Management"
                description={`Active employees with less than ${BENCH_THRESHOLD}% peak allocation over the next 90 days — available for new assignments.`}
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
                    value={String(benchEmployees.length)}
                    icon={UserMinus}
                    accent="slate"
                    hint={`Below ${BENCH_THRESHOLD}% allocated`}
                />
                <MetricCard
                    label="Active Workforce"
                    value={String(employees.length)}
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

            <Section
                title="Available resources"
                description="Sorted by lowest allocation first. Includes employees with no current assignments."
            >
                <EnterpriseDataTable
                    columns={columns}
                    rows={benchEmployees}
                    rowKey={(r) => r.id}
                    exportFilename="bench-resources"
                    storageKey="r360-bench-cols"
                    onRowClick={() => navigate('/allocation')}
                    emptyTitle="No bench resources"
                    emptyDescription="All active employees are above the bench threshold."
                    mobileCardRender={(r) => (
                        <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{r.roleLabel}</p>
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
