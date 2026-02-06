import { useState, useMemo } from "react"
import { Calendar, Save, Clock, Info, Loader2, AlertCircle } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTimeEntries } from "@/lib/use-time-entries"

// Mock Data - In production, these would come from allocated projects API
const allocatedProjects = [
    { code: "PRJ-001", name: "E-Commerce Platform Redesign", role: "Frontend", id: "000000000000000000000001" },
    { code: "PRJ-002", name: "Mobile App Development", role: "Frontend", id: "000000000000000000000002" },
]

const leaveTypes = [
    { code: "LV-PL", name: "Planned Leave" },
    { code: "LV-SL", name: "Sick Leave" },
]

const otherCodes = [
    { code: "TRAINING", name: "Training" },
    { code: "MEETING", name: "Internal Meetings" },
]

// Get current week dates
function getWeekDates(): { day: string; date: string; fullDate: string }[] {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Adjust to Monday
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

// Initial state from week dates
const weekDates = getWeekDates()
const initialEntries = weekDates.map((d, i) => ({
    id: i + 1,
    day: d.day,
    date: d.date,
    fullDate: d.fullDate,
    hours: 0,
    projectCode: "",
    comments: ""
}))

// Placeholder IDs
const MOCK_EMPLOYEE_ID = "000000000000000000000001"
const MOCK_TIMECODE_ID = "000000000000000000000001"

export function TimeEntry() {
    const [entries, setEntries] = useState(initialEntries)
    const [selectedWeek] = useState(() => {
        const dates = getWeekDates()
        return `${dates[0].date} - ${dates[6].date}, ${new Date().getFullYear()}`
    })
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const { submitTimeEntry, loading } = useTimeEntries()

    const totalHours = useMemo(() => entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0), [entries])

    const handleHourChange = (id: number, val: string) => {
        const numVal = parseFloat(val)
        if (numVal < 0 || numVal > 24) return;

        setEntries(prev => prev.map(e => e.id === id ? { ...e, hours: numVal } : e))
    }

    const handleProjectChange = (id: number, val: string) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, projectCode: val } : e))
    }

    const handleCommentChange = (id: number, val: string) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, comments: val } : e))
    }

    const getRoleForProject = (code: string) => {
        return allocatedProjects.find(p => p.code === code)?.role || "-"
    }

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

        // Filter entries that have hours > 0 and a valid project code
        const validEntries = entries.filter(e => e.hours > 0 && e.projectCode)

        if (validEntries.length === 0) {
            setSubmitError("No time entries to submit. Add hours to at least one day.")
            return
        }

        try {
            // Submit each entry individually
            for (const entry of validEntries) {
                const projectId = getProjectId(entry.projectCode)

                if (!projectId) {
                    // Skip non-project entries (leave, training, etc.)
                    continue
                }

                await submitTimeEntry({
                    employeeId: MOCK_EMPLOYEE_ID,
                    projectId,
                    timeCodeId: MOCK_TIMECODE_ID,
                    date: entry.fullDate,
                    hours: entry.hours,
                    comments: entry.comments || undefined,
                })
            }

            setSubmitSuccess(true)
        } catch (err) {
            // Display backend validation error verbatim
            if (err instanceof Error) {
                setSubmitError(err.message)
            } else {
                setSubmitError("Failed to submit time entries")
            }
        }
    }

    const handleReset = () => {
        setEntries(initialEntries)
        setSubmitError(null)
        setSubmitSuccess(false)
    }

    return (
        <PageContainer className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Weekly Time Entry</h1>
                    <p className="text-sm text-gray-600 mt-1">Status: <Badge variant="warning">Draft</Badge></p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset} disabled={loading}>Reset</Button>
                    <Button className="gap-2" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Submit Timesheet
                    </Button>
                </div>
            </div>

            {/* Error Message */}
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

            {/* Success Message */}
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

            {/* Summary Card */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Week</p>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-lg">{selectedWeek}</span>
                                <Button variant="ghost" size="sm" className="h-6 text-xs">Change</Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Hours</p>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-3xl font-bold">{totalHours}</span>
                                <span className="text-gray-500 text-sm">/ 40h</span>
                            </div>
                        </div>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${getStatusColor(totalHours)}`}>
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Guidelines */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="p-4 bg-blue-50/50 border-blue-100">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-blue-900 text-sm">Allocated Projects</h4>
                                <ul className="mt-2 space-y-1 text-sm text-blue-800">
                                    {allocatedProjects.map(p => (
                                        <li key={p.code}>• <strong>{p.code}</strong>: {p.name}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-gray-50/50 border-gray-200">
                        <h4 className="font-medium text-gray-900 text-sm mb-2">Time Codes</h4>
                        <ul className="space-y-1 text-xs text-gray-600">
                            <li>• <strong>PRJ-XXX</strong>: Project Work</li>
                            <li>• <strong>LV-XX</strong>: Leave Types</li>
                            <li>• <strong>TRAINING</strong>: Skill Development</li>
                        </ul>
                    </Card>
                </div>

                {/* Grid */}
                <div className="lg:col-span-3">
                    <Card className="overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead className="w-[200px]">Project / Code</TableHead>
                                    <TableHead className="w-[120px]">Role</TableHead>
                                    <TableHead className="w-[100px]">Hours</TableHead>
                                    <TableHead>Comments</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => (
                                    <TableRow key={entry.id} className={entry.day === "Saturday" || entry.day === "Sunday" ? "bg-gray-50/50" : ""}>
                                        <TableCell>
                                            <div className="font-medium">{entry.day}</div>
                                            <div className="text-xs text-gray-500">{entry.date}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Select value={entry.projectCode} onValueChange={(val) => handleProjectChange(entry.id, val)}>
                                                <SelectTrigger className="h-8">
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
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-gray-600">{getRoleForProject(entry.projectCode)}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="h-8"
                                                min="0"
                                                max="24"
                                                step="0.5"
                                                value={entry.hours}
                                                onChange={(e) => handleHourChange(entry.id, e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8"
                                                placeholder="Optional"
                                                value={entry.comments}
                                                onChange={(e) => handleCommentChange(entry.id, e.target.value)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-semibold">Total Weekly Hours</TableCell>
                                    <TableCell className="font-bold text-lg">{totalHours}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </Card>
                </div>
            </div>
        </PageContainer>
    )
}
