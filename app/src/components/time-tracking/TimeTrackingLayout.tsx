import type { ReactNode } from 'react';
import { PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeTrackingLayoutProps {
    /** Projects panel — rendered above the calendar */
    projects: ReactNode;
    /** Weekly calendar — below projects */
    calendar: ReactNode;
    insights: ReactNode;
    insightsDrawerOpen?: boolean;
    onOpenInsights?: () => void;
    onCloseInsights?: () => void;
}

export function TimeTrackingLayout({
    projects,
    calendar,
    insights,
    insightsDrawerOpen,
    onOpenInsights,
    onCloseInsights,
}: TimeTrackingLayoutProps) {
    return (
        <>
            {onOpenInsights && (
                <div className="flex justify-end mb-4 xl:hidden">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        onClick={onOpenInsights}
                    >
                        <PanelRightOpen className="w-4 h-4" />
                        Insights
                    </Button>
                </div>
            )}

            <div className="tt-layout">
                <div className="tt-layout__main min-w-0 flex flex-col gap-6">
                    {projects}
                    {calendar}
                </div>

                <div className="tt-layout__insights min-w-0">{insights}</div>
            </div>

            {insightsDrawerOpen && onCloseInsights && (
                <>
                    <div className="tt-drawer-backdrop xl:hidden" onClick={onCloseInsights} aria-hidden />
                    <div className="tt-drawer-panel xl:hidden">{insights}</div>
                </>
            )}
        </>
    );
}
