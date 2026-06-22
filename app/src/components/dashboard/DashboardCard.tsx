import { cn } from '@/lib/utils';

export interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export function DashboardCard({
    className,
    children,
    padding = 'md',
    hover = true,
    ...props
}: DashboardCardProps) {
    return (
        <div
            className={cn(
                'dashboard-card',
                paddingMap[padding],
                hover && 'hover:border-indigo-100',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function DashboardSectionHeader({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div>
                <h2 className="text-base font-semibold text-[#111827] tracking-tight">{title}</h2>
                {description && (
                    <p className="text-sm text-[#64748b] mt-1 max-w-2xl leading-relaxed">{description}</p>
                )}
            </div>
            {action}
        </div>
    );
}
