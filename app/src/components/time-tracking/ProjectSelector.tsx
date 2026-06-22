import { useMemo, useState } from 'react';
import { GripVertical, Search, Star, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectChipColor } from '@/components/time-entry/project-color';
import {
    TIME_ENTRY_DRAG_TYPE,
    type DraggedProjectPayload,
    type ProjectOption,
} from '@/components/time-entry/time-entry-types';
import type { ProjectFilter } from './types';

interface ProjectSelectorProps {
    projects: ProjectOption[];
    disabled?: boolean;
    allocationByProject?: Map<string, { estimatedHours: number; percentage: number }>;
}

function DraggableProjectCard({
    project,
    disabled,
    estimatedHours,
    percentage,
}: {
    project: ProjectOption;
    disabled?: boolean;
    estimatedHours?: number;
    percentage?: number;
}) {
    const handleDragStart = (e: React.DragEvent) => {
        if (disabled) {
            e.preventDefault();
            return;
        }
        const payload: DraggedProjectPayload = {
            code: project.code,
            id: project.id,
            name: project.name,
        };
        e.dataTransfer.setData(TIME_ENTRY_DRAG_TYPE, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            draggable={!disabled}
            onDragStart={handleDragStart}
            className={cn(
                'group rounded-xl border px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all',
                projectChipColor(project.code),
                disabled && 'opacity-50 cursor-not-allowed',
                !disabled && 'hover:shadow-md hover:-translate-y-0.5'
            )}
            title={disabled ? undefined : `Drag to calendar: ${project.name}`}
        >
            <div className="flex items-start gap-2">
                <GripVertical className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-40 group-hover:opacity-70" />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{project.name}</p>
                    <p className="text-[10px] opacity-70 font-mono truncate">{project.code}</p>
                    {estimatedHours != null && estimatedHours > 0 && (
                        <p className="text-[10px] mt-1 opacity-80">
                            Remaining: ~{estimatedHours}h ({percentage}%)
                        </p>
                    )}
                    {project.isAllocated && (
                        <span className="inline-block mt-1 text-[9px] font-medium uppercase tracking-wide opacity-70">
                            Billable · Allocated
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ProjectSelector({
    projects,
    disabled,
    allocationByProject,
}: ProjectSelectorProps) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<ProjectFilter>('all');
    const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

    const filtered = useMemo(() => {
        let list = projects;
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
            );
        }
        if (filter === 'allocated') list = list.filter((p) => p.isAllocated);
        if (filter === 'favorite') list = list.filter((p) => favorites.has(p.id));
        if (filter === 'billable') list = list.filter((p) => p.isAllocated);
        return list;
    }, [projects, search, filter, favorites]);

    const toggleFavorite = (id: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const FILTERS: { id: ProjectFilter; label: string }[] = [
        { id: 'all', label: 'Active' },
        { id: 'allocated', label: 'Allocated' },
        { id: 'favorite', label: 'Favorites' },
        { id: 'billable', label: 'Billable' },
    ];

    return (
        <aside className="w-full lg:w-64 xl:w-72 shrink-0">
            <div className="dashboard-card overflow-hidden sticky top-20">
                <div className="px-3 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Projects</p>
                        <p className="text-[10px] text-slate-500">Search, filter, drag to calendar</p>
                    </div>
                </div>

                <div className="p-3 space-y-3 border-b border-slate-50">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search projects…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="tt-filter-input pl-8"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setFilter(f.id)}
                                className={cn(
                                    'rounded-lg px-2 py-1 text-[10px] font-medium transition-colors',
                                    filter === f.id
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-2 space-y-2 max-h-[min(480px,55vh)] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No projects match</p>
                    ) : (
                        filtered.map((p) => {
                            const alloc = allocationByProject?.get(p.id);
                            return (
                                <div key={p.id} className="relative">
                                    <button
                                        type="button"
                                        className="absolute right-2 top-2 z-10 p-0.5 rounded hover:bg-white/50"
                                        onClick={() => toggleFavorite(p.id)}
                                        aria-label={
                                            favorites.has(p.id)
                                                ? 'Remove from favorites'
                                                : 'Add to favorites'
                                        }
                                    >
                                        <Star
                                            className={cn(
                                                'w-3 h-3',
                                                favorites.has(p.id)
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-slate-400'
                                            )}
                                        />
                                    </button>
                                    <DraggableProjectCard
                                        project={p}
                                        disabled={disabled}
                                        estimatedHours={alloc?.estimatedHours}
                                        percentage={alloc?.percentage}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </aside>
    );
}
