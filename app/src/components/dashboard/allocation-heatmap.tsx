import { useMemo } from 'react';

export interface HeatmapCell {
    employeeId: string;
    projectId: string;
    percent: number;
}

export interface AllocationHeatmapProps {
    projects: { id: string; name: string; code: string }[];
    employees: { id: string; name: string; totalPercent: number }[];
    cells: HeatmapCell[];
    loading?: boolean;
}

function cellColor(percent: number): string {
    if (percent <= 0) return 'bg-gray-50';
    if (percent < 25) return 'bg-emerald-100';
    if (percent < 50) return 'bg-emerald-300';
    if (percent < 75) return 'bg-amber-300';
    return 'bg-red-400';
}

export function AllocationHeatmap({ projects, employees, cells, loading }: AllocationHeatmapProps) {
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
        <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
                <thead>
                    <tr>
                        <th className="text-left p-2 sticky left-0 bg-white border-b text-gray-500 font-medium min-w-[120px]">
                            Resource
                        </th>
                        {projects.map((p) => (
                            <th
                                key={p.id}
                                className="p-2 border-b text-gray-600 font-medium max-w-[72px] truncate"
                                title={`${p.name} (${p.code})`}
                            >
                                {p.code || p.name.slice(0, 8)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {employees.map((emp) => (
                        <tr key={emp.id} className="border-b border-gray-100">
                            <td className="p-2 sticky left-0 bg-white font-medium text-gray-800 truncate max-w-[140px]">
                                {emp.name}
                                <span className="text-gray-400 ml-1" title="Peak combined allocation on busiest day">(peak {emp.totalPercent}%)</span>
                            </td>
                            {projects.map((p) => {
                                const pct = cellMap.get(`${emp.id}:${p.id}`) ?? 0;
                                return (
                                    <td key={p.id} className="p-1">
                                        <div
                                            className={`h-8 rounded flex items-center justify-center text-[10px] font-medium ${cellColor(pct)} ${pct > 0 ? 'text-gray-800' : 'text-gray-300'}`}
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
            <div className="flex gap-3 mt-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100" /> &lt;25%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300" /> 50–75%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> 75%+</span>
            </div>
        </div>
    );
}
