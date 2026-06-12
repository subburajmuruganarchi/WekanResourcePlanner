import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StaffingRiskItem {
    projectId: string;
    name: string;
    code: string;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    reasons: string[];
}

const levelStyles: Record<string, string> = {
    LOW: 'bg-green-50 text-green-700 border-green-200',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border-red-200',
};

export function StaffingRiskCards({ risks, loading }: { risks: StaffingRiskItem[]; loading?: boolean }) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                {[1, 2].map((i) => (
                    <div key={i} className="h-[4.5rem] bg-gray-100 animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    if (risks.length === 0) {
        return <p className="text-sm text-gray-500">No active projects with elevated staffing risk.</p>;
    }

    return (
        <div className="flex flex-col gap-3 w-full">
            {risks.map((r) => (
                <Card
                    key={r.projectId}
                    className="p-3 cursor-pointer hover:border-brand-300 transition-colors w-full"
                    onClick={() => navigate(`/projects/${r.projectId}`)}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold uppercase text-gray-700 tracking-tight"
                            aria-hidden
                        >
                            {r.code.replace(/[^A-Z0-9]/gi, '').slice(0, 3) || 'PRJ'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm text-gray-900 leading-snug line-clamp-2">
                                        {r.name}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{r.code}</p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(levelStyles[r.level], 'shrink-0 whitespace-nowrap')}
                                >
                                    {r.level}
                                </Badge>
                            </div>
                            {r.reasons[0] && (
                                <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                                    {r.reasons[0]}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
