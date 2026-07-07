import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHomeRoute } from '@/lib/home-route';
import { useAuth } from '@/lib/auth-context';
import { ROUTE_TITLES } from '@/lib/navigation-config';

const BREADCRUMB_ROUTES: Record<string, string> = {
    Workspace: '/workspace',
    Executive: '/executive',
    Delivery: '/delivery',
    Project: '/pm',
    Operations: '/dashboard',
    Admin: '/inputs',
    Intelligence: '/insights',
    'My Workspace': '/workspace',
    Dashboard: '/dashboard',
    Projects: '/projects',
    Allocation: '/allocation',
    Reports: '/reports',
    OKRs: '/okrs',
    Users: '/user-control',
    Settings: '/system-health',
    Risk: '/executive/risk-radar',
    Capacity: '/delivery/capacity',
    Actions: '/delivery/recommendations',
};

interface BreadcrumbsProps {
    crumbs: string[];
    className?: string;
}

export function Breadcrumbs({ crumbs, className }: BreadcrumbsProps) {
    const { user } = useAuth();
    const home = getHomeRoute(user?.role);

    return (
        <nav className={cn('flex items-center gap-1 text-[11px] text-muted-foreground', className)} aria-label="Breadcrumb">
            <Link
                to={home}
                className="hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
                Home
            </Link>
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                const path = BREADCRUMB_ROUTES[crumb];
                return (
                    <span key={`${crumb}-${i}`} className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 opacity-50" aria-hidden />
                        {isLast || !path ? (
                            <span className={isLast ? 'text-brand-600 font-medium' : ''} aria-current={isLast ? 'page' : undefined}>
                                {crumb}
                            </span>
                        ) : (
                            <Link
                                to={path}
                                className="hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            >
                                {crumb}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}

export function useRouteBreadcrumbs(pathname: string): string[] {
    const meta = ROUTE_TITLES[pathname] ?? ROUTE_TITLES[pathname.split('/').slice(0, 2).join('/')];
    return meta?.breadcrumb ?? ['Workspace'];
}
