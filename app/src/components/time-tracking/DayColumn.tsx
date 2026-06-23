import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayData, DailyForecastDay, ProjectOption } from '@/components/time-entry/time-entry-types';
import { TimeEntryCard } from './TimeEntryCard';

interface DayColumnProps {
    day: DayData;
    dayIndex: number;
    dailyForecastDays?: DailyForecastDay[];
    projects: ProjectOption[];
    isTimesheetLocked: boolean;
    isDropTarget: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onAddEntry: (dayIndex: number) => void;
    onEditEntry: (dayIndex: number, tempId: string) => void;
}

export function DayColumn({
    day,
    dayIndex,
    dailyForecastDays,
    projects,
    isTimesheetLocked,
    isDropTarget,
    onDragOver,
    onDragLeave,
    onDrop,
    onAddEntry,
    onEditEntry,
}: DayColumnProps) {
    const dayTotal = day.entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    const forecast = dailyForecastDays?.find((d) => d.date === day.fullDate);
    const isWeekend = !day.isWeekday;

    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
                'flex flex-col tt-card overflow-hidden w-[150px] min-w-[150px] shrink-0 flex-none',
                isWeekend && 'bg-slate-50/60',
                isDropTarget && 'ring-2 ring-brand-500 ring-offset-2'
            )}
        >
            <header
                className={cn(
                    'h-[90px] shrink-0 px-4 py-3 border-b border-slate-100 flex flex-col justify-between',
                    isDropTarget ? 'bg-brand-50' : 'bg-slate-50/80'
                )}
            >
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {day.day.toUpperCase()}
                    </p>
                    <p className="text-base font-semibold text-slate-900 mt-1 whitespace-nowrap">{day.date}</p>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 tabular-nums">{dayTotal}h</span>
                    {forecast && forecast.totalForecast > 0 && (
                        <span className="text-xs text-brand-600 tabular-nums">
                            / {forecast.totalForecast}h
                        </span>
                    )}
                </div>
            </header>

            <div
                className={cn(
                    'flex-1 min-h-[500px] p-3 flex flex-col',
                    isDropTarget && 'bg-brand-50/20'
                )}
            >
                {day.entries.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p
                            className={cn(
                                'text-sm text-center px-2',
                                isDropTarget ? 'text-brand-600 font-medium' : 'text-slate-400'
                            )}
                        >
                            {isDropTarget ? 'Drop project here' : 'No time logged'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 overflow-y-auto tt-scroll flex-1">
                        {day.entries.map((entry) => (
                            <TimeEntryCard
                                key={entry.tempId}
                                entry={entry}
                                projects={projects}
                                disabled={isTimesheetLocked}
                                onClick={() => onEditEntry(dayIndex, entry.tempId)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {!isTimesheetLocked && (
                <footer className="shrink-0 p-3 border-t border-slate-100 bg-white">
                    <button
                        type="button"
                        onClick={() => onAddEntry(dayIndex)}
                        className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-medium text-slate-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add time
                    </button>
                </footer>
            )}
        </div>
    );
}
