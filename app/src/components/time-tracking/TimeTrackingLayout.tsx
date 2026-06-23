import type { ReactNode } from 'react';
import { Briefcase, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimeTrackingLayoutProps {
    sidebar: ReactNode;
    workspace: ReactNode;
    insights: ReactNode;
    mobileSidebarOpen?: boolean;
    onToggleMobileSidebar?: () => void;
    insightsDrawerOpen?: boolean;
    onOpenInsights?: () => void;
    onCloseInsights?: () => void;
}

export function TimeTrackingLayout({
    sidebar,
    workspace,
    insights,
    mobileSidebarOpen,
    onToggleMobileSidebar,
    insightsDrawerOpen,
    onOpenInsights,
    onCloseInsights,
}: TimeTrackingLayoutProps) {
    return (
        <>
            <div className="flex flex-wrap items-center gap-2 mb-4 lg:hidden">
                {onToggleMobileSidebar && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        onClick={onToggleMobileSidebar}
                    >
                        <Briefcase className="w-4 h-4" />
                        Projects
                    </Button>
                )}
                {onOpenInsights && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 xl:hidden"
                        onClick={onOpenInsights}
                    >
                        <PanelRightOpen className="w-4 h-4" />
                        Insights
                    </Button>
                )}
            </div>

            <div className="tt-layout">
                <div
                    className={cn(
                        'tt-layout__sidebar min-w-0',
                        mobileSidebarOpen && 'tt-layout__sidebar--mobile-open'
                    )}
                >
                    {sidebar}
                </div>

                <div className="tt-layout__workspace min-w-0">{workspace}</div>

                <div className="tt-layout__insights min-w-0">{insights}</div>
            </div>

            {mobileSidebarOpen && onToggleMobileSidebar && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
                    onClick={onToggleMobileSidebar}
                    aria-hidden
                />
            )}

            {mobileSidebarOpen && (
                <div className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[90vw] bg-white shadow-xl lg:hidden overflow-y-auto">
                    {sidebar}
                </div>
            )}

            {insightsDrawerOpen && onCloseInsights && (
                <>
                    <div className="tt-drawer-backdrop xl:hidden" onClick={onCloseInsights} aria-hidden />
                    <div className="tt-drawer-panel xl:hidden">{insights}</div>
                </>
            )}
        </>
    );
}
