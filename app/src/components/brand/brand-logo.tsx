import { cn } from '@/lib/utils';

type BrandLogoProps = {
    variant?: 'icon' | 'wordmark';
    className?: string;
};

export function BrandLogo({ variant = 'icon', className }: BrandLogoProps) {
    if (variant === 'wordmark') {
        return (
            <img
                src="/wekan-wordmark.svg"
                alt="WeKan Enterprise Solutions"
                className={cn('h-9 w-auto', className)}
            />
        );
    }

    return (
        <img
            src="/wekan-logo.svg"
            alt="WeKan"
            className={cn('h-9 w-9 shrink-0', className)}
        />
    );
}
