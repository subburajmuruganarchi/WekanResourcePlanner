import type { PortfolioHealthRow } from '@/lib/portfolio-health-rows';
import type { DataTableColumn } from './enterprise-data-table';
import { HealthBadge } from './status-badge';

export function portfolioTableColumns(options?: { includeOwner?: boolean }): DataTableColumn<PortfolioHealthRow>[] {
    const cols: DataTableColumn<PortfolioHealthRow>[] = [
        {
            id: 'project',
            header: 'Project',
            accessor: (row) => <span className="font-medium text-card-foreground">{row.projectName}</span>,
            sortValue: (row) => row.projectName,
            exportValue: (row) => row.projectName,
        },
        {
            id: 'health',
            header: 'Health',
            accessor: (row) => <HealthBadge health={row.health} />,
            sortValue: (row) => ({ Red: 0, Amber: 1, Green: 2 }[row.health]),
            exportValue: (row) => row.health,
        },
        {
            id: 'progress',
            header: 'Progress',
            accessor: (row) => <span className="tabular-nums">{row.progress}%</span>,
            sortValue: (row) => row.progress,
            exportValue: (row) => `${row.progress}%`,
        },
        {
            id: 'confidence',
            header: 'Confidence',
            accessor: (row) => <span className="font-medium tabular-nums">{row.confidence}%</span>,
            sortValue: (row) => row.confidence,
            exportValue: (row) => `${row.confidence}%`,
        },
    ];

    if (options?.includeOwner !== false) {
        cols.push({
            id: 'owner',
            header: 'Delivery Manager',
            accessor: (row) => <span className="text-muted-foreground">{row.owner}</span>,
            sortValue: (row) => row.owner,
            exportValue: (row) => row.owner,
            hideOnMobile: true,
        });
    }

    return cols;
}
