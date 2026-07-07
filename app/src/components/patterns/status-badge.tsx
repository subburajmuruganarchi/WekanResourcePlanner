import { cn } from '@/lib/utils';

export type StatusVariant = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

const variantStyles: Record<StatusVariant, string> = {
    success: 'bg-success-bg text-success border-success-border',
    warning: 'bg-warning-bg text-warning border-warning-border',
    critical: 'bg-critical-bg text-critical border-critical-border',
    info: 'bg-info-bg text-info border-info-border',
    neutral: 'bg-muted text-muted-foreground border-border',
};

interface StatusBadgeProps {
    variant?: StatusVariant;
    children: React.ReactNode;
    className?: string;
}

export function StatusBadge({ variant = 'neutral', children, className }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                variantStyles[variant],
                className
            )}
        >
            {children}
        </span>
    );
}

/** Maps RAG health strings to status variants */
export function healthToVariant(health: string): StatusVariant {
    if (health === 'Green' || health === 'On Track' || health === 'Healthy') return 'success';
    if (health === 'Amber' || health === 'At Risk' || health === 'MEDIUM') return 'warning';
    if (health === 'Red' || health === 'Critical' || health === 'HIGH') return 'critical';
    return 'neutral';
}

export function HealthBadge({ health }: { health: string }) {
    return <StatusBadge variant={healthToVariant(health)}>{health}</StatusBadge>;
}
