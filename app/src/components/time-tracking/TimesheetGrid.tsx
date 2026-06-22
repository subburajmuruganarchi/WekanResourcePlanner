import { useMemo, useState } from 'react';
import { Download, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GridRow } from './types';

interface TimesheetGridProps {
    rows: GridRow[];
    onExport?: () => void;
}

export function TimesheetGrid({ rows, onExport }: TimesheetGridProps) {
    const [sortKey, setSortKey] = useState<keyof GridRow>('date');
    const [sortAsc, setSortAsc] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    const sorted = useMemo(() => {
        let list = [...rows];
        if (statusFilter) list = list.filter((r) => r.status === statusFilter);
        list.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
            return sortAsc ? cmp : -cmp;
        });
        return list;
    }, [rows, sortKey, sortAsc, statusFilter]);

    const toggleSort = (key: keyof GridRow) => {
        if (sortKey === key) setSortAsc((v) => !v);
        else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    const statuses = [...new Set(rows.map((r) => r.status))];

    return (
        <div className="dashboard-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Timesheet Grid</h3>
                    <p className="text-xs text-slate-500">{sorted.length} entries</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="tt-filter-input w-auto min-w-[120px]"
                    >
                        <option value="">All statuses</option>
                        {statuses.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    {onExport && (
                        <Button type="button" variant="outline" size="sm" className="h-8" onClick={onExport}>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Export
                        </Button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                            {(
                                [
                                    ['employee', 'Employee'],
                                    ['project', 'Project'],
                                    ['task', 'Task'],
                                    ['date', 'Date'],
                                    ['hours', 'Hours'],
                                    ['status', 'Status'],
                                ] as const
                            ).map(([key, label]) => (
                                <th key={key} className="px-4 py-2.5 text-left">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500 hover:text-slate-800"
                                        onClick={() => toggleSort(key)}
                                    >
                                        {label}
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                                    No entries for this week
                                </td>
                            </tr>
                        ) : (
                            sorted.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-slate-50 hover:bg-slate-50/50"
                                >
                                    <td className="px-4 py-2.5 font-medium text-slate-900">{row.employee}</td>
                                    <td className="px-4 py-2.5 text-slate-700">{row.project}</td>
                                    <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">
                                        {row.task}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-600 tabular-nums">{row.date}</td>
                                    <td className="px-4 py-2.5 font-semibold tabular-nums">{row.hours}h</td>
                                    <td className="px-4 py-2.5">
                                        <StatusPill status={row.status} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusPill({ status }: { status: string }) {
    const styles: Record<string, string> = {
        Draft: 'bg-amber-50 text-amber-800',
        Submitted: 'bg-blue-50 text-blue-700',
        PM_Approved: 'bg-emerald-50 text-emerald-700',
        PM_Rejected: 'bg-red-50 text-red-700',
    };
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}
        >
            {status === 'PM_Approved' ? 'Approved' : status}
        </span>
    );
}
