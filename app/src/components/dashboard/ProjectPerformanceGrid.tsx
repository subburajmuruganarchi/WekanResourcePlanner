import { useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardCard, DashboardSectionHeader } from './DashboardCard';

export type ProjectHealth = 'Healthy' | 'At Risk' | 'Critical';

export interface ProjectPerformanceRow {
    projectId: string;
    projectName: string;
    projectCode: string;
    manager?: string;
    teamSize: number;
    allocatedHours: number;
    actualHours: number;
    utilizationPercent: number;
    risk: ProjectHealth;
    status: string;
}

type SortKey = keyof Pick<
    ProjectPerformanceRow,
    'projectName' | 'allocatedHours' | 'actualHours' | 'utilizationPercent' | 'teamSize'
>;

interface ProjectPerformanceGridProps {
    rows: ProjectPerformanceRow[];
    loading?: boolean;
    onRowClick?: (projectId: string) => void;
}

const PAGE_SIZE = 8;

const riskStyles: Record<ProjectHealth, string> = {
    Healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'At Risk': 'bg-amber-50 text-amber-800 border-amber-200',
    Critical: 'bg-red-50 text-red-700 border-red-200',
};

export function ProjectPerformanceGrid({ rows, loading, onRowClick }: ProjectPerformanceGridProps) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('allocatedHours');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = rows;
        if (q) {
            list = list.filter(
                (r) =>
                    r.projectName.toLowerCase().includes(q) ||
                    r.projectCode.toLowerCase().includes(q) ||
                    (r.manager?.toLowerCase().includes(q) ?? false)
            );
        }
        return [...list].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === 'string' && typeof bv === 'string') {
                return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return sortDir === 'asc'
                ? Number(av) - Number(bv)
                : Number(bv) - Number(av);
        });
    }, [rows, search, sortKey, sortDir]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) =>
        sortKey === col ? (
            sortDir === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
            ) : (
                <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
            )
        ) : null;

    if (loading) {
        return <div className="dashboard-card h-96 animate-pulse bg-slate-50" />;
    }

    return (
        <section>
            <DashboardSectionHeader
                title="Project performance"
                description="Delivery health across active initiatives — sort, filter, and export."
                action={
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={rows.length === 0}>
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </Button>
                }
            />
            <DashboardCard padding="none" className="overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            placeholder="Search projects…"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            aria-label="Search projects"
                        />
                    </div>
                    <p className="text-xs text-slate-500">{filtered.length} projects</p>
                </div>
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-sm border-collapse min-w-[880px]">
                        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
                            <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                <th className="px-4 py-3 border-b border-slate-100">
                                    <button type="button" onClick={() => toggleSort('projectName')} className="hover:text-slate-800">
                                        Project <SortIcon col="projectName" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 border-b border-slate-100">Manager</th>
                                <th className="px-4 py-3 border-b border-slate-100 text-right">
                                    <button type="button" onClick={() => toggleSort('teamSize')} className="hover:text-slate-800">
                                        Team <SortIcon col="teamSize" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 border-b border-slate-100 text-right">
                                    <button type="button" onClick={() => toggleSort('allocatedHours')} className="hover:text-slate-800">
                                        Allocated h <SortIcon col="allocatedHours" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 border-b border-slate-100 text-right">
                                    <button type="button" onClick={() => toggleSort('actualHours')} className="hover:text-slate-800">
                                        Actual h <SortIcon col="actualHours" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 border-b border-slate-100 text-right">
                                    <button type="button" onClick={() => toggleSort('utilizationPercent')} className="hover:text-slate-800">
                                        Util % <SortIcon col="utilizationPercent" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 border-b border-slate-100">Risk</th>
                                <th className="px-4 py-3 border-b border-slate-100">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                                        No projects match your search.
                                    </td>
                                </tr>
                            ) : (
                                pageRows.map((row) => (
                                    <tr
                                        key={row.projectId}
                                        className={cn(
                                            'border-b border-slate-50 hover:bg-brand-50/30 transition-colors',
                                            onRowClick && 'cursor-pointer'
                                        )}
                                        onClick={() => onRowClick?.(row.projectId)}
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-900 block">{row.projectName}</span>
                                            <span className="text-[11px] text-slate-400 font-mono">{row.projectCode}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{row.manager ?? '—'}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{row.teamSize}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{Math.round(row.allocatedHours)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{Math.round(row.actualHours)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums font-medium">{row.utilizationPercent}%</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={cn('text-[10px] font-semibold', riskStyles[row.risk])}>
                                                {row.risk}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{row.status}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {pageCount > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
                        <span>
                            Page {page + 1} of {pageCount}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pageCount - 1}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </DashboardCard>
        </section>
    );
}
