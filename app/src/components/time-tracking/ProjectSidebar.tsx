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

interface ProjectSidebarProps {
    projects: ProjectOption[];
    disabled?: boolean;
    allocationByProject?: Map<string, { estimatedHours: number; percentage: number }>;
}

function DraggableProjectCard({
    project,
    disabled,
    estimatedHours,
    isFavorite,
    onToggleFavorite,
}: {
    project: ProjectOption;
    disabled?: boolean;
    estimatedHours?: number;
    isFavorite: boolean;
    onToggleFavorite: () => void;
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
                'relative flex items-center gap-3 rounded-xl border px-3 min-h-[72px] cursor-grab active:cursor-grabbing transition-shadow',
                projectChipColor(project.code),
                disabled && 'opacity-50 cursor-not-allowed',
                !disabled && 'hover:shadow-md'
            )}
            title={disabled ? undefined : `Drag to calendar: ${project.name}`}
        >
            <GripVertical className="w-4 h-4 shrink-0 opacity-40" />
            <div className="min-w-0 flex-1 pr-6">
                <p className="text-sm font-semibold text-slate-900 truncate leading-snug">{project.name}</p>
                <p className="text-xs text-slate-600/80 font-mono truncate mt-0.5">{project.code}</p>
                {estimatedHours != null && estimatedHours > 0 && (
                    <p className="text-xs text-slate-600 mt-1 tabular-nums">~{estimatedHours}h remaining</p>
                )}
            </div>
            <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/50"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                }}
                aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
                <Star
                    className={cn(
                        'w-4 h-4',
                        isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    )}
                />
            </button>
        </div>
    );
}

const FILTERS: { id: ProjectFilter; label: string }[] = [
    { id: 'all', label: 'Active' },
    { id: 'allocated', label: 'Allocated' },
    { id: 'favorite', label: 'Favorites' },
    { id: 'billable', label: 'Billable' },
];

export function ProjectSidebar({ projects, disabled, allocationByProject }: ProjectSidebarProps) {
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

    return (
        <div className="tt-card flex flex-col w-full max-h-[360px]">
            <div className="p-6 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="search"
                        placeholder="Search projects…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="tt-filter-input pl-10"
                    />
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    {FILTERS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                                filter === f.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4 tt-scroll min-h-0">
                {filtered.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">No projects match</p>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((p) => (
                            <DraggableProjectCard
                                key={p.id}
                                project={p}
                                disabled={disabled}
                                estimatedHours={allocationByProject?.get(p.id)?.estimatedHours}
                                isFavorite={favorites.has(p.id)}
                                onToggleFavorite={() => toggleFavorite(p.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/** @deprecated Use ProjectSidebar */
export const ProjectSelector = ProjectSidebar;
