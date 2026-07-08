import type { PmProjectHoursRow } from '@/lib/pm-dashboard-metrics';
import type { DataTableColumn } from '@/components/patterns/enterprise-data-table';
import { StatusBadge } from '@/components/patterns';

function riskVariant(level?: string): 'success' | 'warning' | 'critical' | 'neutral' {
    if (level === 'HIGH') return 'critical';
    if (level === 'MEDIUM') return 'warning';
    if (level === 'LOW') return 'success';
    return 'neutral';
}

function formatHours(value: number): string {
    return `${Math.round(value)}h`;
}

function formatDelta(value: number): string {
    const rounded = Math.round(value);
    if (rounded > 0) return `+${rounded}h`;
    return `${rounded}h`;
}

function riskSortOrder(level?: PmProjectHoursRow['riskLevel']): number {
    switch (level) {
        case 'HIGH':
            return 0;
        case 'MEDIUM':
            return 1;
        case 'LOW':
            return 2;
        default:
            return 3;
    }
}

export function pmProjectDeliveryColumns(): DataTableColumn<PmProjectHoursRow>[] {
    return [
        {
            id: 'project',
            header: 'Project',
            accessor: (row) => (
                <div>
                    <p className="font-medium text-card-foreground">{row.projectName}</p>
                    <p className="text-xs text-muted-foreground">{row.projectCode}</p>
                </div>
            ),
            sortValue: (row) => row.projectName,
            exportValue: (row) => row.projectName,
        },
        {
            id: 'status',
            header: 'Status',
            accessor: (row) => <span className="text-muted-foreground">{row.status}</span>,
            sortValue: (row) => row.status,
            exportValue: (row) => row.status,
        },
        {
            id: 'team',
            header: 'Team',
            accessor: (row) => <span className="tabular-nums">{row.teamSize}</span>,
            sortValue: (row) => row.teamSize,
            exportValue: (row) => String(row.teamSize),
            hideOnMobile: true,
        },
        {
            id: 'planned',
            header: 'Planned',
            accessor: (row) => <span className="tabular-nums">{formatHours(row.plannedHours)}</span>,
            sortValue: (row) => row.plannedHours,
            exportValue: (row) => formatHours(row.plannedHours),
        },
        {
            id: 'actual',
            header: 'Actual',
            accessor: (row) => <span className="tabular-nums">{formatHours(row.actualHours)}</span>,
            sortValue: (row) => row.actualHours,
            exportValue: (row) => formatHours(row.actualHours),
        },
        {
            id: 'delta',
            header: 'Δ',
            accessor: (row) => (
                <span
                    className={
                        row.deltaHours > 0
                            ? 'tabular-nums text-amber-600 dark:text-amber-400 font-medium'
                            : row.deltaHours < 0
                              ? 'tabular-nums text-sky-600 dark:text-sky-400'
                              : 'tabular-nums text-muted-foreground'
                    }
                >
                    {formatDelta(row.deltaHours)}
                </span>
            ),
            sortValue: (row) => row.deltaHours,
            exportValue: (row) => formatDelta(row.deltaHours),
        },
        {
            id: 'risk',
            header: 'Risk',
            accessor: (row) =>
                row.riskLevel ? (
                    <StatusBadge variant={riskVariant(row.riskLevel)}>{row.riskLevel}</StatusBadge>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                ),
            sortValue: (row) => riskSortOrder(row.riskLevel),
            exportValue: (row) => row.riskLevel ?? '—',
            hideOnMobile: true,
        },
    ];
}
