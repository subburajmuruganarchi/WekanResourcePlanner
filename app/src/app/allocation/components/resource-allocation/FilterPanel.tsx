import { useMemo, useState } from 'react';
import { Filter, Bookmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Employee } from '@/types/api';
import type { AllocationGridRow } from '../allocation-weekly-grid';
import type { AllocationWorkspaceFilters } from './types';
import { DEFAULT_WORKSPACE_FILTERS } from './types';
import { computeEmployeeWeekTotals, DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/lib/weekly-grid-pivot';

interface FilterPanelProps {
    filters: AllocationWorkspaceFilters;
    onChange: (next: AllocationWorkspaceFilters) => void;
    projects: { id: string; name: string }[];
    employees: Employee[];
    projectSearch: string;
    resourceSearch: string;
    onProjectSearchChange: (v: string) => void;
    onResourceSearchChange: (v: string) => void;
}

const SAVED_VIEWS = [
    { id: 'all', label: 'All resources' },
    { id: 'overloaded', label: 'Over capacity' },
    { id: 'available', label: 'Available bench' },
];

export function FilterPanel({
    filters,
    onChange,
    projects,
    employees,
    projectSearch,
    resourceSearch,
    onProjectSearchChange,
    onResourceSearchChange,
}: FilterPanelProps) {
    const [expanded, setExpanded] = useState(true);
    const [activeView, setActiveView] = useState('all');

    const roles = useMemo(() => {
        const set = new Set<string>();
        for (const e of employees) {
            const r = e.jobRole || e.position || '';
            if (r) set.add(r);
        }
        return [...set].sort();
    }, [employees]);

    const skills = useMemo(() => {
        const set = new Set<string>();
        for (const e of employees) {
            for (const s of e.skills ?? []) {
                if (s.name) set.add(s.name);
            }
        }
        return [...set].sort();
    }, [employees]);

    const departments = useMemo(() => {
        const set = new Set<string>();
        for (const e of employees) {
            if (e.department) set.add(e.department);
        }
        return [...set].sort();
    }, [employees]);

    const applySavedView = (viewId: string) => {
        setActiveView(viewId);
        if (viewId === 'overloaded') {
            onChange({ ...filters, availability: 'overloaded', utilizationMin: 85 });
        } else if (viewId === 'available') {
            onChange({ ...filters, availability: 'available', utilizationMax: 30 });
        } else {
            onChange({ ...DEFAULT_WORKSPACE_FILTERS });
        }
    };

    const activeFilterCount = [
        filters.projectId,
        filters.role,
        filters.skill,
        filters.department,
        filters.availability !== 'all',
        filters.utilizationMin > 0 || filters.utilizationMax < 150,
    ].filter(Boolean).length;

    return (
        <div className="dashboard-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-900">Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setExpanded((e) => !e)}
                    >
                        {expanded ? 'Collapse' : 'Expand'}
                    </Button>
                    {activeFilterCount > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-slate-500"
                            onClick={() => {
                                onChange(DEFAULT_WORKSPACE_FILTERS);
                                setActiveView('all');
                            }}
                        >
                            <X className="w-3 h-3 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-slate-50">
                <span className="text-[11px] font-medium text-slate-500 self-center">My Views</span>
                {SAVED_VIEWS.map((v) => (
                    <button
                        key={v.id}
                        type="button"
                        onClick={() => applySavedView(v.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            activeView === v.id
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Bookmark className="w-3 h-3" />
                        {v.label}
                    </button>
                ))}
            </div>

            {expanded && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    <FilterField label="Search project">
                        <input
                            type="search"
                            value={projectSearch}
                            onChange={(e) => onProjectSearchChange(e.target.value)}
                            placeholder="Project name…"
                            className="filter-input"
                        />
                    </FilterField>
                    <FilterField label="Search resource">
                        <input
                            type="search"
                            value={resourceSearch}
                            onChange={(e) => onResourceSearchChange(e.target.value)}
                            placeholder="Employee name…"
                            className="filter-input"
                        />
                    </FilterField>
                    <FilterField label="Project">
                        <select
                            value={filters.projectId}
                            onChange={(e) => onChange({ ...filters, projectId: e.target.value })}
                            className="filter-input"
                        >
                            <option value="">All projects</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </FilterField>
                    <FilterField label="Role">
                        <select
                            value={filters.role}
                            onChange={(e) => onChange({ ...filters, role: e.target.value })}
                            className="filter-input"
                        >
                            <option value="">All roles</option>
                            {roles.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </FilterField>
                    <FilterField label="Skill">
                        <select
                            value={filters.skill}
                            onChange={(e) => onChange({ ...filters, skill: e.target.value })}
                            className="filter-input"
                        >
                            <option value="">All skills</option>
                            {skills.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </FilterField>
                    <FilterField label="Department">
                        <select
                            value={filters.department}
                            onChange={(e) => onChange({ ...filters, department: e.target.value })}
                            className="filter-input"
                        >
                            <option value="">All departments</option>
                            {departments.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </FilterField>
                    <FilterField label="Availability">
                        <select
                            value={filters.availability}
                            onChange={(e) =>
                                onChange({
                                    ...filters,
                                    availability: e.target.value as AllocationWorkspaceFilters['availability'],
                                })
                            }
                            className="filter-input"
                        >
                            <option value="all">All</option>
                            <option value="available">Available (&lt;30%)</option>
                            <option value="partial">Partial (30–85%)</option>
                            <option value="overloaded">Overloaded (&gt;100%)</option>
                        </select>
                    </FilterField>
                    <FilterField label="Utilization min %">
                        <input
                            type="number"
                            min={0}
                            max={200}
                            value={filters.utilizationMin}
                            onChange={(e) =>
                                onChange({ ...filters, utilizationMin: Number(e.target.value) || 0 })
                            }
                            className="filter-input"
                        />
                    </FilterField>
                    <FilterField label="Utilization max %">
                        <input
                            type="number"
                            min={0}
                            max={200}
                            value={filters.utilizationMax}
                            onChange={(e) =>
                                onChange({ ...filters, utilizationMax: Number(e.target.value) || 150 })
                            }
                            className="filter-input"
                        />
                    </FilterField>
                </div>
            )}
        </div>
    );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500">{label}</span>
            {children}
        </label>
    );
}

/** Client-side filter applied on top of search. */
export function applyWorkspaceFilters(
    rows: AllocationGridRow[],
    filters: AllocationWorkspaceFilters,
    weeks: string[],
    employees: Employee[]
): AllocationGridRow[] {
    const empById = new Map(employees.map((e) => [e.id, e]));
    const totals = computeEmployeeWeekTotals(rows, weeks);

    const employeeUtil = new Map<string, number>();
    for (const e of employees) {
        let maxPct = 0;
        for (const week of weeks) {
            const h = totals.get(`${e.id}:${week}`) ?? 0;
            const pct = (h / DEFAULT_WEEKLY_CAPACITY_HOURS) * 100;
            maxPct = Math.max(maxPct, pct);
        }
        employeeUtil.set(e.id, maxPct);
    }

    return rows.filter((row) => {
        if (filters.projectId && row.projectId !== filters.projectId) return false;

        if (row.employeeId) {
            const emp = empById.get(row.employeeId);
            if (filters.role) {
                const role = emp?.jobRole || emp?.position || row.employeeRole || '';
                if (role !== filters.role) return false;
            }
            if (filters.skill) {
                const hasSkill = emp?.skills?.some((s) => s.name === filters.skill);
                if (!hasSkill) return false;
            }
            if (filters.department) {
                const dept = emp?.department ?? '';
                if (dept !== filters.department) return false;
            }

            const util = employeeUtil.get(row.employeeId) ?? 0;
            if (util < filters.utilizationMin || util > filters.utilizationMax) return false;

            if (filters.availability === 'available' && util >= 30) return false;
            if (filters.availability === 'partial' && (util < 30 || util > 100)) return false;
            if (filters.availability === 'overloaded' && util <= 100) return false;
        }

        return true;
    });
}
