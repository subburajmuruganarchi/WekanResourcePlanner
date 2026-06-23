import { useState, useCallback } from 'react';
import {
    TIME_ENTRY_DRAG_TYPE,
    type DayData,
    type DailyForecastDay,
    type DraggedProjectPayload,
    type ProjectOption,
} from '@/components/time-entry/time-entry-types';
import { DayColumn } from './DayColumn';

interface WeeklyCalendarProps {
    weekData: DayData[];
    dailyForecastDays?: DailyForecastDay[];
    projects: ProjectOption[];
    isTimesheetLocked: boolean;
    onAddEntry: (dayIndex: number) => void;
    onEditEntry: (dayIndex: number, tempId: string) => void;
    onDropProject: (dayIndex: number, project: DraggedProjectPayload) => void;
}

function parseDraggedProject(e: React.DragEvent): DraggedProjectPayload | null {
    const raw = e.dataTransfer.getData(TIME_ENTRY_DRAG_TYPE);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as DraggedProjectPayload;
        if (parsed?.code && parsed?.id) return parsed;
    } catch {
        return null;
    }
    return null;
}

export function WeeklyCalendar({
    weekData,
    dailyForecastDays,
    projects,
    isTimesheetLocked,
    onAddEntry,
    onEditEntry,
    onDropProject,
}: WeeklyCalendarProps) {
    const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null);

    const handleDragOver = useCallback(
        (e: React.DragEvent, dayIndex: number) => {
            if (isTimesheetLocked) return;
            if (!e.dataTransfer.types.includes(TIME_ENTRY_DRAG_TYPE)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setDragOverDayIndex(dayIndex);
        },
        [isTimesheetLocked]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent, dayIndex: number) => {
            e.preventDefault();
            setDragOverDayIndex(null);
            if (isTimesheetLocked) return;
            const project = parseDraggedProject(e);
            if (project) onDropProject(dayIndex, project);
        },
        [isTimesheetLocked, onDropProject]
    );

    const weekTotal = weekData.reduce(
        (sum, d) => sum + d.entries.reduce((s, e) => s + (Number(e.hours) || 0), 0),
        0
    );

    return (
        <div className="tt-card flex flex-col min-w-0 w-full overflow-visible">
            <div className="px-6 py-5 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-semibold text-slate-900">Weekly Calendar</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Drag projects onto a day or use Add time ·{' '}
                    <span className="font-semibold text-slate-700 tabular-nums">{weekTotal}h</span> logged
                </p>
            </div>

            <div className="p-6 min-w-0 w-full">
                <div className="w-full overflow-x-auto overflow-y-visible pb-2 tt-scroll">
                    <div className="flex flex-row flex-nowrap items-stretch gap-4 min-w-max">
                        {weekData.map((day, dayIndex) => (
                            <DayColumn
                                key={day.fullDate}
                                day={day}
                                dayIndex={dayIndex}
                                dailyForecastDays={dailyForecastDays}
                                projects={projects}
                                isTimesheetLocked={isTimesheetLocked}
                                isDropTarget={dragOverDayIndex === dayIndex}
                                onDragOver={(e) => handleDragOver(e, dayIndex)}
                                onDragLeave={() =>
                                    setDragOverDayIndex((p) => (p === dayIndex ? null : p))
                                }
                                onDrop={(e) => handleDrop(e, dayIndex)}
                                onAddEntry={onAddEntry}
                                onEditEntry={onEditEntry}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** @deprecated Use WeeklyCalendar */
export const TimeCalendar = WeeklyCalendar;
