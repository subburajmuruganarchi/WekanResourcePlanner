"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Calendar, Save, Clock, Loader2, AlertCircle, Target, ChevronLeft, ChevronRight } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTimeEntries } from "@/lib/use-time-entries"
import { useEmployees } from "@/lib/use-employees"
import { useProjects } from "@/lib/use-projects"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import { TimeEntryWeekCalendar } from "@/components/time-entry/time-entry-week-calendar"
import { TimeEntryEntryDialog } from "@/components/time-entry/time-entry-entry-dialog"
import { TimeEntryProjectPalette } from "@/components/time-entry/time-entry-project-palette"
import type { DayData, DayEntry, ProjectOption, DailyForecastDay, DraggedProjectPayload } from "@/components/time-entry/time-entry-types"

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
        getWeekDaysFromMonday(getCurrentWeekStart()).map(d => ({
            ...d,
            entries: []
        }))
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

    const { user } = useAuth()
    const isSelfOnly = user?.role === 'Employee' || user?.role === 'User'
    const isProjectManager = user?.role === 'Project Manager'
    const { submitTimeEntry, submitWeeklyTimesheet, deleteTimeEntry, loading } = useTimeEntries()
    const { employees, loading: loadingEmployees } = useEmployees({ allocatedToMyProjects: isProjectManager })
    const { projects, loading: loadingProjects } = useProjects()

    // Initialize selected employee (employees locked to self; PM sees allocated team only)
    useEffect(() => {
        if (isSelfOnly && user?.id) {
            setSelectedEmployeeId(user.id)
            return
        }
        if (employees.length === 0) {
            setSelectedEmployeeId('')
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

    // Fetch time code (after auth — endpoint requires token)
    const loadTimeCodes = useCallback(async () => {
        try {
            const codes = await api.get<TimeCodeResponse[]>('/time-entries/codes')
            if (codes.length > 0) {
                const preferred =
                    codes.find((c) => c.code === 'DEV') ||
                    codes.find((c) => c.code === 'BILLABLE') ||
                    codes[0]
                setTimeCodeId(preferred.id)
                setTimeCodeError(null)
            } else {
                setTimeCodeId(null)
                setTimeCodeError('No time codes are configured. Contact an administrator or refresh after backend setup.')
            }
        } catch (err) {
            setTimeCodeId(null)
            const detail = err instanceof Error ? err.message : 'Unknown error'
            setTimeCodeError(
                detail === 'Failed to fetch' || detail === 'Network error'
                    ? 'Could not reach the API. Check that the backend is running and VITE_API_URL is correct.'
                    : `Could not load time codes: ${detail}`
            )
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

            // Map projectId back to projectCode
            const projectIdToCode: Record<string, string> = {}
            projects.forEach(p => { projectIdToCode[p.id] = p.code })

            setWeekData(prev => prev.map(day => {
                const dayEntries = entries
                    .filter(e => e.date === day.fullDate)
                    .map(e => ({
                        tempId: generateTempId(),
                        serverEntryId: e.id,
                        projectCode: projectIdToCode[e.projectId] || '',
                        hours: e.hours,
                        comments: e.comments || '',
                        status: e.status,
                        isDirty: false,
                        isEditing: false,
                    }))
                return { ...day, entries: dayEntries.length > 0 ? dayEntries : [] }
            }))
        } catch {
            // Silently fail — entries stay as they are
        }
    }, [selectedEmployeeId, weekDates, projects])

    useEffect(() => {
        fetchSavedEntries()
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
        fetchDailyForecast()
    }, [fetchDailyForecast])

    useEffect(() => {
        if (!selectedEmployeeId || weekDates.length === 0) return
        const weekStart = weekDates[0].fullDate
        api.get<{ totalEstimated: number; byProject: { projectId: string; projectName: string; estimatedHours: number; percentage: number }[] }>(
            `/time-entries/estimates?employeeId=${selectedEmployeeId}&week=${weekStart}`
        ).then(setAllocationEstimates).catch(() => setAllocationEstimates(null))
    }, [selectedEmployeeId, weekDates])

    // Clear success/error messages after a delay
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

    const selectedEmployee = useMemo(() =>
        employees.find(e => e.id === selectedEmployeeId),
        [employees, selectedEmployeeId]
    )

    const selectableProjects = useMemo((): ProjectOption[] => {
        const allocatedIds = new Set<string>()
        allocationEstimates?.byProject.forEach((p) => allocatedIds.add(p.projectId))
        dailyForecast?.days.forEach((d) =>
            d.byProject.forEach((p) => allocatedIds.add(p.projectId))
        )

        const usedCodes = new Set(
            weekData.flatMap((d) => d.entries.map((e) => e.projectCode)).filter(Boolean)
        )

        const byId = new Map<string, ProjectOption>()
        for (const p of projects) {
            const isActive =
                !p.status || p.status === "Active" || p.status === "Planning"
            if (!isActive && !usedCodes.has(p.code)) continue
            byId.set(p.id, {
                code: p.code,
                name: p.name,
                id: p.id,
                isAllocated: allocatedIds.has(p.id),
            })
        }
        for (const p of projects) {
            if (usedCodes.has(p.code) && !byId.has(p.id)) {
                byId.set(p.id, {
                    code: p.code,
                    name: p.name,
                    id: p.id,
                    isAllocated: allocatedIds.has(p.id),
                })
            }
        }
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
    }, [projects, allocationEstimates, dailyForecast, weekData])

    const totalHours = useMemo(() =>
        weekData.reduce((sum, day) =>
            sum + day.entries.reduce((daySum, e) => daySum + (Number(e.hours) || 0), 0), 0
        ), [weekData]
    )

    const hasUnsavedChanges = useMemo(() =>
        weekData.some(day => day.entries.some(e => e.isDirty && (e.hours > 0 || e.projectCode !== ''))),
        [weekData]
    )

    const dirtyEntryCount = useMemo(
        () =>
            weekData.reduce(
                (count, day) =>
                    count +
                    day.entries.filter((e) => e.isDirty && e.hours > 0 && e.projectCode).length,
                0
            ),
        [weekData]
    )

    const weekTimesheetStatus = useMemo(() => {
        const entries = weekData.flatMap((d) => d.entries).filter((e) => e.hours > 0 && e.projectCode)
        if (entries.length === 0) return 'empty' as const
        const statuses = entries.map((e) => e.status || 'Draft')
        if (statuses.every((s) => s === 'PM_Approved')) return 'approved' as const
        if (statuses.every((s) => s === 'Submitted')) return 'submitted' as const
        if (statuses.some((s) => s === 'PM_Rejected')) return 'rejected' as const
        if (statuses.some((s) => s === 'Submitted' || s === 'PM_Approved')) return 'partial' as const
        return 'draft' as const
    }, [weekData])

    const isTimesheetLocked =
        weekTimesheetStatus === 'submitted' || weekTimesheetStatus === 'approved'

    const viewingCurrentWeek = isCurrentWeek(selectedWeekStart)
    const viewingFutureWeek = isFutureWeek(selectedWeekStart)

    const missingWeekdays = useMemo(() => {
        const byDate = new Map<string, { hours: number; projectCode: string }[]>()
        for (const day of weekData) {
            byDate.set(
                day.fullDate,
                day.entries.map((e) => ({ hours: e.hours, projectCode: e.projectCode }))
            )
        }
        return getMissingWeekdays(weekDates, byDate)
    }, [weekData, weekDates])

    const canSubmitWeek =
        !isTimesheetLocked &&
        !isFutureWeek(selectedWeekStart) &&
        missingWeekdays.length === 0 &&
        dirtyEntryCount === 0 &&
        totalHours > 0

    const getProjectId = useCallback(
        (code: string): string | null => {
            return selectableProjects.find((p) => p.code === code)?.id || null
        },
        [selectableProjects]
    )

    const saveEntry = useCallback(
        async (dayIndex: number, tempId: string) => {
            if (!selectedEmployee) {
                setSubmitError('No employee selected.')
                return
            }
            if (!timeCodeId) {
                setSubmitError('Time code not configured.')
                return
            }

            const day = weekData[dayIndex]
            const entry = day?.entries.find((e) => e.tempId === tempId)
            if (!entry) return

            if (!entry.projectCode || entry.hours <= 0) {
                setSubmitError('Select a project and enter hours before saving.')
                return
            }

            const projectId = selectableProjects.find((p) => p.code === entry.projectCode)?.id
            if (!projectId) {
                setSubmitError(`Invalid project: ${entry.projectCode}. Select an active project.`)
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
                                          ? {
                                                ...e,
                                                serverEntryId: saved.id,
                                                status: saved.status,
                                                isDirty: false,
                                                isEditing: false,
                                            }
                                          : e
                                  ),
                              }
                            : d
                    )
                )
                setRowSaveMessage('Entry saved.')
                await Promise.all([fetchSavedEntries(), fetchDailyForecast()])
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to save entry'
                setSubmitError(message)
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } finally {
                setSavingEntryId(null)
            }
        },
        [selectedEmployee, timeCodeId, weekData, selectableProjects, submitTimeEntry, fetchSavedEntries, fetchDailyForecast]
    )

    const handleEmployeeChange = useCallback((newId: string) => {
        if (newId === selectedEmployeeId) return
        if (hasUnsavedChanges) {
            const confirmed = window.confirm(
                'You have unsaved/not submitted time entries. Switching employees will discard them. Continue?'
            )
            if (!confirmed) return
        }
        setSubmitError(null)
        setSubmitSuccess(false)
        setSelectedEmployeeId(newId)
    }, [selectedEmployeeId, hasUnsavedChanges])

    const handleWeekChange = useCallback((newWeekStart: string) => {
        const snapped = snapToMonday(newWeekStart)
        if (snapped === selectedWeekStart) return
        if (hasUnsavedChanges) {
            const confirmed = window.confirm(
                'You have unsaved time entries. Switching weeks will discard unsaved changes. Continue?'
            )
            if (!confirmed) return
        }
        setSelectedWeekStart(snapped)
    }, [selectedWeekStart, hasUnsavedChanges])

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
                              {
                                  tempId,
                                  projectCode: "",
                                  hours: 0,
                                  comments: "",
                                  isDirty: true,
                                  isEditing: true,
                              },
                          ],
                      }
                    : day
            )
        )
        setEntryDialog({ dayIndex, tempId })
    }, [])

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
            const entry = weekData[entryDialog.dayIndex]?.entries.find(
                (e) => e.tempId === entryDialog.tempId
            )
            if (entry && !entry.serverEntryId && !entry.projectCode && entry.hours <= 0) {
                setWeekData((prev) =>
                    prev.map((day, i) =>
                        i === entryDialog.dayIndex
                            ? {
                                  ...day,
                                  entries: day.entries.filter(
                                      (e) => e.tempId !== entryDialog.tempId
                                  ),
                              }
                            : day
                    )
                )
            }
        }
        setEntryDialog(null)
        setDialogProjectLocked(false)
    }, [entryDialog, weekData])

    const removeEntry = useCallback(async (dayIndex: number, tempId: string) => {
        const entry = weekData[dayIndex]?.entries.find(e => e.tempId === tempId)
        if (entry?.serverEntryId && selectedEmployeeId) {
            try {
                await deleteTimeEntry(entry.serverEntryId, selectedEmployeeId)
            } catch {
                return
            }
        }
        setWeekData(prev => prev.map((day, i) =>
            i === dayIndex
                ? { ...day, entries: day.entries.filter(e => e.tempId !== tempId) }
                : day
        ))
    }, [weekData, selectedEmployeeId, deleteTimeEntry])

    const updateEntry = useCallback((dayIndex: number, tempId: string, field: keyof DayEntry, value: string | number) => {
        setWeekData(prev => prev.map((day, i) =>
            i === dayIndex
                ? { ...day, entries: day.entries.map(e => e.tempId === tempId ? { ...e, [field]: value, isDirty: true, isEditing: true } : e) }
                : day
        ))
    }, [])

    const dialogEntry = useMemo(() => {
        if (!entryDialog) return null
        return (
            weekData[entryDialog.dayIndex]?.entries.find(
                (e) => e.tempId === entryDialog.tempId
            ) ?? null
        )
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

    const getStatusColor = (hours: number) => {
        if (hours === 40) return "bg-green-100 text-green-600 border-green-200"
        if (hours > 40) return "bg-red-100 text-red-600 border-red-200"
        return "bg-amber-100 text-amber-600 border-amber-200"
    }

    const handleSubmit = async () => {
        setSubmitError(null)
        setSubmitSuccess(false)
        setSubmitWarnings([])

        if (!selectedEmployee) {
            setSubmitError("No employee selected.")
            return
        }

        if (weekTimesheetStatus === 'approved') {
            setSubmitError('This timesheet has already been approved by your PM.')
            return
        }

        if (weekTimesheetStatus === 'submitted') {
            setSubmitError('This timesheet is already submitted and awaiting PM approval.')
            return
        }

        const allEntries = weekData.flatMap((day, _) =>
            day.entries
                .filter(e => e.hours > 0 && e.projectCode)
                .map(e => ({ ...e, fullDate: day.fullDate }))
        )

        if (allEntries.length === 0) {
            setSubmitError("No time entries to submit. Add hours to at least one entry.")
            return
        }

        if (isFutureWeek(selectedWeekStart)) {
            setSubmitError('Timesheets for future weeks cannot be submitted. You can plan entries, but submit after the week begins.')
            return
        }

        if (missingWeekdays.length > 0) {
            setSubmitError(
                `Complete all weekdays before submitting. Missing entries for: ${missingWeekdays.join(', ')}.`
            )
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
            const lines = invalidRows.map(
                (r) => `${r.projectCode} on ${r.date}`
            )
            setSubmitError(
                `${invalidRows.length} ${invalidRows.length === 1 ? 'entry' : 'entries'} skipped due to invalid project configuration: ${lines.join('; ')}. Fix project codes before submitting.`
            )
            return
        }

        try {
            for (const entry of entriesToSave) {
                const projectId = getProjectId(entry.projectCode)!
                try {
                    await submitTimeEntry({
                        employeeId: selectedEmployee.id,
                        projectId,
                        timeCodeId,
                        date: entry.fullDate,
                        hours: entry.hours,
                        comments: entry.comments || undefined,
                    })
                } catch (saveErr) {
                    const detail = saveErr instanceof Error ? saveErr.message : 'Unknown error'
                    throw new Error(
                        `Failed to save ${entry.projectCode} on ${entry.fullDate}: ${detail}`
                    )
                }
            }

            const weekStart = weekDates[0].fullDate
            const submitResult = await submitWeeklyTimesheet(selectedEmployee.id, weekStart)

            setSubmitSuccess(true)
            setSubmitWarnings(submitResult.warnings ?? [])
            setRowSaveMessage(null)
            await Promise.all([fetchSavedEntries(), fetchDailyForecast()])
        } catch (err) {
            const detail = err instanceof Error ? err.message : 'Unknown error'
            setSubmitError(
                `Unable to save all entries. Timesheet not submitted. ${detail}`
            )
            window.scrollTo({ top: 0, behavior: 'smooth' })
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
                <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading time entry data...</span>
                </div>
            </PageContainer>
        )
    }

    const selectedWeek = formatWeekRangeLabel(selectedWeekStart)

    return (
        <PageContainer className="space-y-6">
            {isSelfOnly && (
                <Card className="p-4 border-brand-100 bg-brand-50/40">
                    <p className="text-sm text-gray-800">
                        <strong>Welcome, {user?.name}.</strong> Log your hours for the week, then submit for PM approval.
                        Track OKRs from the sidebar when needed.
                    </p>
                </Card>
            )}
            {isProjectManager && !loadingEmployees && employees.length === 0 && (
                <Card className="p-4 border-amber-200 bg-amber-50">
                    <p className="text-sm text-amber-900">
                        No employees are allocated to your managed projects yet. Assign team members under{' '}
                        <strong>Resource Allocation</strong> to enter time on their behalf.
                    </p>
                </Card>
            )}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Weekly Time Entry</h1>
                    {isProjectManager && (
                        <p className="text-sm text-gray-500 mt-1">
                            Employees allocated to your managed projects.
                        </p>
                    )}
                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Employee:</span>
                            {isSelfOnly ? (
                                <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                            ) : loadingEmployees ? (
                                <span className="text-sm text-gray-500">Loading…</span>
                            ) : employees.length === 0 ? (
                                <span className="text-sm text-gray-500">No allocated employees</span>
                            ) : (
                                <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
                                    <SelectTrigger className="h-8 w-[200px]">
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <Badge
                            variant={
                                weekTimesheetStatus === 'approved'
                                    ? 'success'
                                    : weekTimesheetStatus === 'submitted'
                                      ? 'info'
                                      : weekTimesheetStatus === 'rejected'
                                        ? 'warning'
                                        : 'warning'
                            }
                        >
                            {weekTimesheetStatus === 'approved'
                                ? 'Approved'
                                : weekTimesheetStatus === 'submitted'
                                  ? 'Submitted'
                                  : weekTimesheetStatus === 'rejected'
                                    ? 'Rejected'
                                    : weekTimesheetStatus === 'partial'
                                      ? 'Partial'
                                      : 'Draft'}
                        </Badge>
                    </div>
                </div>
                {!isTimesheetLocked ? (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleReset} disabled={loading}>Reset</Button>
                        <Button
                            className="gap-2"
                            onClick={handleSubmit}
                            disabled={loading || !selectedEmployee || !timeCodeId || !canSubmitWeek}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Submit Timesheet
                        </Button>
                    </div>
                ) : weekTimesheetStatus === 'approved' ? (
                    <p className="text-sm text-green-700 font-medium">Approved by PM</p>
                ) : (
                    <p className="text-sm text-blue-700 font-medium">Awaiting PM approval</p>
                )}
            </div>

            {timeCodeError && (
                <Card className="p-4 bg-amber-50 border-amber-200">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-amber-900 text-sm">Time codes unavailable</h4>
                            <p className="text-sm text-amber-800 mt-1">{timeCodeError}</p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => void loadTimeCodes()}
                            >
                                Retry
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {submitError && (
                <Card className="p-4 bg-red-50 border-red-200">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-red-900 text-sm">Submission Failed</h4>
                            <p className="text-sm text-red-700 mt-1">{submitError}</p>
                        </div>
                    </div>
                </Card>
            )}

            {submitSuccess && (
                <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-green-900 text-sm">Timesheet Submitted</h4>
                            <p className="text-sm text-green-700 mt-1">
                                Entries saved and submitted for PM approval.
                            </p>
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
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    {rowSaveMessage}
                </p>
            )}

            {allocationEstimates && allocationEstimates.byProject.length > 0 && (
                <Card className="p-4 border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Your allocations this week</h4>
                    <p className="text-xs text-gray-600 mb-2">
                        Expected ~{allocationEstimates.totalEstimated}h from active project allocations
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {allocationEstimates.byProject.map((p) => (
                            <span key={p.projectId} className="text-xs px-2 py-1 bg-gray-100 rounded-md">
                                {p.projectName}: {p.estimatedHours}h ({p.percentage}%)
                            </span>
                        ))}
                    </div>
                </Card>
            )}

            {/* Week selector */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => handleWeekChange(shiftWeekStart(selectedWeekStart, -1))}
                            aria-label="Previous week"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="min-w-0 text-center sm:text-left">
                            <p className="text-xs text-gray-500 font-medium uppercase">
                                {viewingCurrentWeek
                                    ? 'Current week'
                                    : viewingFutureWeek
                                      ? 'Future week'
                                      : 'Past week'}
                            </p>
                            <p className="font-semibold text-gray-900">{selectedWeek}</p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => handleWeekChange(shiftWeekStart(selectedWeekStart, 1))}
                            aria-label="Next week"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-end">
                        <Input
                            type="date"
                            className="h-9 w-[150px]"
                            value={selectedWeekStart}
                            onChange={(e) => handleWeekChange(e.target.value)}
                        />
                        {!viewingCurrentWeek && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleWeekChange(getCurrentWeekStart())}
                            >
                                This week
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {viewingFutureWeek && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                    <p className="text-sm text-blue-900">
                        <strong>Future week.</strong> You can view allocations and draft entries, but timesheet submit
                        is only available for the current week and past weeks.
                    </p>
                </Card>
            )}

            {missingWeekdays.length > 0 && !isTimesheetLocked && !viewingFutureWeek && (
                <Card className="p-4 bg-amber-50 border-amber-200">
                    <p className="text-sm text-amber-900">
                        <strong>Week incomplete.</strong> Add and save time for:{' '}
                        {missingWeekdays.join(', ')}.
                    </p>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Week total</p>
                                <span className="font-semibold">{selectedWeek}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-gray-500 font-medium uppercase">Total Hours</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold">{totalHours}</span>
                                    <span className="text-gray-500 text-sm">/ 40h</span>
                                </div>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${getStatusColor(totalHours)}`}>
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Card>

                {dailyForecast && dailyForecast.weekTotal > 0 && (
                    <Card className="p-6 bg-blue-50/50 border-blue-100">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Target className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium uppercase">Forecasted Hours (from Allocations)</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-blue-700">{dailyForecast.weekTotal}h</span>
                                    <span className="text-sm text-blue-600">
                                        (Logged: {totalHours}h — {totalHours >= dailyForecast.weekTotal
                                            ? <span className="text-green-600 font-medium">On Track</span>
                                            : <span className="text-amber-600 font-medium">{Math.round((dailyForecast.weekTotal - totalHours) * 10) / 10}h remaining</span>
                                        })
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            <Card className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                    Drag a project from the sidebar onto a day, then enter hours and save. You can also click a day or entry to add or edit time. Week totals update automatically when entries are saved.
                </p>
                <div className="flex flex-col lg:flex-row gap-4">
                    <TimeEntryProjectPalette
                        projects={selectableProjects}
                        disabled={isTimesheetLocked || !selectedEmployeeId}
                    />
                    <TimeEntryWeekCalendar
                        weekData={weekData}
                        dailyForecastDays={dailyForecast?.days}
                        projects={selectableProjects}
                        isTimesheetLocked={isTimesheetLocked}
                        onAddEntry={addEntry}
                        onEditEntry={openEditEntry}
                        onDropProject={handleDropProject}
                    />
                </div>
            </Card>

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
                    onDelete={
                        dialogEntry.serverEntryId
                            ? () => void deleteDialogEntry()
                            : undefined
                    }
                />
            )}

            {(hasUnsavedChanges || totalHours > 0 || isTimesheetLocked) && (
                <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                    <div className="max-w-[100%] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                            {submitError && (
                                <p className="text-sm text-red-700 font-medium">{submitError}</p>
                            )}
                            <p className="text-sm text-gray-600">
                                {weekTimesheetStatus === 'approved'
                                    ? `${totalHours}h approved this week — no further action needed.`
                                    : weekTimesheetStatus === 'submitted'
                                      ? `${totalHours}h submitted this week — awaiting PM approval.`
                                      : viewingFutureWeek
                                        ? `${totalHours}h drafted for a future week — submit is disabled until this week starts.`
                                        : dirtyEntryCount > 0
                                          ? `${dirtyEntryCount} unsaved ${dirtyEntryCount === 1 ? 'entry' : 'entries'} — save each row, then submit the full timesheet for approval.`
                                          : missingWeekdays.length > 0
                                            ? `Add time for ${missingWeekdays.join(', ')} before submitting.`
                                            : `${totalHours}h logged — all weekdays complete, ready to submit for PM approval.`}
                            </p>
                        </div>
                        {!isTimesheetLocked && (
                        <div className="flex gap-2 shrink-0">
                            <Button variant="outline" onClick={handleReset} disabled={loading}>
                                Reset
                            </Button>
                            <Button
                                className="gap-2"
                                onClick={handleSubmit}
                                disabled={loading || !selectedEmployee || !timeCodeId || !canSubmitWeek}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Submit Timesheet
                            </Button>
                        </div>
                        )}
                    </div>
                </div>
            )}
        </PageContainer>
    )
}
