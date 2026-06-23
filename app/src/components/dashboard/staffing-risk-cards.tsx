import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DeliveryRiskItem } from '@/lib/risk-intelligence';

export type { DeliveryRiskItem as StaffingRiskItem };

const levelStyles: Record<string, string> = {
    LOW: 'bg-green-50 text-green-700 border-green-200',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border-red-200',
};

function FindingList({ label, items }: { label: string; items: string[] }) {
    if (items.length === 0) return null;
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
            <div className="flex flex-wrap gap-1">
                {items.map((item) => (
                    <Badge key={item} variant="outline" className="text-[10px] font-normal text-left whitespace-normal">
                        {item}
                    </Badge>
                ))}
            </div>
        </div>
    );
}

export function DeliveryRiskCards({ risks, loading }: { risks: DeliveryRiskItem[]; loading?: boolean }) {
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
                No current delivery risks on active projects. Planner and Project_Allocation coverage looks operational.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            {risks.map((r) => {
                const allocationMsgs = r.allocationRisks?.map((a) => a.message) ?? [];
                const capacityMsgs = r.capacityRisks?.map((c) => c.message) ?? [];

                return (
                    <Card
                        key={r.projectId}
                        className="p-4 cursor-pointer hover:border-brand-300 transition-colors w-full"
                        onClick={() => navigate(`/projects/${r.projectId}`)}
                    >
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 mb-0.5">
                                    Current Delivery Risk
                                </p>
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
                            <FindingList label="Allocation" items={allocationMsgs.slice(0, 2)} />
                            <FindingList label="Planner capacity" items={capacityMsgs.slice(0, 2)} />
                            {(r.recommendations?.length ?? 0) > 0 && (
                                <FindingList label="Recommended action" items={r.recommendations!.slice(0, 2)} />
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

/** @deprecated Use DeliveryRiskCards */
export const StaffingRiskCards = DeliveryRiskCards;

export function SkillGapForecastCards({
    forecasts,
    loading,
}: {
    forecasts: import('@/lib/risk-intelligence').SkillGapForecastItem[];
    loading?: boolean;
}) {
    const navigate = useNavigate();

    if (loading) {
        return <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />;
    }

    if (forecasts.length === 0) {
        return (
            <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                No future capability gaps forecast from project plans.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {forecasts.map((f) => (
                <Card
                    key={f.projectId}
                    className="p-4 cursor-pointer hover:border-slate-300"
                    onClick={() => navigate(`/projects/${f.projectId}`)}
                >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Future Capability Gap
                    </p>
                    <p className="font-semibold text-sm">{f.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{f.code}</p>
                    <ul className="mt-2 space-y-1">
                        {f.forecasts.slice(0, 3).map((item) => (
                            <li key={item.message} className="text-xs text-slate-600">
                                {item.message}
                            </li>
                        ))}
                    </ul>
                </Card>
            ))}
        </div>
    );
}
