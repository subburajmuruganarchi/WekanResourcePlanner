import { format, parseISO } from 'date-fns';
import { AlertCircle, Info, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import {
    PageHeader,
    Section,
    MetricCard,
    MetricGrid,
    EnterpriseDataTable,
    PageSkeleton,
    StatusBadge,
    type DataTableColumn,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { usePortfolioCapacityForecast } from '@/lib/use-capacity-forecast';
import type {
    AllocationConflict,
    EmployeeCapacityForecast,
    ProjectCapacityForecast,
} from '@/types/capacity-forecast';

function formatWeekLabel(weekStart: string): string {
    try {
        return format(parseISO(weekStart), 'd MMM yyyy');
    } catch {
        return weekStart;
    }
}

function conflictLabel(type: AllocationConflict['type']): string {
    switch (type) {
        case 'over_allocation':
            return 'Over capacity';
        case 'zero_planned_hours':
            return 'No plan';
        case 'under_planned_hours':
            return 'Under-planned';
        case 'allocation_percent_exceeded':
            return '>100% allocated';
        default:
            return type;
    }
}

const employeeColumns: DataTableColumn<EmployeeCapacityForecast>[] = [
    {
        id: 'name',
        header: 'Resource',
        accessor: (r) => (
            <div>
                <p className="font-medium">{r.employeeName}</p>
                {r.isOverAllocated && (
                    <StatusBadge variant="critical" className="mt-1">
                        Over weekly capacity
                    </StatusBadge>
                )}
            </div>
        ),
        sortValue: (r) => r.employeeName,
        exportValue: (r) => r.employeeName,
    },
    {
        id: 'capacity',
        header: 'Weekly capacity',
        accessor: (r) => <span className="tabular-nums">{r.capacityHours}h</span>,
        sortValue: (r) => r.capacityHours,
        exportValue: (r) => `${r.capacityHours}h`,
    },
    {
        id: 'portfolio',
        header: 'Planned (portfolio)',
        accessor: (r) => <span className="tabular-nums">{r.portfolioCommittedHours}h</span>,
        sortValue: (r) => r.portfolioCommittedHours,
        exportValue: (r) => `${r.portfolioCommittedHours}h`,
    },
    {
        id: 'total',
        header: 'Planned (all projects)',
        accessor: (r) => <span className="tabular-nums">{r.totalCommittedHours}h</span>,
        sortValue: (r) => r.totalCommittedHours,
        exportValue: (r) => `${r.totalCommittedHours}h`,
    },
    {
        id: 'available',
        header: 'Free hours',
        accessor: (r) => <span className="tabular-nums">{r.availableHours}h</span>,
        sortValue: (r) => r.availableHours,
        exportValue: (r) => `${r.availableHours}h`,
    },
    {
        id: 'util',
        header: 'Utilization',
        accessor: (r) => (
            <StatusBadge variant={r.utilizationPercent > 100 ? 'critical' : r.utilizationPercent >= 80 ? 'warning' : 'success'}>
                {r.utilizationPercent}%
            </StatusBadge>
        ),
        sortValue: (r) => r.utilizationPercent,
        exportValue: (r) => `${r.utilizationPercent}%`,
    },
    {
        id: 'peak',
        header: 'Peak allocation %',
        accessor: (r) => <span className="tabular-nums">{r.peakCommittedPercent}%</span>,
        sortValue: (r) => r.peakCommittedPercent,
        exportValue: (r) => `${r.peakCommittedPercent}%`,
    },
];

const projectColumns: DataTableColumn<ProjectCapacityForecast>[] = [
    {
        id: 'project',
        header: 'Project',
        accessor: (r) => (
            <div>
                <p className="font-medium">{r.projectName}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.projectCode}</p>
            </div>
        ),
        sortValue: (r) => r.projectName,
        exportValue: (r) => r.projectName,
    },
    {
        id: 'members',
        header: 'Team',
        accessor: (r) => <span className="tabular-nums">{r.allocatedMembers}</span>,
        sortValue: (r) => r.allocatedMembers,
        exportValue: (r) => String(r.allocatedMembers),
    },
    {
        id: 'expected',
        header: 'Expected (from allocation %)',
        accessor: (r) => <span className="tabular-nums">{r.expectedHours}h</span>,
        sortValue: (r) => r.expectedHours,
        exportValue: (r) => `${r.expectedHours}h`,
    },
    {
        id: 'planned',
        header: 'Planned (this week)',
        accessor: (r) => <span className="tabular-nums">{r.plannedHours}h</span>,
        sortValue: (r) => r.plannedHours,
        exportValue: (r) => `${r.plannedHours}h`,
    },
    {
        id: 'gap',
        header: 'Gap',
        accessor: (r) => (
            <StatusBadge variant={r.gapHours > 0 ? 'warning' : 'success'}>
                {r.gapHours > 0 ? `${r.gapHours}h short` : 'On plan'}
            </StatusBadge>
        ),
        sortValue: (r) => r.gapHours,
        exportValue: (r) => `${r.gapHours}h`,
    },
    {
        id: 'coverage',
        header: 'Plan coverage',
        accessor: (r) => <span className="tabular-nums">{r.planCoveragePercent}%</span>,
        sortValue: (r) => r.planCoveragePercent,
        exportValue: (r) => `${r.planCoveragePercent}%`,
    },
];

const conflictColumns: DataTableColumn<AllocationConflict>[] = [
    {
        id: 'severity',
        header: 'Severity',
        accessor: (r) => (
            <StatusBadge variant={r.severity === 'HIGH' ? 'critical' : 'warning'}>{r.severity}</StatusBadge>
        ),
        sortValue: (r) => r.severity,
        exportValue: (r) => r.severity,
    },
    {
        id: 'type',
        header: 'Type',
        accessor: (r) => conflictLabel(r.type),
        sortValue: (r) => r.type,
        exportValue: (r) => conflictLabel(r.type),
    },
    {
        id: 'who',
        header: 'Who / where',
        accessor: (r) => (
            <div>
                <p className="font-medium">{r.employeeName ?? '—'}</p>
                {r.projectName && <p className="text-xs text-muted-foreground">{r.projectName}</p>}
            </div>
        ),
        sortValue: (r) => r.employeeName ?? '',
        exportValue: (r) => `${r.employeeName ?? ''} ${r.projectName ?? ''}`.trim(),
    },
    {
        id: 'message',
        header: 'Detail',
        accessor: (r) => <span className="text-sm text-muted-foreground">{r.message}</span>,
        sortValue: (r) => r.message,
        exportValue: (r) => r.message,
    },
];

export default function DeliveryCapacityPage() {
    const { forecast, loading, error, refetch } = usePortfolioCapacityForecast();

    if (loading) {
        return (
            <PageContainer>
                <PageSkeleton />
            </PageContainer>
        );
    }

    const weekLabel = forecast ? formatWeekLabel(forecast.weekStart) : '—';
    const highConflicts = forecast?.conflicts.filter((c) => c.severity === 'HIGH').length ?? 0;

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="Delivery Command"
                title="Capacity Focus"
                description="Current-week view of whether project allocations match weekly planner hours — who has capacity, which projects are under-planned, and what needs action."
                action={
                    <Button variant="outline" size="sm" onClick={() => void refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                }
            />

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-critical-border bg-critical-bg px-4 py-3 text-sm text-critical flex items-start gap-2"
                >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            <Section
                title="How to read this page"
                description={`Figures are for the week starting ${weekLabel}. Standard capacity is ${forecast?.capacityHoursPerWeek ?? 40}h per person per week.`}
            >
                <div className="grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
                    <div className="dashboard-card p-4 space-y-2">
                        <p className="font-semibold text-foreground flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Expected hours
                        </p>
                        <p>
                            Derived from <strong className="text-foreground">project_allocations</strong> — if someone is
                            50% on a project, they should plan ~20h that week (of 40h capacity).
                        </p>
                    </div>
                    <div className="dashboard-card p-4 space-y-2">
                        <p className="font-semibold text-foreground flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Planned hours
                        </p>
                        <p>
                            What is entered in the <strong className="text-foreground">weekly planner</strong> for that
                            project and person this week.
                        </p>
                    </div>
                    <div className="dashboard-card p-4 space-y-2">
                        <p className="font-semibold text-foreground">Gap</p>
                        <p>
                            Expected minus planned on a project. A positive gap means allocated people are not fully
                            planned in the weekly grid yet.
                        </p>
                    </div>
                    <div className="dashboard-card p-4 space-y-2">
                        <p className="font-semibold text-foreground">Available hours</p>
                        <p>
                            Remaining capacity after planned hours across all projects. Negative or over-100%
                            utilization means someone is over-committed.
                        </p>
                    </div>
                </div>
            </Section>

            <MetricGrid columns={{ sm: 2, xl: 4 }}>
                <MetricCard
                    label="Team members in scope"
                    value={String(forecast?.employeeCount ?? 0)}
                    hint={`Across ${forecast?.projectCount ?? 0} active projects`}
                />
                <MetricCard
                    label="Planned hours (portfolio)"
                    value={`${forecast?.committedHours ?? 0}h`}
                    accent="sky"
                    hint="Sum of weekly planner hours on your projects"
                />
                <MetricCard
                    label="Available capacity"
                    value={`${forecast?.availableHours ?? 0}h`}
                    accent="emerald"
                    hint="Free hours after planned load"
                />
                <MetricCard
                    label="Planning gap"
                    value={`${forecast?.capacityGapHours ?? 0}h`}
                    accent={(forecast?.capacityGapHours ?? 0) > 0 ? 'amber' : 'emerald'}
                    hint="Expected from allocations not yet in planner"
                />
            </MetricGrid>

            <MetricGrid columns={{ sm: 2, xl: 2 }}>
                <MetricCard
                    label="Portfolio utilization"
                    value={`${forecast?.utilizationPercent ?? 0}%`}
                    hint="Planned portfolio hours ÷ total team capacity"
                />
                <MetricCard
                    label="Issues flagged"
                    value={String(forecast?.conflicts.length ?? 0)}
                    accent={highConflicts > 0 ? 'rose' : 'slate'}
                    hint={`${highConflicts} high severity`}
                />
            </MetricGrid>

            {forecast?.recommendation && (
                <div
                    className={`dashboard-card p-5 border-l-4 ${
                        (forecast.employeeCount ?? 0) === 0 && (forecast.projectCount ?? 0) === 0
                            ? 'border-l-amber-500'
                            : 'border-l-brand-500'
                    }`}
                >
                    <p className="text-sm font-semibold text-foreground mb-1">
                        {(forecast.employeeCount ?? 0) === 0 ? 'Why this page is empty' : 'Recommended action'}
                    </p>
                    <p className="text-sm text-muted-foreground">{forecast.recommendation}</p>
                </div>
            )}

            <Section
                title="By project"
                description="Compare allocation-based expectation vs what is planned this week."
            >
                <EnterpriseDataTable
                    columns={projectColumns}
                    rows={forecast?.projects ?? []}
                    rowKey={(r) => r.projectId}
                    exportFilename="capacity-by-project"
                    storageKey="dm-capacity-projects"
                    emptyTitle="No projects in scope"
                    emptyDescription="Active projects with allocations will appear here."
                />
            </Section>

            <Section title="By resource" description="Weekly load per person — portfolio and org-wide planned hours.">
                <EnterpriseDataTable
                    columns={employeeColumns}
                    rows={forecast?.employees ?? []}
                    rowKey={(r) => r.employeeId}
                    exportFilename="capacity-by-resource"
                    storageKey="dm-capacity-employees"
                    emptyTitle="No allocated resources"
                    emptyDescription="Staff project_allocations to see resource capacity."
                />
            </Section>

            {(forecast?.conflicts.length ?? 0) > 0 && (
                <Section title="Issues to resolve" description="Gaps between allocations and planner, or over-capacity.">
                    <EnterpriseDataTable
                        columns={conflictColumns}
                        rows={forecast?.conflicts ?? []}
                        rowKey={(r) => `${r.type}-${r.employeeId}-${r.projectId ?? 'na'}-${r.message.slice(0, 40)}`}
                        exportFilename="capacity-conflicts"
                        storageKey="dm-capacity-conflicts"
                        emptyTitle="No issues"
                    />
                </Section>
            )}
        </PageContainer>
    );
}
