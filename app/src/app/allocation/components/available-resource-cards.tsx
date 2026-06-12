import { UserPlus } from 'lucide-react';
import { MatchWhyHint } from './match-why-hint';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/components/shared/role-guard';
import { cn } from '@/lib/utils';
import type { RankedEmployee } from '@/lib/use-ranked-employees';
import { getCapacityDisplay, capacityStatusStyles, capacityBarLabel, capacityBarSuffix } from './allocation-capacity-display';

interface AvailableResourceCardsProps {
    employees: RankedEmployee[];
    selectedProjectId?: string;
    onAllocate: (employee: RankedEmployee) => void;
    onEdit: (employee: RankedEmployee) => void;
}

function matchScoreColor(score: number) {
    if (score >= 0.7) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 0.4) return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
}

export function AvailableResourceCards({
    employees,
    selectedProjectId,
    onAllocate,
    onEdit,
}: AvailableResourceCardsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {employees.map((emp, index) => {
                const matchPct = Math.round((emp.matchScore ?? 0) * 100);
                const displaySkills =
                    emp.matchingSkills && emp.matchingSkills.length > 0
                        ? emp.matchingSkills
                        : emp.primarySkill && emp.primarySkill !== 'No skills on profile'
                          ? [{ name: emp.primarySkill, level: emp.skillLevel }]
                          : [];
                const skillSectionTitle = emp.factors?.skillMatch ? 'Skill match' : 'Employee skills';

                const capacity = getCapacityDisplay(emp);
                const capacityStyles = capacityStatusStyles(capacity.status);

                return (
                    <Card
                        key={emp.id}
                        className="p-4 border-gray-200 shadow-sm hover:border-gray-300 transition-colors flex flex-col gap-4"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-900 truncate">{emp.name}</h4>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-gray-500">
                                    {emp.jobRoleName && (
                                        <span className="font-medium text-gray-700">{emp.jobRoleName}</span>
                                    )}
                                    {emp.jobRoleName && <span className="text-gray-300">·</span>}
                                    <span>{emp.role}</span>
                                    {emp.suggestedAllocationRoleName &&
                                        emp.suggestedAllocationRoleName !== emp.jobRoleName && (
                                            <>
                                                <span className="text-gray-300">·</span>
                                                <span className="text-brand-700 font-medium">
                                                    Suggest {emp.suggestedAllocationRoleName}
                                                </span>
                                            </>
                                        )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <Badge
                                    variant="outline"
                                    className={cn('text-xs font-semibold tabular-nums', matchScoreColor(emp.matchScore ?? 0))}
                                >
                                    {matchPct}% match
                                </Badge>
                                <RoleGuard allowedRoles={['Admin']}>
                                    {emp.isAllocatedToProject ? (
                                        <Button size="sm" variant="outline" onClick={() => onEdit(emp)} className="text-xs h-8">
                                            Edit
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            disabled={!capacity.canAllocate}
                                            onClick={() => onAllocate(emp)}
                                            className={cn('text-xs h-8', !capacity.canAllocate && 'opacity-50')}
                                            title={
                                                !capacity.canAllocate
                                                    ? capacity.headline
                                                    : capacity.statusLabel
                                            }
                                        >
                                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                                            Allocate
                                        </Button>
                                    )}
                                </RoleGuard>
                            </div>
                        </div>

                        {/* Skill matches */}
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                {skillSectionTitle}
                            </p>
                            {displaySkills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {displaySkills.map((ms, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs',
                                                emp.factors?.skillMatch
                                                    ? 'bg-brand-50 border-brand-100 text-brand-900'
                                                    : 'bg-gray-50 border-gray-100 text-gray-700'
                                            )}
                                        >
                                            <span className="font-medium">{ms.name}</span>
                                            <span className="text-gray-400">{ms.level}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">No skills on employee profile</p>
                            )}
                        </div>

                        {/* Current allocations — staggered mini cards */}
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Current allocations
                            </p>
                            {emp.currentAllocations?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {emp.currentAllocations.map((alloc, i) => {
                                        const isThisProject = selectedProjectId && alloc.projectId === selectedProjectId;
                                        return (
                                        <div
                                            key={i}
                                            className={cn(
                                                'rounded-lg border px-3 py-2 min-w-[9rem] max-w-[calc(50%-0.25rem)] flex-1',
                                                isThisProject
                                                    ? 'border-brand-200 bg-brand-50/60 ring-1 ring-brand-100'
                                                    : 'border-gray-100 bg-gray-50'
                                            )}
                                        >
                                            {isThisProject && (
                                                <p className="text-[9px] font-semibold text-brand-700 uppercase tracking-wide mb-1">
                                                    This project
                                                </p>
                                            )}
                                            <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">
                                                {alloc.projectName}
                                            </p>
                                            <p className={cn(
                                                'text-[11px] font-medium mt-0.5 tabular-nums',
                                                isThisProject ? 'text-brand-700' : 'text-brand-700'
                                            )}>
                                                {alloc.percentage}%
                                            </p>
                                            <p className="text-[10px] text-gray-400 tabular-nums mt-1 leading-tight">
                                                {alloc.startDate} – {alloc.endDate}
                                            </p>
                                        </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">Not allocated to any project</p>
                            )}
                        </div>

                        {/* Footer: allocation capacity + experience */}
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Allocation capacity
                                </p>
                                <Badge
                                    variant="outline"
                                    className={cn('text-[10px] font-semibold', capacityStyles.badge)}
                                >
                                    {capacity.statusLabel}
                                </Badge>
                            </div>
                            <p className="text-xs text-gray-700 leading-snug">{capacity.headline}</p>
                            {capacity.detail && (
                                <p className="text-[11px] text-gray-500 leading-snug">{capacity.detail}</p>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 shrink-0 w-20">
                                    {capacityBarLabel(capacity.status)}
                                </span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={cn('h-full rounded-full transition-all', capacityStyles.bar)}
                                        style={{ width: `${capacity.barPercent}%` }}
                                    />
                                </div>
                                <span className="text-xs font-semibold tabular-nums text-gray-700 w-20 text-right">
                                    {capacityBarSuffix(capacity.status, capacity.barPercent)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                                <span>
                                    {emp.experienceYears > 0
                                        ? `${emp.experienceYears} yrs experience`
                                        : 'Experience not recorded'}
                                </span>
                                <MatchWhyHint emp={emp} rankPosition={index + 1} />
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
