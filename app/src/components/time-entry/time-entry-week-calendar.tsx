import { useState, useCallback } from "react"
import { Plus, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { projectChipColor } from "./project-color"
import {
    TIME_ENTRY_DRAG_TYPE,
    type DayData,
    type DailyForecastDay,
    type DraggedProjectPayload,
    type ProjectOption,
} from "./time-entry-types"

interface TimeEntryWeekCalendarProps {
    weekData: DayData[]
    dailyForecastDays?: DailyForecastDay[]
    projects: ProjectOption[]
    isTimesheetLocked: boolean
    onAddEntry: (dayIndex: number) => void
    onEditEntry: (dayIndex: number, tempId: string) => void
    onDropProject: (dayIndex: number, project: DraggedProjectPayload) => void
}

function projectNameForCode(code: string, projects: ProjectOption[]): string {
    const p = projects.find((x) => x.code === code)
    if (p) return p.name
    if (code.startsWith("LV-")) return code.replace("LV-", "") + " Leave"
    return code
}

function parseDraggedProject(e: React.DragEvent): DraggedProjectPayload | null {
    const raw = e.dataTransfer.getData(TIME_ENTRY_DRAG_TYPE)
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as DraggedProjectPayload
        if (parsed?.code && parsed?.id) return parsed
    } catch {
        return null
    }
    return null
}

export function TimeEntryWeekCalendar({
    weekData,
    dailyForecastDays,
    projects,
    isTimesheetLocked,
    onAddEntry,
    onEditEntry,
    onDropProject,
}: TimeEntryWeekCalendarProps) {
    const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null)

    const handleDragOver = useCallback(
        (e: React.DragEvent, dayIndex: number) => {
            if (isTimesheetLocked) return
            if (!e.dataTransfer.types.includes(TIME_ENTRY_DRAG_TYPE)) return
            e.preventDefault()
            e.dataTransfer.dropEffect = "copy"
            setDragOverDayIndex(dayIndex)
        },
        [isTimesheetLocked]
    )

    const handleDragLeave = useCallback((e: React.DragEvent, dayIndex: number) => {
        const related = e.relatedTarget as Node | null
        if (related && e.currentTarget.contains(related)) return
        setDragOverDayIndex((prev) => (prev === dayIndex ? null : prev))
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent, dayIndex: number) => {
            e.preventDefault()
            setDragOverDayIndex(null)
            if (isTimesheetLocked) return
            const project = parseDraggedProject(e)
            if (project) onDropProject(dayIndex, project)
        },
        [isTimesheetLocked, onDropProject]
    )

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 flex-1 min-w-0">
            {weekData.map((day, dayIndex) => {
                const dayTotal = day.entries.reduce(
                    (sum, e) => sum + (Number(e.hours) || 0),
                    0
                )
                const forecast = dailyForecastDays?.find((d) => d.date === day.fullDate)
                const isWeekend = !day.isWeekday
                const isDropTarget = dragOverDayIndex === dayIndex

                return (
                    <div
                        key={day.fullDate}
                        onDragOver={(e) => handleDragOver(e, dayIndex)}
                        onDragLeave={(e) => handleDragLeave(e, dayIndex)}
                        onDrop={(e) => handleDrop(e, dayIndex)}
                        className={cn(
                            "flex flex-col rounded-xl border min-h-[200px] overflow-hidden transition-all",
                            isWeekend ? "bg-gray-50/80 border-gray-200" : "bg-white border-gray-200",
                            isDropTarget && "ring-2 ring-brand-500 ring-offset-1 border-brand-300 shadow-md scale-[1.01]",
                            !isTimesheetLocked && !isDropTarget && "hover:shadow-sm"
                        )}
                    >
                        <div
                            className={cn(
                                "px-3 py-2 border-b flex items-start justify-between gap-1",
                                isWeekend ? "bg-gray-100/80" : "bg-gray-50",
                                isDropTarget && "bg-brand-50"
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

                        <div
                            className={cn(
                                "flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[220px] min-h-[120px]",
                                isDropTarget && "bg-brand-50/40"
                            )}
                        >
                            {day.entries.length === 0 ? (
                                <p
                                    className={cn(
                                        "text-[11px] text-center py-6 px-1",
                                        isDropTarget
                                            ? "text-brand-600 font-medium"
                                            : "text-gray-400"
                                    )}
                                >
                                    {isDropTarget ? "Drop project here" : "No time logged"}
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
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[9px] px-1 py-0 h-4"
                                                    >
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
