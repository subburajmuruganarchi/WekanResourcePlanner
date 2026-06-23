import { ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DeliveryRiskItem } from '@/lib/risk-intelligence';

interface RiskCardProps {
    risk: DeliveryRiskItem;
    onView?: (projectId: string) => void;
}

export function RiskCard({ risk, onView }: RiskCardProps) {
    const operationalIssues = [
        ...(risk.allocationRisks?.map((r) => r.message) ?? []),
        ...(risk.capacityRisks?.map((r) => r.message) ?? []),
    ].slice(0, 3);

    const recommendation =
        risk.recommendations?.[0] ??
        (operationalIssues.length > 0 ? 'Review Project_Allocation and current-week planner hours.' : 'No action required');

    const levelLabel =
        risk.level === 'HIGH' ? 'HIGH RISK' : risk.level === 'MEDIUM' ? 'MEDIUM RISK' : 'LOW RISK';

    const impactDays = Math.max(7, Math.round((risk.score / 100) * 21));

    return (
        <article className="dashboard-card p-5 flex flex-col h-full">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">Current Delivery Risk</p>
                    <p className="text-sm font-semibold text-[#111827] truncate mt-1">{risk.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{risk.code}</p>
                </div>
                <div
                    className={cn(
                        'shrink-0 text-center rounded-xl px-3 py-2 min-w-[72px]',
                        risk.level === 'HIGH' && 'bg-red-50 border border-red-100',
                        risk.level === 'MEDIUM' && 'bg-amber-50 border border-amber-100',
                        risk.level === 'LOW' && 'bg-emerald-50 border border-emerald-100'
                    )}
                >
                    <p
                        className={cn(
                            'text-[9px] font-bold tracking-wider',
                            risk.level === 'HIGH' && 'text-red-700',
                            risk.level === 'MEDIUM' && 'text-amber-800',
                            risk.level === 'LOW' && 'text-emerald-700'
                        )}
                    >
                        {levelLabel}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-[#111827]">{risk.score}%</p>
                </div>
            </div>

            {operationalIssues.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Operational signals</p>
                    <ul className="space-y-1">
                        {operationalIssues.map((m) => (
                            <li key={m} className="text-xs text-slate-700 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                                {m}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3 mb-4">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="font-medium text-slate-800">Delivery impact if unresolved</p>
                    <p className="text-slate-600 mt-0.5">~{impactDays} days potential slip</p>
                </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    Recommended action
                </p>
                <p className="text-xs text-slate-700 leading-relaxed mb-3">&ldquo;{recommendation}&rdquo;</p>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-brand-700 border-brand-200 hover:bg-brand-50"
                    onClick={() => onView?.(risk.projectId)}
                >
                    View project
                    <ArrowRight className="w-3.5 h-3.5" />
                </Button>
            </div>
        </article>
    );
}

export function RiskCardGrid({
    risks,
    loading,
    onView,
}: {
    risks: DeliveryRiskItem[];
    loading?: boolean;
    onView?: (projectId: string) => void;
}) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="dashboard-card h-64 animate-pulse bg-slate-50" />
                ))}
            </div>
        );
    }

    if (risks.length === 0) {
        return (
            <div className="dashboard-card py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No current delivery risks detected</p>
                <p className="text-xs text-slate-500 mt-1">Project_Allocation and planner coverage appear operational.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {risks.slice(0, 6).map((r) => (
                <RiskCard key={r.projectId} risk={r} onView={onView} />
            ))}
        </div>
    );
}

export type { DeliveryRiskItem as StaffingRiskItem };
