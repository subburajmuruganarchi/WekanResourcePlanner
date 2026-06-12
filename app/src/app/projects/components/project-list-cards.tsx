import { Edit, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MasonryGrid, MasonryItem } from '@/components/shared/masonry-grid';
import { cn } from '@/lib/utils';
import type { Project, ProjectPriority, ProjectStatus } from '@/types/api';

interface ProjectListCardsProps {
    projects: Project[];
    onEdit: (project: Project) => void;
    onOpen: (projectId: string) => void;
}

function statusStyles(status: ProjectStatus): string {
    switch (status) {
        case 'Active':
            return 'bg-green-50 text-green-700 border-green-200';
        case 'Planning':
            return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'Completed':
            return 'bg-gray-50 text-gray-700 border-gray-200';
        case 'OnHold':
            return 'bg-amber-50 text-amber-800 border-amber-200';
        default:
            return 'bg-gray-50 text-gray-700 border-gray-200';
    }
}

function priorityStyles(priority: ProjectPriority): string {
    switch (priority) {
        case 'High':
            return 'bg-red-50 text-red-700 border-red-200';
        case 'Medium':
            return 'bg-amber-50 text-amber-800 border-amber-200';
        default:
            return 'bg-gray-50 text-gray-600 border-gray-200';
    }
}

function formatDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
}

export function ProjectListCards({ projects, onEdit, onOpen }: ProjectListCardsProps) {
    if (projects.length === 0) {
        return (
            <p className="text-center text-gray-500 py-12 bg-white border border-gray-200 rounded-xl">
                No projects match your search or filters.
            </p>
        );
    }

    return (
        <MasonryGrid>
            {projects.map((project) => {
                const timeline = project.endDate
                    ? `${formatDate(project.startDate)} – ${formatDate(project.endDate)}`
                    : formatDate(project.startDate);

                return (
                    <MasonryItem key={project.id}>
                        <Card
                            role="button"
                            tabIndex={0}
                            onClick={() => onOpen(project.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onOpen(project.id);
                                }
                            }}
                            className="p-4 border-gray-200 shadow-sm hover:border-brand-200 hover:shadow-md transition-all cursor-pointer text-left"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-brand-700 leading-snug line-clamp-2">
                                        {project.name}
                                    </h4>
                                    <p className="text-xs font-mono text-gray-500 mt-1">{project.code}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 h-8 w-8"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(project);
                                    }}
                                    aria-label={`Edit ${project.name}`}
                                >
                                    <Edit className="w-4 h-4 text-gray-400 hover:text-brand-600" />
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-3">
                                <Badge variant="outline" className={cn('text-[10px]', statusStyles(project.status))}>
                                    {project.status}
                                </Badge>
                                <Badge variant="outline" className={cn('text-[10px]', priorityStyles(project.priority))}>
                                    {project.priority}
                                </Badge>
                            </div>

                            <div className="mt-3 space-y-2 text-xs text-gray-700">
                                <p>
                                    <span className="text-gray-400">Owner </span>
                                    <span className="font-medium">{project.owner}</span>
                                </p>
                                <p>
                                    <span className="text-gray-400">Manager </span>
                                    <span className="font-medium">{project.managerName}</span>
                                </p>
                                <p className="tabular-nums">
                                    <span className="text-gray-400">Timeline </span>
                                    {timeline}
                                </p>
                                <p className="flex items-center gap-1 font-medium">
                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                    {project.teamSize ?? 0} on team
                                </p>
                            </div>
                        </Card>
                    </MasonryItem>
                );
            })}
        </MasonryGrid>
    );
}
