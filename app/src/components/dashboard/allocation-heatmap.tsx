import { useMemo } from 'react';

export interface HeatmapCell {
    employeeId: string;
    projectId: string;
    percent: number;
}

export interface HeatmapMeta {
    totalEmployees: number;
    totalProjects: number;
    truncated: boolean;
    employeeLimit: number;
    projectLimit: number;
}

export interface AllocationHeatmapProps {
    projects: { id: string; name: string; code: string }[];
    employees: { id: string; name: string; totalPercent: number }[];
    cells: HeatmapCell[];
    meta?: HeatmapMeta | null;
    loading?: boolean;
}

function cellColor(percent: number): string {
    if (percent <= 0) return 'bg-gray-50';
    if (percent < 25) return 'bg-emerald-100';
    if (percent < 50) return 'bg-emerald-300';
    if (percent < 75) return 'bg-amber-300';
    return 'bg-red-400';
}

export function AllocationHeatmap({ projects, employees, cells, meta, loading }: AllocationHeatmapProps) {
    const cellMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const c of cells) {
            m.set(`${c.employeeId}:${c.projectId}`, c.percent);
        }
        return m;
    }, [cells]);

    if (loading) {
        return <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />;
    }

    if (projects.length === 0 || employees.length === 0) {
        return <p className="text-sm text-gray-500 py-8 text-center">No active allocations to display.</p>;
    }

    return (
        <div className="space-y-3">
            {meta?.truncated && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Showing {employees.length} of {meta.totalEmployees} resources and {projects.length} of{' '}
                    {meta.totalProjects} projects. Open Resource Allocation for the full matrix.
                </p>
            )}

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-gray-100 rounded-lg">
                <table className="w-full text-xs border-collapse min-w-max">
                    <thead className="sticky top-0 z-10 bg-white">
                        <tr>
                            <th className="text-left p-2 sticky left-0 bg-gray-50 border-b border-r text-gray-500 font-medium min-w-[160px] z-20">
                                Resource
                            </th>
                            {projects.map((p) => (
                                <th
                                    key={p.id}
                                    className="p-2 border-b text-left text-gray-600 font-medium min-w-[100px] max-w-[160px] align-bottom"
                                    title={p.code ? `${p.name} (${p.code})` : p.name}
                                >
                                    <span className="block leading-tight break-words">{p.name}</span>
                                    {p.code && (
                                        <span className="block text-[10px] text-gray-400 font-mono mt-0.5">
                                            {p.code}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <tr key={emp.id} className="border-b border-gray-100">
                                <td
                                    className="p-2 sticky left-0 bg-white border-r font-medium text-gray-800 min-w-[160px] z-10"
                                    title={emp.name}
                                >
                                    <span className="block leading-snug break-words">{emp.name}</span>
                                    <span
                                        className="block text-[10px] text-gray-400 mt-0.5 tabular-nums"
                                        title="Peak allocation in period"
                                    >
                                        peak {emp.totalPercent}%
                                    </span>
                                </td>
                                {projects.map((p) => {
                                    const pct = cellMap.get(`${emp.id}:${p.id}`) ?? 0;
                                    return (
                                        <td key={p.id} className="p-1">
                                            <div
                                                className={`h-8 min-w-[44px] rounded flex items-center justify-center text-[10px] font-medium tabular-nums ${cellColor(pct)} ${pct > 0 ? 'text-gray-800' : 'text-gray-300'}`}
                                                title={`${pct}%`}
                                            >
                                                {pct > 0 ? pct : '—'}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-emerald-100" /> &lt;25%
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-amber-300" /> 50–75%
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-400" /> 75%+
                </span>
            </div>
        </div>
    );
}
