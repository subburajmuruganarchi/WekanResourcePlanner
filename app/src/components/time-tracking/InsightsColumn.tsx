import { InsightPanel } from './InsightPanel';
import { AISuggestionCard } from './AISuggestionCard';
import type { TimeKPIs, TimeSuggestion } from './types';

interface InsightsColumnProps {
    kpis: TimeKPIs;
    topProject?: string;
    missingDays: number;
    employeeId?: string;
    suggestions: TimeSuggestion[];
    onApplySuggestion?: (s: TimeSuggestion) => void;
}

export function InsightsColumn({
    kpis,
    topProject,
    missingDays,
    employeeId,
    suggestions,
    onApplySuggestion,
}: InsightsColumnProps) {
    return (
        <div className="tt-insights-sticky flex w-full flex-col gap-4">
            <InsightPanel
                kpis={kpis}
                topProject={topProject}
                missingDays={missingDays}
                employeeId={employeeId}
            />
            <AISuggestionCard suggestions={suggestions} onApply={onApplySuggestion} />
        </div>
    );
}

/** @deprecated Use InsightsColumn */
export function TimeInsightsRail(props: InsightsColumnProps & { missingWeekdays?: string[]; weekTimesheetStatus?: unknown }) {
    const { missingWeekdays, weekTimesheetStatus: _, ...rest } = props;
    return (
        <InsightsColumn
            {...rest}
            missingDays={rest.missingDays ?? missingWeekdays?.length ?? 0}
        />
    );
}
