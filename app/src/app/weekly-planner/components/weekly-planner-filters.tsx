import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Employee, Project } from '@/types/api';
import type { UtilizationFilterState, WeeklyGridFilters } from '@/types/weekly-allocation';
import { Search, RotateCcw } from 'lucide-react';

interface WeeklyPlannerFiltersProps {
    draft: WeeklyGridFilters;
    onChange: (next: WeeklyGridFilters) => void;
    onApply: () => void;
    onReset: () => void;
    employees: Employee[];
    projects: Project[];
    loading?: boolean;
}

const UTILIZATION_OPTIONS: { value: UtilizationFilterState; label: string }[] = [
    { value: 'all', label: 'All utilization' },
    { value: 'over_allocated', label: 'Over-allocated' },
    { value: 'bench', label: 'Bench (8h+ free)' },
    { value: 'high_utilization', label: 'High utilization (80%+)' },
];

export function WeeklyPlannerFilters({
    draft,
    onChange,
    onApply,
    onReset,
    employees,
    projects,
    loading,
}: WeeklyPlannerFiltersProps) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Week from</Label>
                    <Input
                        type="date"
                        className="w-[160px]"
                        value={draft.weekStartFrom}
                        onChange={(e) =>
                            onChange({ ...draft, weekStartFrom: e.target.value })
                        }
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Week to</Label>
                    <Input
                        type="date"
                        className="w-[160px]"
                        value={draft.weekStartTo}
                        onChange={(e) => onChange({ ...draft, weekStartTo: e.target.value })}
                    />
                </div>
                <div className="space-y-1 min-w-[200px]">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Employee</Label>
                    <Select
                        value={draft.employeeId ?? 'all'}
                        onValueChange={(v) =>
                            onChange({
                                ...draft,
                                employeeId: v === 'all' ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All employees" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All employees</SelectItem>
                            {employees.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                    {e.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1 min-w-[200px]">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Project</Label>
                    <Select
                        value={draft.projectId ?? 'all'}
                        onValueChange={(v) =>
                            onChange({
                                ...draft,
                                projectId: v === 'all' ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All projects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All projects</SelectItem>
                            {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.code} — {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1 min-w-[200px]">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Utilization</Label>
                    <Select
                        value={draft.utilization}
                        onValueChange={(v) =>
                            onChange({
                                ...draft,
                                utilization: v as UtilizationFilterState,
                            })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {UTILIZATION_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 pb-0.5">
                    <Button onClick={onApply} disabled={loading} className="bg-brand-500 hover:bg-brand-600">
                        <Search className="w-4 h-4 mr-2" />
                        Load grid
                    </Button>
                    <Button variant="outline" onClick={onReset} disabled={loading}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                </div>
            </div>
        </div>
    );
}
