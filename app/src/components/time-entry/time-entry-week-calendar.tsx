import { Plus, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { projectChipColor } from "./project-color"
import type { DayData, DailyForecastDay, ProjectOption } from "./time-entry-types"

interface TimeEntryWeekCalendarProps {
    weekData: DayData[]
    dailyForecastDays?: DailyForecastDay[]
    projects: ProjectOption[]
    isTimesheetLocked: boolean
    onAddEntry: (dayIndex: number) => void
    onEditEntry: (dayIndex: number, tempId: string) => void
}

function projectNameForCode(code: string, projects: ProjectOption[]): string {
    const p = projects.find((x) => x.code === code)
    if (p) return p.name
    if (code.startsWith("LV-")) return code.replace("LV-", "") + " Leave"
    return code
}

export function TimeEntryWeekCalendar({
    weekData,
    dailyForecastDays,
    projects,
    isTimesheetLocked,
    onAddEntry,
    onEditEntry,
}: TimeEntryWeekCalendarProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekData.map((day, dayIndex) => {
                const dayTotal = day.entries.reduce(
                    (sum, e) => sum + (Number(e.hours) || 0),
                    0
                )
                const forecast = dailyForecastDays?.find((d) => d.date === day.fullDate)
                const isWeekend = !day.isWeekday

                return (
                    <div
                        key={day.fullDate}
                        className={cn(
                            "flex flex-col rounded-xl border min-h-[200px] overflow-hidden transition-shadow",
                            isWeekend ? "bg-gray-50/80 border-gray-200" : "bg-white border-gray-200",
                            "hover:shadow-sm"
                        )}
                    >
                        <div
                            className={cn(
                                "px-3 py-2 border-b flex items-start justify-between gap-1",
                                isWeekend ? "bg-gray-100/80" : "bg-gray-50"
                            )}
                        >
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    {day.day.slice(0, 3)}
                                </p>
                                <p className="text-sm font-bold text-gray-900">{day.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">{dayTotal}h</p>
                                {forecast && forecast.totalForecast > 0 && (
                                    <p className="text-[10px] text-blue-600 flex items-center justify-end gap-0.5">
                                        <Target className="w-3 h-3" />
                                        {forecast.totalForecast}h
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[220px]">
                            {day.entries.length === 0 ? (
                                <p className="text-[11px] text-gray-400 text-center py-6 px-1">
                                    No time logged
                                </p>
                            ) : (
                                day.entries.map((entry) => {
                                    const locked =
                                        entry.status === "Submitted" ||
                                        entry.status === "PM_Approved"
                                    return (
                                        <button
                                            key={entry.tempId}
                                            type="button"
                                            disabled={isTimesheetLocked && locked}
                                            onClick={() => onEditEntry(dayIndex, entry.tempId)}
                                            className={cn(
                                                "w-full text-left rounded-lg border px-2 py-1.5 text-[11px] transition-opacity hover:opacity-90",
                                                projectChipColor(entry.projectCode),
                                                locked && "opacity-80"
                                            )}
                                        >
                                            <p className="font-semibold truncate">
                                                {projectNameForCode(entry.projectCode, projects)}
                                            </p>
                                            <p className="flex items-center justify-between mt-0.5">
                                                <span>{entry.hours}h</span>
                                                {entry.status && entry.status !== "Draft" && (
                                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                                        {entry.status === "PM_Approved"
                                                            ? "OK"
                                                            : entry.status.slice(0, 4)}
                                                    </Badge>
                                                )}
                                            </p>
                                        </button>
                                    )
                                })
                            )}
                        </div>

                        {!isTimesheetLocked && (
                            <div className="p-2 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-8 text-xs gap-1 text-gray-600 hover:text-brand-700 hover:bg-brand-50"
                                    onClick={() => onAddEntry(dayIndex)}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add time
                                </Button>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
