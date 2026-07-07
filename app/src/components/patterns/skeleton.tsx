import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
    return <div className={cn('enterprise-skeleton', className)} aria-hidden="true" {...props} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn('space-y-2', className)} aria-hidden="true">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
            ))}
        </div>
    );
}

export function MetricCardSkeleton() {
    return (
        <div className="dashboard-card p-5 space-y-3" aria-hidden="true">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
            role="status"
            aria-label="Loading metrics"
        >
            {Array.from({ length: count }).map((_, i) => (
                <MetricCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function PageSkeleton() {
    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8" role="status" aria-label="Loading page">
            <div className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <MetricGridSkeleton count={4} />
            <div className="dashboard-card p-6">
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
}
