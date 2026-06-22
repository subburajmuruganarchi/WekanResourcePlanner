import { useMemo } from 'react';
import { EnterpriseHeatmap } from '@/components/dashboard/EnterpriseHeatmap';
import type { AllocationGridRow } from '../allocation-weekly-grid';
import { buildHeatmapCells } from './allocation-metrics';

interface HeatmapViewProps {
    rows: AllocationGridRow[];
    weeks: string[];
    loading?: boolean;
}

export function HeatmapView({ rows, weeks, loading }: HeatmapViewProps) {
    const { projects, employees, cells } = useMemo(() => {
        const projectMap = new Map<string, { name: string; code: string }>();
        const employeeMap = new Map<string, string>();
        const empPeak = new Map<string, number>();

        for (const row of rows) {
            if (row.projectId) {
                projectMap.set(row.projectId, {
                    name: row.projectName,
                    code: row.projectCode ?? '',
                });
            }
            if (row.employeeId) {
                employeeMap.set(row.employeeId, row.employeeName);
            }
        }

        const heatCells = buildHeatmapCells(rows, weeks);
        for (const c of heatCells) {
            empPeak.set(c.employeeId, Math.max(empPeak.get(c.employeeId) ?? 0, c.percent));
        }

        return {
            projects: [...projectMap.entries()]
                .map(([id, p]) => ({ id, name: p.name, code: p.code }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            employees: [...employeeMap.entries()]
                .map(([id, name]) => ({
                    id,
                    name,
                    totalPercent: empPeak.get(id) ?? 0,
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            cells: heatCells,
        };
    }, [rows, weeks]);

    return (
        <div className="dashboard-card p-4 sm:p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Allocation Heatmap</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                    Employee × project split across the selected planning window.
                </p>
            </div>
            <EnterpriseHeatmap
                projects={projects}
                employees={employees}
                cells={cells}
                meta={{
                    totalProjects: projects.length,
                    totalEmployees: employees.length,
                    truncated: false,
                    employeeLimit: employees.length,
                    projectLimit: projects.length,
                }}
                loading={loading}
            />
            <HeatmapLegend />
        </div>
    );
}

function HeatmapLegend() {
    const items = [
        { className: 'bg-sky-100', label: '0–50% Available' },
        { className: 'bg-indigo-200', label: '50–85% Healthy' },
        { className: 'bg-amber-200', label: '85–100% High' },
        { className: 'bg-orange-400', label: '100%+ Overallocated' },
    ];

    return (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
            <span className="font-semibold text-slate-800">Legend</span>
            {items.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                    <span className={`h-3 w-6 rounded ${item.className}`} aria-hidden />
                    {item.label}
                </span>
            ))}
        </div>
    );
}
