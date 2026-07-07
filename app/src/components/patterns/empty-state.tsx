import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'dashboard-card flex flex-col items-center justify-center text-center px-6 py-12',
                className
            )}
            role="status"
        >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Icon className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">{description}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
    title = 'Something went wrong',
    description = 'We could not load this content. Please try again.',
    onRetry,
    className,
}: ErrorStateProps) {
    return (
        <div
            className={cn(
                'dashboard-card flex flex-col items-center justify-center text-center px-6 py-12 border-critical-border',
                className
            )}
            role="alert"
        >
            <h3 className="text-base font-semibold text-critical">{title}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>
            {onRetry && (
                <Button variant="outline" className="mt-6" onClick={onRetry}>
                    Try again
                </Button>
            )}
        </div>
    );
}
