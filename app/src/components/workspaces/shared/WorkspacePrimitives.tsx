import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Accent = 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';

const accentMap: Record<Accent, string> = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    slate: 'text-slate-700 bg-slate-50 border-slate-100',
    sky: 'text-sky-600 bg-sky-50 border-sky-100',
};

interface WorkspaceMetricCardProps {
    label: string;
    value: string;
    hint?: string;
    icon?: LucideIcon;
    accent?: Accent;
    className?: string;
}

export function WorkspaceMetricCard({
    label,
    value,
    hint,
    icon: Icon,
    accent = 'indigo',
    className,
}: WorkspaceMetricCardProps) {
    return (
        <div className={cn('dashboard-card p-5', className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">{value}</p>
                    {hint && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{hint}</p>}
                </div>
                {Icon && (
                    <div className={cn('p-2.5 rounded-xl border shrink-0', accentMap[accent])}>
                        <Icon className="w-5 h-5" />
                    </div>
                )}
            </div>
        </div>
    );
}

interface WorkspacePageHeaderProps {
    eyebrow: string;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function WorkspacePageHeader({ eyebrow, title, description, action }: WorkspacePageHeaderProps) {
    return (
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">{eyebrow}</p>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
            </div>
            {action}
        </header>
    );
}

export function WorkspaceSection({
    title,
    description,
    children,
    action,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export function HealthBadge({ health }: { health: 'Green' | 'Amber' | 'Red' | string }) {
    const styles =
        health === 'Green' || health === 'On Track'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : health === 'Amber' || health === 'At Risk'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';
    return (
        <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border', styles)}>
            {health}
        </span>
    );
}
