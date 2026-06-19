import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StaffingRiskSkill {
    skill: string;
    minLevel: string;
    headcount: number;
    filled: number;
    gap: number;
}

export interface StaffingRiskRole {
    role: string;
    effortHours: number;
    headcount: number;
    gap: number;
}

export interface StaffingRiskItem {
    projectId: string;
    name: string;
    code: string;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    reasons: string[];
    requiredSkills?: StaffingRiskSkill[];
    requiredRoles?: StaffingRiskRole[];
    suggestedRoles?: string[];
    unfulfilledHeadcount?: number;
}

const levelStyles: Record<string, string> = {
    LOW: 'bg-green-50 text-green-700 border-green-200',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border-red-200',
};

function GapList({ label, items }: { label: string; items: string[] }) {
    if (items.length === 0) return null;
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
            <div className="flex flex-wrap gap-1">
                {items.map((item) => (
                    <Badge key={item} variant="outline" className="text-[10px] font-normal">
                        {item}
                    </Badge>
                ))}
            </div>
        </div>
    );
}

export function StaffingRiskCards({ risks, loading }: { risks: StaffingRiskItem[]; loading?: boolean }) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                    <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    if (risks.length === 0) {
        return (
            <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg">
                No active projects with elevated staffing risk.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            {risks.map((r) => {
                const skillGaps = (r.requiredSkills ?? [])
                    .filter((s: StaffingRiskSkill) => s.gap > 0)
                    .map((s) => `${s.skill} (${s.gap} gap)`);
                const roleGaps = (r.requiredRoles ?? [])
                    .filter((role) => role.gap > 0)
                    .map((role) => `${role.role} (${role.gap} open)`);

                return (
                    <Card
                        key={r.projectId}
                        className="p-4 cursor-pointer hover:border-brand-300 transition-colors w-full"
                        onClick={() => navigate(`/projects/${r.projectId}`)}
                    >
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                                <p className="font-semibold text-sm text-gray-900 leading-snug">{r.name}</p>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">{r.code}</p>
                            </div>
                            <Badge
                                variant="outline"
                                className={cn(levelStyles[r.level], 'shrink-0 whitespace-nowrap')}
                            >
                                {r.level} · {r.score}
                            </Badge>
                        </div>

                        <div className="space-y-2.5">
                            <GapList label="Required skills (gaps)" items={skillGaps.slice(0, 4)} />
                            <GapList label="Role gaps" items={roleGaps.slice(0, 4)} />
                            {(r.suggestedRoles?.length ?? 0) > 0 && (
                                <GapList label="Suggested focus" items={r.suggestedRoles!.slice(0, 3)} />
                            )}
                            {r.reasons[0] && (
                                <p className="text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2">
                                    {r.reasons[0]}
                                </p>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
