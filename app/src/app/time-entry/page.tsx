"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Loader2, AlertCircle, Clock } from "lucide-react"
import { snapToMonday } from "@/lib/dashboard-period"
import {
    getCurrentWeekStart,
    getWeekDaysFromMonday,
    formatWeekRangeLabel,
    shiftWeekStart,
    isCurrentWeek,
    isFutureWeek,
    getMissingWeekdays,
} from "@/lib/time-entry-week"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTimeEntries } from "@/lib/use-time-entries"
import { useEmployees } from "@/lib/use-employees"
import { useProjects } from "@/lib/use-projects"
import { useAuth } from "@/lib/auth-context"
import { isTeamTimeManager } from "@/lib/roles"
import { api } from "@/lib/api-client"
import { TimeEntryEntryDialog } from "@/components/time-entry/time-entry-entry-dialog"
import type { DayData, DayEntry, ProjectOption, DailyForecastDay, DraggedProjectPayload } from "@/components/time-entry/time-entry-types"
import { TimeHeader } from "@/components/time-tracking/TimeHeader"
import { TimeKPICards } from "@/components/time-tracking/TimeKPICards"
import { WeeklyNavigator } from "@/components/time-tracking/WeeklyNavigator"
import { ViewSwitcher } from "@/components/time-tracking/ViewSwitcher"
import { TimesheetGrid } from "@/components/time-tracking/TimesheetGrid"
import { TimesheetWorkspace } from "@/components/time-tracking/TimesheetWorkspace"
import { AISuggestionPanel } from "@/components/time-tracking/AISuggestionPanel"
import { ApprovalTimeline } from "@/components/time-tracking/ApprovalTimeline"
import { ValidationBanner } from "@/components/time-tracking/ValidationBanner"
import { QuickTimeEntry } from "@/components/time-tracking/QuickTimeEntry"
import { ManagerOverview } from "@/components/time-tracking/ManagerOverview"
import {
    computeTimeKPIs,
    deriveTimeSuggestions,
    flattenToGridRows,
    exportTimesheetCsv,
} from "@/components/time-tracking/time-metrics"
import type { TimeViewMode, TimesheetStatus, TimeSuggestion } from "@/components/time-tracking/types"
import "@/components/time-tracking/time-tracking.css"

interface TimeCodeResponse {
    id: string
    code: string
    description: string
    isBillable: boolean
}

interface DailyForecastData {
    weekTotal: number
    days: DailyForecastDay[]
}

const leaveTypes = [
    { code: "LV-PL", name: "Planned Leave" },
    { code: "LV-SL", name: "Sick Leave" },
]

const otherCodes = [
    { code: "TRAINING", name: "Training" },
    { code: "MEETING", name: "Internal Meetings" },
]

function generateTempId() {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function TimeEntry() {
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => getCurrentWeekStart())
    const weekDates = useMemo(() => getWeekDaysFromMonday(selectedWeekStart), [selectedWeekStart])
    const [weekData, setWeekData] = useState<DayData[]>(() =>
        getWeekDaysFromMonday(getCurrentWeekStart()).map((d) => ({ ...d, entries: [] }))
    )
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
    const [dailyForecast, setDailyForecast] = useState<DailyForecastData | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [submitWarnings, setSubmitWarnings] = useState<string[]>([])
    const [allocationEstimates, setAllocationEstimates] = useState<{
        totalEstimated: number
        byProject: { projectId: string; projectName: string; estimatedHours: number; percentage: number }[]
    } | null>(null)
    const [timeCodeId, setTimeCodeId] = useState<string | null>(null)
    const [timeCodeError, setTimeCodeError] = useState<string | null>(null)
    const [savingEntryId, setSavingEntryId] = useState<string | null>(null)
    const [rowSaveMessage, setRowSaveMessage] = useState<string | null>(null)
    const [entryDialog, setEntryDialog] = useState<{ dayIndex: number; tempId: string } | null>(null)
    const [dialogProjectLocked, setDialogProjectLocked] = useState(false)
    const [viewMode, setViewMode] = useState<TimeViewMode>("calendar")
    const [insightsDrawerOpen, setInsightsDrawerOpen] = useState(false)

    const { user } = useAuth()
    const isSelfOnly = user?.role === "Employee" || user?.role === "User"
    const isTeamLead = isTeamTimeManager(user?.role)
    const { submitTimeEntry, submitWeeklyTimesheet, deleteTimeEntry, loading } = useTimeEntries()
    const { employees, loading: loadingEmployees } = useEmployees({ allocatedToMyProjects: isTeamLead })
    const { projects, loading: loadingProjects } = useProjects()

    useEffect(() => {
        if (isSelfOnly && user?.id) {
            setSelectedEmployeeId(user.id)
            return
        }
        if (employees.length === 0) {
            setSelectedEmployeeId("")
            return
        }
        if (!selectedEmployeeId || !employees.some((e) => e.id === selectedEmployeeId)) {
            setSelectedEmployeeId(employees[0].id)
        }
    }, [employees, selectedEmployeeId, isSelfOnly, user?.id])

    useEffect(() => {
        setWeekData(weekDates.map((d) => ({ ...d, entries: [] })))
        setSubmitError(null)
        setSubmitSuccess(false)
        setSubmitWarnings([])
    }, [selectedWeekStart, weekDates])

    const loadTimeCodes = useCallback(async () => {
        try {
            const codes = await api.get<TimeCodeResponse[]>("/time-entries/codes")
            if (codes.length > 0) {
                const preferred =
                    codes.find((c) => c.code === "DEV") ||
                    codes.find((c) => c.code === "BILLABLE") ||
                    codes[0]
                setTimeCodeId(preferred.id)
                setTimeCodeError(null)
            } else {
                setTimeCodeId(null)
                setTimeCodeError("No time codes are configured. Contact an administrator.")
            }
        } catch (err) {
            setTimeCodeId(null)
            const detail = err instanceof Error ? err.message : "Unknown error"
            setTimeCodeError(`Could not load time codes: ${detail}`)
        }
    }, [])

    useEffect(() => {
        if (!user) return
        void loadTimeCodes()
    }, [user, loadTimeCodes])

    const fetchSavedEntries = useCallback(async () => {
        if (!selectedEmployeeId || projects.length === 0) return
        const weekStart = weekDates[0].fullDate

        try {
            const entries = await api.get<{
                id: string; employeeId: string; projectId: string; date: string; hours: number; comments?: string; status: string
            }[]>(`/time-entries?employeeId=${selectedEmployeeId}&week=${weekStart}`)

            const projectIdToCode: Record<string, string> = {}
            projects.forEach((p) => { projectIdToCode[p.id] = p.code })

            setWeekData((prev) =>
                prev.map((day) => {
                    const dayEntries = entries
                        .filter((e) => e.date === day.fullDate)
                        .map((e) => ({
                            tempId: generateTempId(),
                            serverEntryId: e.id,
                            projectCode: projectIdToCode[e.projectId] || "",
                            hours: e.hours,
                            comments: e.comments || "",
                            status: e.status,
                            isDirty: false,
                            isEditing: false,
                        }))
                    return { ...day, entries: dayEntries.length > 0 ? dayEntries : [] }
                })
            )
        } catch {
            /* keep current */
        }
    }, [selectedEmployeeId, weekDates, projects])

    useEffect(() => {
        void fetchSavedEntries()
    }, [fetchSavedEntries])

    const fetchDailyForecast = useCallback(async () => {
        if (!selectedEmployeeId) return
        const weekStart = weekDates[0].fullDate
        try {
            const data = await api.get<DailyForecastData>(`/time-entries/daily-forecast?employeeId=${selectedEmployeeId}&week=${weekStart}`)
            setDailyForecast(data)
        } catch {
            setDailyForecast(null)
        }
    }, [selectedEmployeeId, weekDates])

    useEffect(() => {
        void fetchDailyForecast()
    }, [fetchDailyForecast])

    useEffect(() => {
        if (!selectedEmployeeId || weekDates.length === 0) return
        const weekStart = weekDates[0].fullDate
        api.get<{ totalEstimated: number; byProject: { projectId: string; projectName: string; estimatedHours: number; percentage: number }[] }>(
            `/time-entries/estimates?employeeId=${selectedEmployeeId}&week=${weekStart}`
        ).then(setAllocationEstimates).catch(() => setAllocationEstimates(null))
    }, [selectedEmployeeId, weekDates])

    useEffect(() => {
        if (submitSuccess || submitError) {
            const timer = setTimeout(() => {
                setSubmitSuccess(false)
                setSubmitError(null)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [submitSuccess, submitError])

    useEffect(() => {
        if (!rowSaveMessage) return
        const timer = setTimeout(() => setRowSaveMessage(null), 3000)
        return () => clearTimeout(timer)
    }, [rowSaveMessage])

    const selectedEmployee = useMemo(
        () => employees.find((e) => e.id === selectedEmployeeId),
        [employees, selectedEmployeeId]
    )

    const selectableProjects = useMemo((): ProjectOption[] => {
        const allocatedIds = new Set<string>()
        allocationEstimates?.byProject.forEach((p) => allocatedIds.add(p.projectId))
        dailyForecast?.days.forEach((d) => d.byProject.forEach((p) => allocatedIds.add(p.projectId)))

        const usedCodes = new Set(weekData.flatMap((d) => d.entries.map((e) => e.projectCode)).filter(Boolean))

        const byId = new Map<string, ProjectOption>()
        for (const p of projects) {
            const isActive = !p.status || p.status === "Active" || p.status === "Planning"
            if (!isActive && !usedCodes.has(p.code)) continue
            byId.set(p.id, { code: p.code, name: p.name, id: p.id, isAllocated: allocatedIds.has(p.id) })
        }
        for (const p of projects) {
            if (usedCodes.has(p.code) && !byId.has(p.id)) {
                byId.set(p.id, { code: p.code, name: p.name, id: p.id, isAllocated: allocatedIds.has(p.id) })
            }
        }
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
    }, [projects, allocationEstimates, dailyForecast, weekData])

    const allocationByProject = useMemo(() => {
        const map = new Map<string, { estimatedHours: number; percentage: number }>()
        allocationEstimates?.byProject.forEach((p) => {
            map.set(p.projectId, { estimatedHours: p.estimatedHours, percentage: p.percentage })
        })
        return map
    }, [allocationEstimates])

    const totalHours = useMemo(
        () => weekData.reduce((sum, day) => sum + day.entries.reduce((daySum, e) => daySum + (Number(e.hours) || 0), 0), 0),
        [weekData]
    )

    const hasUnsavedChanges = useMemo(
        () => weekData.some((day) => day.entries.some((e) => e.isDirty && (e.hours > 0 || e.projectCode !== ""))),
        [weekData]
    )

    const dirtyEntryCount = useMemo(
        () =>
            weekData.reduce(
                (count, day) => count + day.entries.filter((e) => e.isDirty && e.hours > 0 && e.projectCode).length,
                0
            ),
        [weekData]
    )

    const weekTimesheetStatus = useMemo((): TimesheetStatus => {
        const entries = weekData.flatMap((d) => d.entries).filter((e) => e.hours > 0 && e.projectCode)
        if (entries.length === 0) return "empty"
        const statuses = entries.map((e) => e.status || "Draft")
        if (statuses.every((s) => s === "PM_Approved")) return "approved"
        if (statuses.every((s) => s === "Submitted")) return "submitted"
        if (statuses.some((s) => s === "PM_Rejected")) return "rejected"
        if (statuses.some((s) => s === "Submitted" || s === "PM_Approved")) return "partial"
        return "draft"
    }, [weekData])

    const isTimesheetLocked = weekTimesheetStatus === "submitted" || weekTimesheetStatus === "approved"

    const viewingCurrentWeek = isCurrentWeek(selectedWeekStart)
    const viewingFutureWeek = isFutureWeek(selectedWeekStart)

    const missingWeekdays = useMemo(() => {
        const byDate = new Map<string, { hours: number; projectCode: string }[]>()
        for (const day of weekData) {
            byDate.set(day.fullDate, day.entries.map((e) => ({ hours: e.hours, projectCode: e.projectCode })))
        }
        return getMissingWeekdays(weekDates, byDate)
    }, [weekData, weekDates])

    const canSubmitWeek =
        !isTimesheetLocked &&
        !isFutureWeek(selectedWeekStart) &&
        missingWeekdays.length === 0 &&
        dirtyEntryCount === 0 &&
        totalHours > 0

    const kpis = useMemo(() => computeTimeKPIs(weekData, weekTimesheetStatus), [weekData, weekTimesheetStatus])

    const suggestions = useMemo(
        () => deriveTimeSuggestions(weekData, missingWeekdays, allocationEstimates),
        [weekData, missingWeekdays, allocationEstimates]
    )

    const gridRows = useMemo(
        () => flattenToGridRows(weekData, selectableProjects, selectedEmployee?.name ?? user?.name ?? "—"),
        [weekData, selectableProjects, selectedEmployee, user?.name]
    )

    const topProject = allocationEstimates?.byProject[0]?.projectName

    const getProjectId = useCallback(
        (code: string): string | null => selectableProjects.find((p) => p.code === code)?.id || null,
        [selectableProjects]
    )

    const saveEntry = useCallback(
        async (dayIndex: number, tempId: string) => {
            if (!selectedEmployee) {
                setSubmitError("No employee selected.")
                return
            }
            if (!timeCodeId) {
                setSubmitError("Time code not configured.")
                return
            }

            const day = weekData[dayIndex]
            const entry = day?.entries.find((e) => e.tempId === tempId)
            if (!entry) return

            if (!entry.projectCode || entry.hours <= 0) {
                setSubmitError("Select a project and enter hours before saving.")
                return
            }

            const projectId = selectableProjects.find((p) => p.code === entry.projectCode)?.id
            if (!projectId) {
                setSubmitError(`Invalid project: ${entry.projectCode}.`)
                return
            }

            setSavingEntryId(tempId)
            setSubmitError(null)
            setRowSaveMessage(null)

            try {
                const saved = await submitTimeEntry({
                    employeeId: selectedEmployee.id,
                    projectId,
                    timeCodeId,
                    date: day.fullDate,
                    hours: entry.hours,
                    comments: entry.comments || undefined,
                })

                setWeekData((prev) =>
                    prev.map((d, i) =>
                        i === dayIndex
                            ? {
                                  ...d,
                                  entries: d.entries.map((e) =>
                                      e.tempId === tempId
                                          ? { ...e, serverEntryId: saved.id, status: saved.status, isDirty: false, isEditing: false }
                                          : e
                                  ),
                              }
                            : d
                    )
                )
                setRowSaveMessage("Entry saved.")
                await Promise.all([fetchSavedEntries(), fetchDailyForecast()])
            } catch (err) {
                setSubmitError(err instanceof Error ? err.message : "Failed to save entry")
            } finally {
                setSavingEntryId(null)
            }
        },
        [selectedEmployee, timeCodeId, weekData, selectableProjects, submitTimeEntry, fetchSavedEntries, fetchDailyForecast]
    )

    const handleSaveDraft = useCallback(async () => {
        const dirty: { dayIndex: number; tempId: string }[] = []
        weekData.forEach((day, dayIndex) => {
            day.entries.forEach((e) => {
                if (e.isDirty && e.hours > 0 && e.projectCode) dirty.push({ dayIndex, tempId: e.tempId })
            })
        })
        for (const { dayIndex, tempId } of dirty) {
            await saveEntry(dayIndex, tempId)
        }
    }, [weekData, saveEntry])

    const handleCopyPreviousWeek = useCallback(async () => {
        if (!selectedEmployeeId || projects.length === 0 || isTimesheetLocked) return
        const prevWeekStart = shiftWeekStart(selectedWeekStart, -1)
        try {
            const entries = await api.get<{
                id: string; projectId: string; date: string; hours: number; comments?: string
            }[]>(`/time-entries?employeeId=${selectedEmployeeId}&week=${prevWeekStart}`)

            if (entries.length === 0) {
                setSubmitError("No entries found in the previous week.")
                return
            }

            const projectIdToCode: Record<string, string> = {}
            projects.forEach((p) => { projectIdToCode[p.id] = p.code })

            const prevWeekDates = getWeekDaysFromMonday(prevWeekStart)
            const dayIndexByDate = new Map(weekDates.map((d, i) => [d.fullDate, i]))
            const prevToCurrent = new Map<number, number>()
            prevWeekDates.forEach((_pd, pi) => {
                const cd = weekDates[pi]
                if (cd) prevToCurrent.set(pi, dayIndexByDate.get(cd.fullDate) ?? pi)
            })

            setWeekData((prev) => {
                const next = prev.map((d) => ({ ...d, entries: [...d.entries] }))
                for (const entry of entries) {
                    const prevDayIdx = prevWeekDates.findIndex((d) => d.fullDate === entry.date)
                    const dayIndex = prevToCurrent.get(prevDayIdx)
                    if (dayIndex == null) continue
                    const code = projectIdToCode[entry.projectId]
                    if (!code) continue
                    next[dayIndex].entries.push({
                        tempId: generateTempId(),
                        projectCode: code,
                        hours: entry.hours,
                        comments: entry.comments || "",
                        isDirty: true,
                        isEditing: false,
                    })
                }
                return next
            })
            setRowSaveMessage("Previous week copied as draft entries. Save each row or use Save Draft.")
        } catch {
            setSubmitError("Could not copy previous week.")
        }
    }, [selectedEmployeeId, projects, selectedWeekStart, weekDates, isTimesheetLocked])

    const handleExport = useCallback(() => {
        exportTimesheetCsv(gridRows)
    }, [gridRows])

    const handleEmployeeChange = useCallback(
        (newId: string) => {
            if (newId === selectedEmployeeId) return
            if (hasUnsavedChanges) {
                if (!window.confirm("Unsaved entries will be discarded. Continue?")) return
            }
            setSubmitError(null)
            setSubmitSuccess(false)
            setSelectedEmployeeId(newId)
        },
        [selectedEmployeeId, hasUnsavedChanges]
    )

    const handleWeekChange = useCallback(
        (newWeekStart: string) => {
            const snapped = snapToMonday(newWeekStart)
            if (snapped === selectedWeekStart) return
            if (hasUnsavedChanges) {
                if (!window.confirm("Unsaved entries will be discarded. Continue?")) return
            }
            setSelectedWeekStart(snapped)
        },
        [selectedWeekStart, hasUnsavedChanges]
    )

    const addEntry = useCallback((dayIndex: number) => {
        const tempId = generateTempId()
        setDialogProjectLocked(false)
        setWeekData((prev) =>
            prev.map((day, i) =>
                i === dayIndex
                    ? {
                          ...day,
                          entries: [
                              ...day.entries,
                              { tempId, projectCode: "", hours: 0, comments: "", isDirty: true, isEditing: true },
                          ],
                      }
                    : day
            )
        )
        setEntryDialog({ dayIndex, tempId })
    }, [])

    const handleQuickAdd = useCallback(() => {
        const firstMissing = weekData.findIndex(
            (d) => d.isWeekday && d.entries.reduce((s, e) => s + e.hours, 0) < 8
        )
        addEntry(firstMissing >= 0 ? firstMissing : weekData.findIndex((d) => d.isWeekday) || 0)
    }, [weekData, addEntry])

    const handleApplySuggestion = useCallback(
        (suggestion: TimeSuggestion) => {
            if (suggestion.id === "missing-hours" && missingWeekdays.length > 0) {
                const dayIndex = weekData.findIndex((d) => d.day === missingWeekdays[0])
                if (dayIndex >= 0) addEntry(dayIndex)
                return
            }
            if (suggestion.dayIndex != null) {
                addEntry(suggestion.dayIndex)
            }
        },
        [missingWeekdays, weekData, addEntry]
    )

    const handleDropProject = useCallback(
        (dayIndex: number, project: DraggedProjectPayload) => {
            const tempId = generateTempId()
            const day = weekDates[dayIndex]
            const defaultHours = day?.isWeekday ? 8 : 0
            setDialogProjectLocked(true)
            setWeekData((prev) =>
                prev.map((d, i) =>
                    i === dayIndex
                        ? {
                              ...d,
                              entries: [
                                  ...d.entries,
                                  {
                                      tempId,
                                      projectCode: project.code,
                                      hours: defaultHours,
                                      comments: "",
                                      isDirty: true,
                                      isEditing: true,
                                  },
                              ],
                          }
                        : d
                )
            )
            setEntryDialog({ dayIndex, tempId })
        },
        [weekDates]
    )

    const openEditEntry = useCallback((dayIndex: number, tempId: string) => {
        setDialogProjectLocked(false)
        setEntryDialog({ dayIndex, tempId })
    }, [])

    const closeEntryDialog = useCallback(() => {
        if (entryDialog) {
            const entry = weekData[entryDialog.dayIndex]?.entries.find((e) => e.tempId === entryDialog.tempId)
            if (entry && !entry.serverEntryId && !entry.projectCode && entry.hours <= 0) {
                setWeekData((prev) =>
                    prev.map((day, i) =>
                        i === entryDialog.dayIndex
                            ? { ...day, entries: day.entries.filter((e) => e.tempId !== entryDialog.tempId) }
                            : day
                    )
                )
            }
        }
        setEntryDialog(null)
        setDialogProjectLocked(false)
    }, [entryDialog, weekData])

    const removeEntry = useCallback(
        async (dayIndex: number, tempId: string) => {
            const entry = weekData[dayIndex]?.entries.find((e) => e.tempId === tempId)
            if (entry?.serverEntryId && selectedEmployeeId) {
                try {
                    await deleteTimeEntry(entry.serverEntryId, selectedEmployeeId)
                } catch {
                    return
                }
            }
            setWeekData((prev) =>
                prev.map((day, i) =>
                    i === dayIndex ? { ...day, entries: day.entries.filter((e) => e.tempId !== tempId) } : day
                )
            )
        },
        [weekData, selectedEmployeeId, deleteTimeEntry]
    )

    const updateEntry = useCallback((dayIndex: number, tempId: string, field: keyof DayEntry, value: string | number) => {
        setWeekData((prev) =>
            prev.map((day, i) =>
                i === dayIndex
                    ? {
                          ...day,
                          entries: day.entries.map((e) =>
                              e.tempId === tempId ? { ...e, [field]: value, isDirty: true, isEditing: true } : e
                          ),
                      }
                    : day
            )
        )
    }, [])

    const dialogEntry = useMemo(() => {
        if (!entryDialog) return null
        return weekData[entryDialog.dayIndex]?.entries.find((e) => e.tempId === entryDialog.tempId) ?? null
    }, [entryDialog, weekData])

    const updateDialogEntry = useCallback(
        (field: keyof DayEntry, value: string | number) => {
            if (!entryDialog) return
            updateEntry(entryDialog.dayIndex, entryDialog.tempId, field, value)
        },
        [entryDialog, updateEntry]
    )

    const saveDialogEntry = useCallback(async () => {
        if (!entryDialog) return
        await saveEntry(entryDialog.dayIndex, entryDialog.tempId)
        setEntryDialog(null)
    }, [entryDialog, saveEntry])

    const deleteDialogEntry = useCallback(async () => {
        if (!entryDialog) return
        await removeEntry(entryDialog.dayIndex, entryDialog.tempId)
        setEntryDialog(null)
    }, [entryDialog, removeEntry])

    const handleSubmit = async () => {
        setSubmitError(null)
        setSubmitSuccess(false)
        setSubmitWarnings([])

        if (!selectedEmployee) {
            setSubmitError("No employee selected.")
            return
        }

        if (weekTimesheetStatus === "approved") {
            setSubmitError("This timesheet has already been approved.")
            return
        }

        if (weekTimesheetStatus === "submitted") {
            setSubmitError("This timesheet is already submitted.")
            return
        }

        const allEntries = weekData.flatMap((day) =>
            day.entries.filter((e) => e.hours > 0 && e.projectCode).map((e) => ({ ...e, fullDate: day.fullDate }))
        )

        if (allEntries.length === 0) {
            setSubmitError("No time entries to submit.")
            return
        }

        if (isFutureWeek(selectedWeekStart)) {
            setSubmitError("Future weeks cannot be submitted.")
            return
        }

        if (missingWeekdays.length > 0) {
            setSubmitError(`Complete all weekdays before submitting. Missing: ${missingWeekdays.join(", ")}.`)
            return
        }

        if (!timeCodeId) {
            setSubmitError("Time code not configured.")
            return
        }

        const invalidRows: { projectCode: string; date: string }[] = []
        const entriesToSave: typeof allEntries = []

        for (const entry of allEntries) {
            const projectId = getProjectId(entry.projectCode)
            if (!projectId) {
                invalidRows.push({ projectCode: entry.projectCode, date: entry.fullDate })
                continue
            }
            entriesToSave.push(entry)
        }

        if (invalidRows.length > 0) {
            setSubmitError(`${invalidRows.length} entries have invalid projects. Fix before submitting.`)
            return
        }

        try {
            for (const entry of entriesToSave) {
                const projectId = getProjectId(entry.projectCode)!
                await submitTimeEntry({
                    employeeId: selectedEmployee.id,
                    projectId,
                    timeCodeId,
                    date: entry.fullDate,
                    hours: entry.hours,
                    comments: entry.comments || undefined,
                })
            }

            const weekStart = weekDates[0].fullDate
            const submitResult = await submitWeeklyTimesheet(selectedEmployee.id, weekStart)

            setSubmitSuccess(true)
            setSubmitWarnings(submitResult.warnings ?? [])
            setRowSaveMessage(null)
            await Promise.all([fetchSavedEntries(), fetchDailyForecast()])
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Failed to submit timesheet")
        }
    }

    const handleReset = () => {
        void fetchSavedEntries()
        setSubmitError(null)
        setSubmitSuccess(false)
    }

    const isLoading = loadingEmployees || loadingProjects

    if (isLoading) {
        return (
            <PageContainer className="flex items-center justify-center min-h-[400px]">
                <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading time intelligence…</span>
                </div>
            </PageContainer>
        )
    }

    const selectedWeek = formatWeekRangeLabel(selectedWeekStart)
    const employeeDisplayName = isSelfOnly ? (user?.name ?? "—") : (selectedEmployee?.name ?? "—")

    return (
        <PageContainer className="max-w-[1920px] !px-8 !py-8 space-y-6 pb-24">
            {isTeamLead && employees.length === 0 && (
                <Card className="p-4 border-amber-200 bg-amber-50 rounded-xl">
                    <p className="text-sm text-amber-900">
                        No employees allocated to your projects. Assign team members under Resource Allocation.
                    </p>
                </Card>
            )}

            <TimeHeader
                employeeName={employeeDisplayName}
                isSelfOnly={isSelfOnly}
                employees={employees}
                selectedEmployeeId={selectedEmployeeId}
                onEmployeeChange={handleEmployeeChange}
                loadingEmployees={loadingEmployees}
                weekTimesheetStatus={weekTimesheetStatus}
                isTimesheetLocked={isTimesheetLocked}
                loading={loading}
                canSubmit={canSubmitWeek}
                dirtyCount={dirtyEntryCount}
                onSaveDraft={() => void handleSaveDraft()}
                onSubmit={() => void handleSubmit()}
                onCopyPreviousWeek={() => void handleCopyPreviousWeek()}
                onExport={handleExport}
                isProjectManager={isTeamLead}
            />

            <TimeKPICards kpis={kpis} />

            {timeCodeError && (
                <Card className="p-4 bg-amber-50 border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium text-amber-900 text-sm">{timeCodeError}</p>
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void loadTimeCodes()}>
                                Retry
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {submitError && (
                <Card className="p-4 bg-red-50 border-red-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-sm text-red-700">{submitError}</p>
                    </div>
                </Card>
            )}

            {submitSuccess && (
                <Card className="p-4 bg-emerald-50 border-emerald-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-emerald-900">Timesheet submitted for approval</p>
                            {submitWarnings.length > 0 && (
                                <ul className="text-sm text-amber-700 mt-2 list-disc pl-4">
                                    {submitWarnings.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {rowSaveMessage && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                    {rowSaveMessage}
                </p>
            )}

            <WeeklyNavigator
                weekLabel={selectedWeek}
                weekStart={selectedWeekStart}
                isCurrentWeek={viewingCurrentWeek}
                isFutureWeek={viewingFutureWeek}
                onPrevious={() => handleWeekChange(shiftWeekStart(selectedWeekStart, -1))}
                onNext={() => handleWeekChange(shiftWeekStart(selectedWeekStart, 1))}
                onToday={() => handleWeekChange(getCurrentWeekStart())}
                onDatePick={handleWeekChange}
            />

            {viewingFutureWeek && (
                <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <strong>Future week.</strong> Draft entries are allowed; submit becomes available once the week starts.
                </p>
            )}

            {!isTimesheetLocked && !viewingFutureWeek && missingWeekdays.length > 0 && (
                <ValidationBanner missingWeekdays={missingWeekdays} remainingHours={kpis.remainingHours} />
            )}

            <ViewSwitcher value={viewMode} onChange={setViewMode} />

            {viewMode === "calendar" && (
                <TimesheetWorkspace
                    weekData={weekData}
                    projects={selectableProjects}
                    dailyForecastDays={dailyForecast?.days}
                    allocationByProject={allocationByProject}
                    isTimesheetLocked={isTimesheetLocked}
                    disabled={!selectedEmployeeId}
                    onAddEntry={addEntry}
                    onEditEntry={openEditEntry}
                    onDropProject={handleDropProject}
                    kpis={kpis}
                    topProject={topProject}
                    missingDays={missingWeekdays.length}
                    suggestions={suggestions}
                    onApplySuggestion={handleApplySuggestion}
                    insightsDrawerOpen={insightsDrawerOpen}
                    onOpenInsights={() => setInsightsDrawerOpen(true)}
                    onCloseInsights={() => setInsightsDrawerOpen(false)}
                />
            )}

            {viewMode === "grid" && (
                <TimesheetGrid rows={gridRows} onExport={handleExport} />
            )}

            {viewMode === "summary" && (
                <div className="space-y-6">
                    {isTeamLead && employees.length > 0 && (
                        <ManagerOverview
                            teamSize={employees.length}
                            pendingApprovals={0}
                            missingSubmissions={missingWeekdays.length > 0 ? 1 : 0}
                        />
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ApprovalTimeline status={weekTimesheetStatus} />
                        <AISuggestionPanel suggestions={suggestions} onApply={handleApplySuggestion} />
                    </div>
                    {allocationEstimates && allocationEstimates.byProject.length > 0 && (
                        <div className="tt-card p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Allocation forecast</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Expected ~{allocationEstimates.totalEstimated}h from active allocations
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {allocationEstimates.byProject.map((p) => (
                                    <span
                                        key={p.projectId}
                                        className="text-sm px-3 py-2 bg-slate-100 rounded-xl text-slate-700"
                                    >
                                        {p.projectName}: {p.estimatedHours}h
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!isTimesheetLocked && (
                <QuickTimeEntry
                    disabled={!selectedEmployeeId || isTimesheetLocked}
                    onClick={handleQuickAdd}
                />
            )}

            {entryDialog && dialogEntry && (
                <TimeEntryEntryDialog
                    open={!!entryDialog}
                    dayLabel={weekData[entryDialog.dayIndex]?.day ?? ""}
                    dayDate={weekData[entryDialog.dayIndex]?.date ?? ""}
                    entry={dialogEntry}
                    projects={selectableProjects}
                    leaveTypes={leaveTypes}
                    otherCodes={otherCodes}
                    isLocked={
                        dialogEntry.status === "Submitted" ||
                        dialogEntry.status === "PM_Approved" ||
                        isTimesheetLocked
                    }
                    projectReadOnly={dialogProjectLocked}
                    isSaving={savingEntryId === entryDialog.tempId}
                    canSave={
                        !!timeCodeId &&
                        !!dialogEntry.projectCode &&
                        dialogEntry.hours > 0 &&
                        !!getProjectId(dialogEntry.projectCode)
                    }
                    onClose={closeEntryDialog}
                    onChange={updateDialogEntry}
                    onSave={() => void saveDialogEntry()}
                    onDelete={dialogEntry.serverEntryId ? () => void deleteDialogEntry() : undefined}
                />
            )}

            {dirtyEntryCount > 0 && !isTimesheetLocked && (
                <div className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] rounded-t-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-sm text-slate-600">
                            {dirtyEntryCount > 0
                                ? `${dirtyEntryCount} unsaved ${dirtyEntryCount === 1 ? "entry" : "entries"} — save draft or submit when complete.`
                                : missingWeekdays.length > 0
                                  ? `Complete ${missingWeekdays.join(", ")} before submitting.`
                                  : `${totalHours}h logged — ready to submit.`}
                        </p>
                        <div className="flex gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={handleReset} disabled={loading}>
                                Reset
                            </Button>
                            <Button
                                size="sm"
                                className="enterprise-gradient-bg text-white border-0"
                                onClick={() => void handleSubmit()}
                                disabled={loading || !canSubmitWeek}
                            >
                                Submit Timesheet
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    )
}
