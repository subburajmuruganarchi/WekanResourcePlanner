import { useMemo, useState } from 'react';
import { Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AllocationHeatmapProps } from './allocation-heatmap';

function cellColor(percent: number): string {
    if (percent <= 0) return 'bg-slate-50 text-slate-300';
    if (percent <= 50) return 'bg-sky-100 text-sky-900';
    if (percent <= 85) return 'bg-brand-200 text-brand-700';
    if (percent <= 100) return 'bg-amber-200 text-amber-950';
    return 'bg-orange-400 text-white';
}

function cellLabel(percent: number): string {
    if (percent <= 0) return '—';
    return `${percent}%`;
}

export function EnterpriseHeatmap({
    projects,
    employees,
    cells,
    meta,
    loading,
    onOptimize,
}: AllocationHeatmapProps & { onOptimize?: () => void }) {
    const [zoom, setZoom] = useState(1);

    const cellMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const c of cells) {
            m.set(`${c.employeeId}:${c.projectId}`, c.percent);
        }
        return m;
    }, [cells]);

    if (loading) {
        return <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />;
    }

    if (projects.length === 0 || employees.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
                <p className="text-sm font-medium text-slate-700">No allocation data</p>
                <p className="text-xs text-slate-500 mt-1">Sync Project_Allocation or open Resource Allocation.</p>
            </div>
        );
    }

    const cellScale = { transform: `scale(${zoom})`, transformOrigin: 'top left' as const };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom((z) => Math.max(0.75, z - 0.1))}
                        aria-label="Zoom out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-slate-500 tabular-nums w-12 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom((z) => Math.min(1.25, z + 0.1))}
                        aria-label="Zoom in"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>
                {onOptimize && (
                    <Button size="sm" className="gap-1.5 enterprise-gradient-bg text-white border-0 hover:opacity-90" onClick={onOptimize}>
                        <Sparkles className="w-3.5 h-3.5" />
                        Optimize allocation
                    </Button>
                )}
            </div>

            {meta?.truncated && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Showing {employees.length} of {meta.totalEmployees} resources · {projects.length} of{' '}
                    {meta.totalProjects} projects
                </p>
            )}

            <div className="overflow-auto max-h-[480px] rounded-xl border border-border bg-card">
                <div style={cellScale}>
                <table className="text-xs border-collapse min-w-max" role="grid" aria-label="Resource allocation heatmap">
                    <caption className="sr-only">
                        Employee by project allocation intensity. Values show percentage of capacity allocated.
                    </caption>
                    <thead className="sticky top-0 z-10 bg-muted">
                        <tr>
                            <th scope="col" className="sticky left-0 z-20 bg-muted text-left p-3 border-b border-r border-border min-w-[180px] font-semibold text-muted-foreground">
                                Employee
                            </th>
                            {projects.map((p) => (
                                <th
                                    key={p.id}
                                    scope="col"
                                    className="p-3 border-b border-border text-left font-semibold text-muted-foreground min-w-[108px] max-w-[140px]"
                                    title={p.name}
                                >
                                    <span className="block truncate">{p.name}</span>
                                    {p.code && (
                                        <span className="block text-[10px] font-normal text-muted-foreground font-mono truncate">
                                            {p.code}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <tr key={emp.id} className="border-b border-border/50">
                                <th scope="row" className="sticky left-0 z-10 bg-card p-3 border-r border-border font-medium text-card-foreground min-w-[180px] text-left">
                                    <span className="block">{emp.name}</span>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">Peak {emp.totalPercent}%</span>
                                </th>
                                {projects.map((p) => {
                                    const pct = cellMap.get(`${emp.id}:${p.id}`) ?? 0;
                                    const label = `${emp.name} allocated ${pct}% to ${p.name}`;
                                    return (
                                        <td key={p.id} className="p-1.5" role="gridcell">
                                            <div
                                                className={`h-9 min-w-[52px] rounded-lg flex items-center justify-center text-[10px] font-semibold tabular-nums transition-transform hover:scale-105 ${cellColor(pct)}`}
                                                title={label}
                                                aria-label={label}
                                            >
                                                {cellLabel(pct)}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground" role="list" aria-label="Allocation intensity legend">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-100" /> 1–50% Low</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-200" /> 51–85% Optimal</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200" /> 86–100% High</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400" /> 100%+ Over</span>
            </div>
        </div>
    );
}
