import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InsightCardProps {
    title: string;
    headline: string;
    description?: string;
    icon: LucideIcon;
    tone?: 'indigo' | 'amber' | 'emerald';
    onClick?: () => void;
}

const toneStyles = {
    indigo: 'from-brand-500/10 to-violet-500/5 border-brand-100',
    amber: 'from-amber-500/10 to-orange-500/5 border-amber-100',
    emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-100',
};

const iconStyles = {
    indigo: 'bg-brand-100 text-brand-600',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
};

export function InsightCard({
    title,
    headline,
    description,
    icon: Icon,
    tone = 'indigo',
    onClick,
}: InsightCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'dashboard-card p-5 text-left w-full bg-gradient-to-br transition-all',
                toneStyles[tone],
                onClick && 'cursor-pointer hover:shadow-md'
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconStyles[tone])}>
                    <Icon className="w-5 h-5" />
                </div>
                {onClick && <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mt-4">{title}</p>
            <p className="text-sm font-semibold text-[#111827] mt-1 leading-snug">{headline}</p>
            {description && <p className="text-xs text-[#64748b] mt-2 leading-relaxed">{description}</p>}
        </button>
    );
}

export function WorkforceIntelligenceSection({
    items,
}: {
    items: InsightCardProps[];
}) {
    return (
        <section>
            <h2 className="text-base font-semibold text-[#111827] mb-1">Workforce intelligence</h2>
            <p className="text-sm text-[#64748b] mb-4">Predictive signals from allocation, skills, and delivery data.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {items.map((item) => (
                    <InsightCard key={item.title} {...item} />
                ))}
            </div>
        </section>
    );
}
