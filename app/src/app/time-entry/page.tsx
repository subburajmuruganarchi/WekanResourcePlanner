"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Calendar, Save, Clock, Info, Loader2, AlertCircle, Plus, Trash2, Target } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTimeEntries } from "@/lib/use-time-entries"
import { useEmployees } from "@/lib/use-employees"
import { useProjects } from "@/lib/use-projects"
import { api } from "@/lib/api-client"

interface TimeCodeResponse {
    id: string
    code: string
    description: string
    isBillable: boolean
}

interface DayEntry {
    tempId: string
    projectCode: string
    hours: number
    comments: string
}

interface DayData {
    day: string
    date: string
    fullDate: string
    entries: DayEntry[]
}

interface EstimateData {
    totalEstimated: number
    byProject: { projectId: string; projectName: string; estimatedHours: number; percentage: number }[]
}

const leaveTypes = [
    { code: "LV-PL", name: "Planned Leave" },
    { code: "LV-SL", name: "Sick Leave" },
]

const otherCodes = [
    { code: "TRAINING", name: "Training" },
    { code: "MEETING", name: "Internal Meetings" },
]

function getWeekDates(): { day: string; date: string; fullDate: string }[] {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff)

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return days.map((day, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return {
            day,
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: d.toISOString().split('T')[0]
        }
    })
}

function generateTempId() {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function TimeEntry() {
    const weekDates = useMemo(() => getWeekDates(), [])
    const [weekData, setWeekData] = useState<DayData[]>(() =>
        weekDates.map(d => ({
            ...d,
            entries: []
        }))
    )
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
    const [estimates, setEstimates] = useState<EstimateData | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [timeCodeId, setTimeCodeId] = useState<string | null>(null)

    const { submitTimeEntry, loading } = useTimeEntries()
    const { employees, loading: loadingEmployees } = useEmployees()
    const { projects, loading: loadingProjects } = useProjects()

    // Initialize selected employee
    useEffect(() => {
        if (employees.length > 0 && !selectedEmployeeId) {
            setSelectedEmployeeId(employees[0].id)
        }
    }, [employees, selectedEmployeeId])

    // Fetch time code
    useEffect(() => {
        const fetchTimeCode = async () => {
            try {
                const codes = await api.get<TimeCodeResponse[]>('/time-entries/codes')
                if (codes.length > 0) {
                    setTimeCodeId(codes[0].id)
                }
            } catch {
                setTimeCodeId(null)
            }
        }
        fetchTimeCode()
    }, [])

    // Fetch estimates when employee changes
    useEffect(() => {
        if (!selectedEmployeeId) return
        const fetchEstimates = async () => {
            try {
                const weekStart = weekDates[0].fullDate
                const data = await api.get<EstimateData>(`/time-entries/estimates?employeeId=${selectedEmployeeId}&week=${weekStart}`)
                setEstimates(data)
            } catch {
                setEstimates(null)
            }
        }
        fetchEstimates()
    }, [selectedEmployeeId, weekDates])

    const selectedEmployee = useMemo(() =>
        employees.find(e => e.id === selectedEmployeeId),
        [employees, selectedEmployeeId]
    )

    const allocatedProjects = useMemo(() => {
        return projects.map(p => ({
            code: p.code,
            name: p.name,
            id: p.id
        }))
    }, [projects])

    const totalHours = useMemo(() =>
        weekData.reduce((sum, day) =>
            sum + day.entries.reduce((daySum, e) => daySum + (Number(e.hours) || 0), 0), 0
        ), [weekData]
    )

    const addEntry = useCallback((dayIndex: number) => {
        setWeekData(prev => prev.map((day, i) =>
            i === dayIndex
                ? { ...day, entries: [...day.entries, { tempId: generateTempId(), projectCode: "", hours: 0, comments: "" }] }
                : day
        ))
    }, [])

    const removeEntry = useCallback((dayIndex: number, tempId: string) => {
        setWeekData(prev => prev.map((day, i) =>
            i === dayIndex
                ? { ...day, entries: day.entries.filter(e => e.tempId !== tempId) }
                : day
        ))
    }, [])

    const updateEntry = useCallback((dayIndex: number, tempId: string, field: keyof DayEntry, value: string | number) => {
        setWeekData(prev => prev.map((day, i) =>
            i === dayIndex
                ? { ...day, entries: day.entries.map(e => e.tempId === tempId ? { ...e, [field]: value } : e) }
                : day
        ))
    }, [])

    const getProjectId = (code: string): string | null => {
        return allocatedProjects.find(p => p.code === code)?.id || null
    }

    const getStatusColor = (hours: number) => {
        if (hours === 40) return "bg-green-100 text-green-600 border-green-200"
        if (hours > 40) return "bg-red-100 text-red-600 border-red-200"
        return "bg-amber-100 text-amber-600 border-amber-200"
    }

    const handleSubmit = async () => {
        setSubmitError(null)
        setSubmitSuccess(false)

        if (!selectedEmployee) {
            setSubmitError("No employee selected.")
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

        try {
            for (const entry of allEntries) {
                const projectId = getProjectId(entry.projectCode)
                if (!projectId) continue
                if (!timeCodeId) {
                    setSubmitError("Time code not configured.")
                    return
                }

                await submitTimeEntry({
                    employeeId: selectedEmployee.id,
                    projectId,
                    timeCodeId,
                    date: entry.fullDate,
                    hours: entry.hours,
                    comments: entry.comments || undefined,
                })
            }
            setSubmitSuccess(true)
        } catch (err) {
            if (err instanceof Error) {
                setSubmitError(err.message)
            } else {
                setSubmitError("Failed to submit time entries")
            }
        }
    }

    const handleReset = () => {
        setWeekData(weekDates.map(d => ({ ...d, entries: [] })))
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

    const selectedWeek = `${weekDates[0].date} - ${weekDates[6].date}, ${new Date().getFullYear()}`

    return (
        <PageContainer className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Weekly Time Entry</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Employee:</span>
                            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                <SelectTrigger className="h-8 w-[200px]">
                                    <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Badge variant="warning">Draft</Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset} disabled={loading}>Reset</Button>
                    <Button className="gap-2" onClick={handleSubmit} disabled={loading || !selectedEmployee}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Submit Timesheet
                    </Button>
                </div>
            </div>

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
                            <p className="text-sm text-green-700 mt-1">Your time entries have been saved successfully.</p>
                        </div>
                    </div>
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
                                <p className="text-xs text-gray-500 font-medium uppercase">Current Week</p>
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

                {estimates && (
                    <Card className="p-6 bg-blue-50/50 border-blue-100">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Target className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium uppercase">Estimated Hours (from Allocations)</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-blue-700">{estimates.totalEstimated}h</span>
                                    {estimates.byProject.length > 0 && (
                                        <span className="text-sm text-blue-600">
                                            ({estimates.byProject.map(p => `${p.projectName}: ${p.estimatedHours}h`).join(', ')})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Guidelines */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="p-4 bg-blue-50/50 border-blue-100">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-blue-900 text-sm">Available Projects</h4>
                                <ul className="mt-2 space-y-1 text-sm text-blue-800">
                                    {allocatedProjects.length === 0 ? (
                                        <li className="text-gray-500">No projects available</li>
                                    ) : (
                                        allocatedProjects.map(p => (
                                            <li key={p.code}>• <strong>{p.code}</strong>: {p.name}</li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-gray-50/50 border-gray-200">
                        <h4 className="font-medium text-gray-900 text-sm mb-2">Time Codes</h4>
                        <ul className="space-y-1 text-xs text-gray-600">
                            <li>• <strong>PRJ-XXX</strong>: Project Work</li>
                            <li>• <strong>LV-XX</strong>: Leave Types</li>
                            <li>• <strong>TRAINING</strong>: Training</li>
                        </ul>
                    </Card>
                </div>

                {/* Daily Entries */}
                <div className="lg:col-span-3 space-y-4">
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
                                        <span className="text-sm text-gray-600">Day Total: <strong>{dayTotal}h</strong></span>
                                        <Button size="sm" variant="outline" className="gap-1" onClick={() => addEntry(dayIndex)}>
                                            <Plus className="w-4 h-4" /> Add Entry
                                        </Button>
                                    </div>
                                </div>

                                {day.entries.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-sm">
                                        No entries for this day. Click "Add Entry" to log time.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {day.entries.map(entry => (
                                            <div key={entry.tempId} className="p-4 flex items-center gap-4">
                                                <Select value={entry.projectCode} onValueChange={(val) => updateEntry(dayIndex, entry.tempId, 'projectCode', val)}>
                                                    <SelectTrigger className="h-9 w-[180px]">
                                                        <SelectValue placeholder="Select code" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectLabel>Projects</SelectLabel>
                                                            {allocatedProjects.map(p => <SelectItem key={p.code} value={p.code}>{p.code}</SelectItem>)}
                                                        </SelectGroup>
                                                        <SelectGroup>
                                                            <SelectLabel>Leaves</SelectLabel>
                                                            {leaveTypes.map(l => <SelectItem key={l.code} value={l.code}>{l.code}</SelectItem>)}
                                                        </SelectGroup>
                                                        <SelectGroup>
                                                            <SelectLabel>Other</SelectLabel>
                                                            {otherCodes.map(o => <SelectItem key={o.code} value={o.code}>{o.code}</SelectItem>)}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>

                                                <Input
                                                    type="number"
                                                    className="h-9 w-20"
                                                    min="0"
                                                    max="24"
                                                    step="0.5"
                                                    placeholder="Hours"
                                                    value={entry.hours || ''}
                                                    onChange={(e) => updateEntry(dayIndex, entry.tempId, 'hours', parseFloat(e.target.value) || 0)}
                                                />

                                                <Input
                                                    className="h-9 flex-1"
                                                    placeholder="Comments (optional)"
                                                    value={entry.comments}
                                                    onChange={(e) => updateEntry(dayIndex, entry.tempId, 'comments', e.target.value)}
                                                />

                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => removeEntry(dayIndex, entry.tempId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                </div>
            </div>
        </PageContainer>
    )
}
