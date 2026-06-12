import { Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MasonryGrid, MasonryItem } from '@/components/shared/masonry-grid';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types/api';

interface EmployeeListCardsProps {
    employees: Employee[];
    onEdit: (employee: Employee) => void;
}

function formatSkills(skills: Employee['skills']): { name: string; level: string }[] {
    if (!skills?.length) return [];
    return skills.map((s) => ({ name: s.name, level: s.skillLevel }));
}

function availabilityLabel(percent: number): string {
    if (percent <= 0) return 'Fully allocated';
    return `${percent}% available`;
}

function availabilityClass(percent: number): string {
    if (percent <= 0) return 'text-red-600';
    if (percent < 50) return 'text-amber-700';
    return 'text-emerald-700';
}

export function EmployeeListCards({ employees, onEdit }: EmployeeListCardsProps) {
    if (employees.length === 0) {
        return (
            <p className="text-center text-gray-500 py-12 bg-white border border-gray-200 rounded-xl">
                No employees match your search.
            </p>
        );
    }

    return (
        <MasonryGrid>
            {employees.map((emp) => {
                const skills = formatSkills(emp.skills);
                const roleLabel = emp.jobRole || emp.role || emp.department || 'N/A';
                const avail = emp.availability ?? 100;
                const metaParts = [emp.position, emp.department].filter(Boolean);

                return (
                    <MasonryItem key={emp.id}>
                        <Card className="p-4 border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-brand-700 truncate">{emp.name}</h4>
                                    {emp.email && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{emp.email}</p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 h-8 w-8"
                                    onClick={() => onEdit(emp)}
                                    aria-label={`Edit ${emp.name}`}
                                >
                                    <Edit className="w-4 h-4 text-gray-400 hover:text-brand-600" />
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-3">
                                <Badge variant="secondary" className="text-[10px] uppercase">
                                    {roleLabel}
                                </Badge>
                                {emp.status && (
                                    <Badge variant="outline" className="text-[10px]">
                                        {emp.status}
                                    </Badge>
                                )}
                            </div>

                            {(metaParts.length > 0 || emp.availability != null) && (
                                <p className="text-xs text-gray-600 mt-2 leading-snug">
                                    {metaParts.length > 0 && metaParts.join(' · ')}
                                    {metaParts.length > 0 && emp.availability != null && ' · '}
                                    {emp.availability != null && (
                                        <span className={cn('font-medium', availabilityClass(avail))}>
                                            {availabilityLabel(avail)}
                                        </span>
                                    )}
                                </p>
                            )}

                            {skills.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Skills
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {skills.map((skill, i) => (
                                            <div
                                                key={`${skill.name}-${i}`}
                                                className="inline-flex items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-xs"
                                            >
                                                <span className="font-medium text-gray-800">{skill.name}</span>
                                                <span className="text-gray-400">{skill.level}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </MasonryItem>
                );
            })}
        </MasonryGrid>
    );
}
