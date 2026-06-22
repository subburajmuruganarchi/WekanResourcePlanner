import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from './Sparkline';

export interface KPICardProps {
    label: string;
    value: string;
    explanation?: string;
    icon: LucideIcon;
    trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
    sparklineData?: number[];
    accent?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'violet' | 'sky';
    loading?: boolean;
}

const accentStyles = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
};

export function KPICard({
    label,
    value,
    explanation,
    icon: Icon,
    trend,
    sparklineData,
    accent = 'indigo',
    loading,
}: KPICardProps) {
    if (loading) {
        return (
            <div className="dashboard-card p-5 animate-pulse">
                <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
                <div className="h-8 w-16 bg-slate-100 rounded mb-3" />
                <div className="h-10 bg-slate-50 rounded" />
            </div>
        );
    }

    return (
        <article className="dashboard-card p-5 group">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{label}</p>
                    <p className="text-3xl font-bold text-[#111827] mt-2 tabular-nums tracking-tight">{value}</p>
                    {trend && (
                        <div
                            className={cn(
                                'inline-flex items-center gap-1 mt-2 text-xs font-medium rounded-full px-2 py-0.5',
                                trend.direction === 'up' && 'text-emerald-700 bg-emerald-50',
                                trend.direction === 'down' && 'text-amber-700 bg-amber-50',
                                trend.direction === 'neutral' && 'text-slate-600 bg-slate-50'
                            )}
                        >
                            {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                            {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                            {trend.value}
                        </div>
                    )}
                    {explanation && (
                        <p className="text-xs text-[#64748b] mt-2 leading-relaxed">{explanation}</p>
                    )}
                </div>
                <div
                    className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105',
                        accentStyles[accent]
                    )}
                >
                    <Icon className="w-5 h-5" aria-hidden />
                </div>
            </div>
            {sparklineData && sparklineData.length > 1 && (
                <div className="mt-4 h-10 -mx-1">
                    <Sparkline data={sparklineData} />
                </div>
            )}
        </article>
    );
}

export function KPIGridSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="dashboard-card p-5 animate-pulse">
                    <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
                    <div className="h-8 w-16 bg-slate-100 rounded mb-3" />
                    <div className="h-10 bg-slate-50 rounded" />
                </div>
            ))}
        </div>
    );
}
