"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Calendar, Save, Clock, Loader2, AlertCircle, Plus, Trash2, Target, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTimeEntries } from "@/lib/use-time-entries"
import { useEmployees } from "@/lib/use-employees"
import { useProjects } from "@/lib/use-projects"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"

interface TimeCodeResponse {
    id: string
    code: string
    description: string
    isBillable: boolean
}

interface DayEntry {
    tempId: string
    serverEntryId?: string
    projectCode: string
    hours: number
    comments: string
    status?: string
    isDirty?: boolean
    isEditing?: boolean
}

interface DayData {
    day: string
    date: string
    fullDate: string
    entries: DayEntry[]
}



interface DailyForecastDay {
    date: string
    dayName: string
    isWeekday: boolean
    totalForecast: number
    byProject: { projectId: string; projectName: string; percentage: number; forecastHours: number }[]
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

    const allocatedProjects = useMemo(() => {
        const allocatedIds = new Set<string>()
        allocationEstimates?.byProject.forEach((p) => allocatedIds.add(p.projectId))
        dailyForecast?.days.forEach((d) =>
            d.byProject.forEach((p) => allocatedIds.add(p.projectId))
        )

        const fromAllocations = projects.filter((p) => allocatedIds.has(p.id))

        const usedCodes = new Set(
            weekData.flatMap((d) => d.entries.map((e) => e.projectCode)).filter(Boolean)
        )
        const fromExistingEntries = projects.filter(
            (p) => usedCodes.has(p.code) && !allocatedIds.has(p.id)
        )

        return [...fromAllocations, ...fromExistingEntries].map((p) => ({
            code: p.code,
            name: p.name,
            id: p.id,
        }))
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
            return allocatedProjects.find((p) => p.code === code)?.id || null
        },
        [allocatedProjects]
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

            const projectId = allocatedProjects.find((p) => p.code === entry.projectCode)?.id
            if (!projectId) {
                setSubmitError(`Invalid project: ${entry.projectCode}. Only allocated projects can be saved.`)
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
                await fetchDailyForecast()
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to save entry'
                setSubmitError(message)
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } finally {
                setSavingEntryId(null)
            }
        },
        [selectedEmployee, timeCodeId, weekData, allocatedProjects, submitTimeEntry, fetchDailyForecast]
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
        setWeekData(prev => prev.map((day, i) =>
            i === dayIndex
                ? { ...day, entries: [...day.entries, { tempId: generateTempId(), projectCode: "", hours: 0, comments: "", isDirty: true, isEditing: true }] }
                : day
        ))
    }, [])

    const startEditingEntry = useCallback((dayIndex: number, tempId: string) => {
        setWeekData(prev => prev.map((day, i) =>
            i === dayIndex
                ? { ...day, entries: day.entries.map(e => e.tempId === tempId ? { ...e, isEditing: true } : e) }
                : day
        ))
    }, [])

    const cancelEditingEntry = useCallback((dayIndex: number, tempId: string) => {
        setWeekData(prev => prev.map((day, i) => {
            if (i !== dayIndex) return day
            return {
                ...day,
                entries: day.entries.map(e => {
                    if (e.tempId !== tempId) return e
                    if (!e.serverEntryId) return e
                    return { ...e, isEditing: false, isDirty: false }
                }),
            }
        }))
        void fetchSavedEntries()
    }, [fetchSavedEntries])

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

            <div className="space-y-4">
                    {weekData.map((day, dayIndex) => {
                        const dayTotal = day.entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0)
                        const isWeekend = day.day === "Saturday" || day.day === "Sunday"

                        return (
                            <Card key={day.fullDate} className={`overflow-hidden ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                                    <div>
                                        <span className="font-medium">{day.day}</span>
                                        <span className="text-sm text-gray-500 ml-2">{day.date}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {(() => {
                                            const forecast = dailyForecast?.days?.find(d => d.date === day.fullDate)
                                            const forecastHours = forecast?.totalForecast ?? 0
                                            return (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-600">Actual: <strong>{dayTotal}h</strong></span>
                                                    {forecastHours > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dayTotal >= forecastHours
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                Forecast: {forecastHours}h
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                ({forecast!.byProject.map(p => `${p.projectName}: ${p.forecastHours}h`).join(', ')})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                        {!isTimesheetLocked && (
                                            <Button size="sm" variant="outline" className="gap-1" onClick={() => addEntry(dayIndex)}>
                                                <Plus className="w-4 h-4" /> Add Entry
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {day.entries.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-sm">
                                        No entries for this day. Click "Add Entry" to log time.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {day.entries.map(entry => {
                                            const canSave =
                                                !!timeCodeId &&
                                                !!entry.projectCode &&
                                                entry.hours > 0 &&
                                                !!getProjectId(entry.projectCode)
                                            const isSaving = savingEntryId === entry.tempId
                                            const isSubmittedEntry =
                                                entry.status === 'Submitted' || entry.status === 'PM_Approved'
                                            const isLocked =
                                                isSubmittedEntry ||
                                                (!!entry.serverEntryId && !entry.isDirty && !entry.isEditing)

                                            return (
                                            <div key={entry.tempId} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                                                <Select
                                                    value={entry.projectCode}
                                                    disabled={isLocked}
                                                    onValueChange={(val) => updateEntry(dayIndex, entry.tempId, 'projectCode', val)}
                                                >
                                                    <SelectTrigger className="h-9 w-full lg:w-[200px] shrink-0">
                                                        <SelectValue placeholder="Select code" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectLabel>Projects</SelectLabel>
                                                            {allocatedProjects.length === 0 ? (
                                                                <SelectItem value="__none__" disabled>
                                                                    No allocated projects this week
                                                                </SelectItem>
                                                            ) : (
                                                                allocatedProjects.map((p) => (
                                                                    <SelectItem key={p.code} value={p.code}>
                                                                        {p.name}
                                                                    </SelectItem>
                                                                ))
                                                            )}
                                                        </SelectGroup>
                                                        <SelectGroup>
                                                            <SelectLabel>Leaves</SelectLabel>
                                                            {leaveTypes.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                                                        </SelectGroup>
                                                        <SelectGroup>
                                                            <SelectLabel>Other</SelectLabel>
                                                            {otherCodes.map(o => <SelectItem key={o.code} value={o.code}>{o.name}</SelectItem>)}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>

                                                <Input
                                                    type="number"
                                                    className="h-9 w-full lg:w-24 shrink-0"
                                                    min="0"
                                                    max="24"
                                                    step="0.5"
                                                    placeholder="Hours"
                                                    disabled={isLocked}
                                                    value={entry.hours || ''}
                                                    onChange={(e) => updateEntry(dayIndex, entry.tempId, 'hours', parseFloat(e.target.value) || 0)}
                                                />

                                                <Input
                                                    className="h-9 flex-1 min-w-0"
                                                    placeholder="Comments (optional)"
                                                    disabled={isLocked}
                                                    value={entry.comments}
                                                    onChange={(e) => updateEntry(dayIndex, entry.tempId, 'comments', e.target.value)}
                                                />

                                                <div className="flex items-center gap-2 shrink-0 lg:ml-auto">
                                                    {isLocked && (
                                                        <Badge
                                                            variant={
                                                                entry.status === 'Submitted'
                                                                    ? 'info'
                                                                    : entry.status === 'PM_Approved'
                                                                      ? 'success'
                                                                      : 'success'
                                                            }
                                                            className="text-xs"
                                                        >
                                                            {entry.status === 'Submitted'
                                                                ? 'Submitted'
                                                                : entry.status === 'PM_Approved'
                                                                  ? 'Approved'
                                                                  : 'Saved'}
                                                        </Badge>
                                                    )}
                                                    {isLocked && !isSubmittedEntry ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="gap-1.5"
                                                            disabled={isSaving || loading}
                                                            onClick={() => startEditingEntry(dayIndex, entry.tempId)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                            Edit
                                                        </Button>
                                                    ) : isSubmittedEntry ? null : (
                                                        <>
                                                            {entry.serverEntryId && entry.isEditing && !entry.isDirty && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-gray-600"
                                                                    disabled={isSaving || loading}
                                                                    onClick={() => cancelEditingEntry(dayIndex, entry.tempId)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant={entry.isDirty ? 'default' : 'outline'}
                                                                className="gap-1.5"
                                                                disabled={!canSave || isSaving || loading}
                                                                onClick={() => void saveEntry(dayIndex, entry.tempId)}
                                                            >
                                                                {isSaving ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Save className="w-4 h-4" />
                                                                )}
                                                                Save
                                                            </Button>
                                                        </>
                                                    )}
                                                    {!isSubmittedEntry && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                                                            disabled={isSaving}
                                                            onClick={() => removeEntry(dayIndex, entry.tempId)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </Card>
                        )
                    })}
            </div>

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
