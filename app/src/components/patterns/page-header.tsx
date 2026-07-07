import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Accent = 'brand' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky' | 'violet';

const accentMap: Record<Accent, string> = {
    brand: 'text-brand-600 bg-brand-50 border-brand-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    slate: 'text-slate-700 bg-slate-50 border-slate-100',
    sky: 'text-sky-600 bg-sky-50 border-sky-100',
    violet: 'text-violet-600 bg-violet-50 border-violet-100',
};

interface PageHeaderProps {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function PageHeader({ eyebrow, title, description, action, className }: PageHeaderProps) {
    return (
        <header className={cn('flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8', className)}>
            <div className="max-w-3xl">
                {eyebrow && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2">{eyebrow}</p>
                )}
                <h1 className="text-2xl lg:text-3xl font-bold text-card-foreground tracking-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
                )}
            </div>
            {action}
        </header>
    );
}

interface MetricCardProps {
    label: string;
    value: string;
    hint?: string;
    icon?: LucideIcon;
    accent?: Accent;
    trend?: { value: string; direction?: 'up' | 'down' | 'neutral' };
    className?: string;
    onClick?: () => void;
}

export function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
    accent = 'brand',
    trend,
    className,
    onClick,
}: MetricCardProps) {
    const Comp = onClick ? 'button' : 'div';
    return (
        <Comp
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={cn(
                'dashboard-card p-5 text-left w-full',
                onClick && 'cursor-pointer hover:border-brand-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-card-foreground mt-2 tracking-tight">{value}</p>
                    {hint && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{hint}</p>}
                    {trend && (
                        <p
                            className={cn(
                                'text-xs mt-1.5 font-medium',
                                trend.direction === 'up' && 'text-success',
                                trend.direction === 'down' && 'text-critical',
                                trend.direction === 'neutral' && 'text-muted-foreground'
                            )}
                        >
                            {trend.value}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className={cn('p-2.5 rounded-xl border shrink-0', accentMap[accent])}>
                        <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                )}
            </div>
        </Comp>
    );
}

export function Section({
    title,
    description,
    children,
    action,
    className,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('space-y-4', className)}>
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
                    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export function MetricGrid({
    children,
    columns = { sm: 2, xl: 4 },
    className,
}: {
    children: React.ReactNode;
    columns?: { sm?: number; xl?: number; '2xl'?: number };
    className?: string;
}) {
    const colClass = cn(
        'grid grid-cols-1 gap-4',
        columns.sm === 2 && 'sm:grid-cols-2',
        columns.xl === 3 && 'xl:grid-cols-3',
        columns.xl === 4 && 'xl:grid-cols-4',
        columns.xl === 6 && 'xl:grid-cols-6',
        columns['2xl'] === 6 && '2xl:grid-cols-6',
        className
    );
    return <div className={colClass}>{children}</div>;
}

/** Back-compat aliases */
export const WorkspacePageHeader = PageHeader;
export const WorkspaceMetricCard = MetricCard;
export const WorkspaceSection = Section;
