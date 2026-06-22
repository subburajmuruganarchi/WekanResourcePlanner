import { LayoutGrid, GanttChart, Grid3X3, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AllocationViewMode } from './types';

const VIEWS: { id: AllocationViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'timeline', label: 'Timeline', icon: GanttChart },
    { id: 'grid', label: 'Grid', icon: LayoutGrid },
    { id: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
    { id: 'capacity', label: 'Capacity', icon: BarChart3 },
];

interface ViewSwitcherProps {
    value: AllocationViewMode;
    onChange: (mode: AllocationViewMode) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">View</span>
            <div
                className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
                role="tablist"
                aria-label="Allocation view"
            >
                {VIEWS.map((view) => {
                    const Icon = view.icon;
                    const active = value === view.id;
                    return (
                        <button
                            key={view.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => onChange(view.id)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                active
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {view.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
