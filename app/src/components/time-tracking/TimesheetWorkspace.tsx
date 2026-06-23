import type { DayData, DailyForecastDay, DraggedProjectPayload, ProjectOption } from '@/components/time-entry/time-entry-types';
import { TimeTrackingLayout } from './TimeTrackingLayout';
import { ProjectSidebar } from './ProjectSidebar';
import { WeeklyCalendar } from './WeeklyCalendar';
import { InsightsColumn } from './InsightsColumn';
import type { TimeKPIs, TimeSuggestion } from './types';

interface TimesheetWorkspaceProps {
    weekData: DayData[];
    projects: ProjectOption[];
    dailyForecastDays?: DailyForecastDay[];
    allocationByProject?: Map<string, { estimatedHours: number; percentage: number }>;
    isTimesheetLocked: boolean;
    disabled?: boolean;
    onAddEntry: (dayIndex: number) => void;
    onEditEntry: (dayIndex: number, tempId: string) => void;
    onDropProject: (dayIndex: number, project: DraggedProjectPayload) => void;
    kpis: TimeKPIs;
    topProject?: string;
    missingDays: number;
    suggestions: TimeSuggestion[];
    onApplySuggestion?: (s: TimeSuggestion) => void;
    insightsDrawerOpen?: boolean;
    onOpenInsights?: () => void;
    onCloseInsights?: () => void;
}

export function TimesheetWorkspace({
    weekData,
    projects,
    dailyForecastDays,
    allocationByProject,
    isTimesheetLocked,
    disabled,
    onAddEntry,
    onEditEntry,
    onDropProject,
    kpis,
    topProject,
    missingDays,
    suggestions,
    onApplySuggestion,
    insightsDrawerOpen,
    onOpenInsights,
    onCloseInsights,
}: TimesheetWorkspaceProps) {
    return (
        <TimeTrackingLayout
            insightsDrawerOpen={insightsDrawerOpen}
            onOpenInsights={onOpenInsights}
            onCloseInsights={onCloseInsights}
            projects={
                <ProjectSidebar
                    projects={projects}
                    disabled={disabled || isTimesheetLocked}
                    allocationByProject={allocationByProject}
                />
            }
            calendar={
                <WeeklyCalendar
                    weekData={weekData}
                    dailyForecastDays={dailyForecastDays}
                    projects={projects}
                    isTimesheetLocked={isTimesheetLocked}
                    onAddEntry={onAddEntry}
                    onEditEntry={onEditEntry}
                    onDropProject={onDropProject}
                />
            }
            insights={
                <InsightsColumn
                    kpis={kpis}
                    topProject={topProject}
                    missingDays={missingDays}
                    suggestions={suggestions}
                    onApplySuggestion={onApplySuggestion}
                />
            }
        />
    );
}
