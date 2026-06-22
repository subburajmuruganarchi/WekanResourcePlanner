import { useState, useCallback } from 'react';
import { Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    TIME_ENTRY_DRAG_TYPE,
    type DayData,
    type DailyForecastDay,
    type DraggedProjectPayload,
    type ProjectOption,
} from '@/components/time-entry/time-entry-types';
import { TimeEntryCard } from './TimeEntryCard';

interface TimeCalendarProps {
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

export function TimeCalendar({
    weekData,
    dailyForecastDays,
    projects,
    isTimesheetLocked,
    onAddEntry,
    onEditEntry,
    onDropProject,
}: TimeCalendarProps) {
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

    const weekdayData = weekData.filter((d) => d.isWeekday);
    const weekendData = weekData.filter((d) => !d.isWeekday);

    return (
        <div className="flex-1 min-w-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {weekdayData.map((day) => {
                    const dayIndex = weekData.findIndex((d) => d.fullDate === day.fullDate);
                    return (
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
                    );
                })}
            </div>
            {weekendData.length > 0 && (
                <div className="grid grid-cols-2 gap-3 opacity-90">
                    {weekendData.map((day) => {
                        const dayIndex = weekData.findIndex((d) => d.fullDate === day.fullDate);
                        return (
                            <DayColumn
                                key={day.fullDate}
                                day={day}
                                dayIndex={dayIndex}
                                dailyForecastDays={dailyForecastDays}
                                projects={projects}
                                isTimesheetLocked={isTimesheetLocked}
                                isDropTarget={dragOverDayIndex === dayIndex}
                                compact
                                onDragOver={(e) => handleDragOver(e, dayIndex)}
                                onDragLeave={() =>
                                    setDragOverDayIndex((p) => (p === dayIndex ? null : p))
                                }
                                onDrop={(e) => handleDrop(e, dayIndex)}
                                onAddEntry={onAddEntry}
                                onEditEntry={onEditEntry}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function DayColumn({
    day,
    dayIndex,
    dailyForecastDays,
    projects,
    isTimesheetLocked,
    isDropTarget,
    compact,
    onDragOver,
    onDragLeave,
    onDrop,
    onAddEntry,
    onEditEntry,
}: {
    day: DayData;
    dayIndex: number;
    dailyForecastDays?: DailyForecastDay[];
    projects: ProjectOption[];
    isTimesheetLocked: boolean;
    isDropTarget: boolean;
    compact?: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onAddEntry: (dayIndex: number) => void;
    onEditEntry: (dayIndex: number, tempId: string) => void;
}) {
    const dayTotal = day.entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    const forecast = dailyForecastDays?.find((d) => d.date === day.fullDate);

    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
                'flex flex-col rounded-2xl border min-h-[220px] overflow-hidden transition-all bg-white',
                compact ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200',
                isDropTarget && 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-300 shadow-lg scale-[1.01]',
                !isTimesheetLocked && !isDropTarget && 'hover:shadow-md'
            )}
        >
            <div
                className={cn(
                    'px-3 py-2.5 border-b border-slate-100 flex items-start justify-between',
                    isDropTarget ? 'bg-indigo-50' : 'bg-slate-50/80'
                )}
            >
                <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {day.day}
                    </p>
                    <p className="text-sm font-bold text-slate-900">{day.date}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-slate-900 tabular-nums">{dayTotal}h</p>
                    {forecast && forecast.totalForecast > 0 && (
                        <p className="text-[10px] text-indigo-600 flex items-center justify-end gap-0.5">
                            <Target className="w-3 h-3" />
                            {forecast.totalForecast}h target
                        </p>
                    )}
                </div>
            </div>

            <div
                className={cn(
                    'flex-1 p-2.5 space-y-2 overflow-y-auto',
                    compact ? 'max-h-[160px]' : 'max-h-[280px] min-h-[140px]',
                    isDropTarget && 'bg-indigo-50/30'
                )}
            >
                {day.entries.length === 0 ? (
                    <p
                        className={cn(
                            'text-[11px] text-center py-8 px-2',
                            isDropTarget ? 'text-indigo-600 font-medium' : 'text-slate-400'
                        )}
                    >
                        {isDropTarget ? 'Drop project here' : 'No time logged'}
                    </p>
                ) : (
                    day.entries.map((entry) => (
                        <TimeEntryCard
                            key={entry.tempId}
                            entry={entry}
                            projects={projects}
                            disabled={isTimesheetLocked}
                            onClick={() => onEditEntry(dayIndex, entry.tempId)}
                        />
                    ))
                )}
            </div>

            {!isTimesheetLocked && (
                <div className="p-2 border-t border-slate-100">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs gap-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => onAddEntry(dayIndex)}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add time
                    </Button>
                </div>
            )}
        </div>
    );
}
