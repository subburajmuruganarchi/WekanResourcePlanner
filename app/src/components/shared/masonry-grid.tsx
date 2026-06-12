import { cn } from '@/lib/utils';

interface MasonryGridProps {
    children: React.ReactNode;
    className?: string;
}

/** Column-based masonry — cards stack by height without row stretch gaps. */
export function MasonryGrid({ children, className }: MasonryGridProps) {
    return (
        <div
            className={cn(
                'columns-1 sm:columns-2 xl:columns-3 gap-4 [column-fill:balance]',
                className
            )}
        >
            {children}
        </div>
    );
}

interface MasonryItemProps {
    children: React.ReactNode;
    className?: string;
}

export function MasonryItem({ children, className }: MasonryItemProps) {
    return (
        <div className={cn('break-inside-avoid mb-4 w-full', className)}>
            {children}
        </div>
    );
}
