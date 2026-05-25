"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { CheckCircle2, XCircle, Loader2, AlertCircle, MessageSquare, Filter, CheckSquare, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"

/* ---------- Types ---------- */
interface ProjectEntry {
    id: string
    employeeId: string
    employeeName: string
    employeeEmail: string
    projectId: string
    projectName: string
    projectCode: string
    timeCode: string
    timeCodeDescription: string
    isBillable: boolean
    date: string
    hours: number
    comments: string
    weekStartDate: string
    status: string
    rejectionComment?: string
    overriddenAt?: string
    overriddenBy?: string
    overrideReason?: string
}

interface GroupedByEmployee {
    employeeId: string
    employeeName: string
    weeks: GroupedByWeek[]
    totalHours: number
}

interface GroupedByWeek {
    weekStartDate: string
    entries: ProjectEntry[]
    totalHours: number
    weekStatus: string
}

/* ---------- Helpers ---------- */
function groupByEmployee(entries: ProjectEntry[]): GroupedByEmployee[] {
    const empMap = new Map<string, GroupedByEmployee>()

    for (const entry of entries) {
        if (!empMap.has(entry.employeeId)) {
            empMap.set(entry.employeeId, {
                employeeId: entry.employeeId,
                employeeName: entry.employeeName,
                weeks: [],
                totalHours: 0,
            })
        }
        const emp = empMap.get(entry.employeeId)!
        emp.totalHours += entry.hours

        let week = emp.weeks.find(w => w.weekStartDate === entry.weekStartDate)
        if (!week) {
            week = { weekStartDate: entry.weekStartDate, entries: [], totalHours: 0, weekStatus: 'DRAFT' }
            emp.weeks.push(week)
        }
        week.entries.push(entry)
        week.totalHours += entry.hours
    }

    for (const emp of empMap.values()) {
        for (const week of emp.weeks) {
            const statuses = week.entries.map(e => e.status)
            if (statuses.includes('PM_Rejected')) week.weekStatus = 'PARTIAL_REJECTED'
            else if (statuses.every(s => s === 'PM_Approved')) week.weekStatus = 'APPROVED'
            else if (statuses.some(s => s === 'Submitted')) week.weekStatus = 'PENDING_APPROVAL'
            else week.weekStatus = 'DRAFT'
        }
        emp.weeks.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
    }

    return Array.from(empMap.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}

function formatWeek(weekStart: string): string {
    const start = new Date(weekStart + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function statusBadge(status: string) {
    switch (status) {
        case 'Draft': return <Badge variant="outline" className="text-[10px]">Draft</Badge>
        case 'Submitted': return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Submitted</Badge>
        case 'PM_Approved': return <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">Approved</Badge>
        case 'PM_Rejected': return <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">Rejected</Badge>
        default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>
    }
}

function weekStatusBadge(status: string) {
    switch (status) {
        case 'APPROVED': return <Badge className="bg-green-100 text-green-700 text-[10px]">Approved</Badge>
        case 'PARTIAL_REJECTED': return <Badge className="bg-red-100 text-red-700 text-[10px]">Partial Rejection</Badge>
        case 'PENDING_APPROVAL': return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Pending Approval</Badge>
        default: return <Badge variant="outline" className="text-[10px]">Draft</Badge>
    }
}

/* ---------- Component ---------- */
export function TimesheetApprovalsTab({ projectId }: { projectId: string }) {
    const { user } = useAuth()
    const [entries, setEntries] = useState<ProjectEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Filters
    const [filterWeek, setFilterWeek] = useState<string>("all")
    const [filterEmployee, setFilterEmployee] = useState<string>("all")
    const [filterStatus, setFilterStatus] = useState<string>("Submitted")

    // Reject dialog/Admin Override
    const [rejectingEntryId, setRejectingEntryId] = useState<string | null>(null)
    const [rejectionComment, setRejectionComment] = useState("")
    const [overrideReason, setOverrideReason] = useState("")
    const [isAdminMode, setIsAdminMode] = useState(false)
    const isAdminUser = user?.role === 'Admin'
    
    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const fetchEntries = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (filterWeek !== 'all') params.append('week', filterWeek)
            if (filterEmployee !== 'all') params.append('employeeId', filterEmployee)
            if (filterStatus !== 'all') params.append('status', filterStatus)

            const qs = params.toString() ? `?${params.toString()}` : ''
            const data = await api.get<ProjectEntry[]>(`/time-entries/by-project/${projectId}${qs}`)
            setEntries(data)
            setSelectedIds(new Set())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load entries')
        } finally {
            setLoading(false)
        }
    }, [projectId, filterWeek, filterEmployee, filterStatus])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    // Derive unique weeks & employees for filter dropdowns
    const allWeeks = useMemo(() => [...new Set(entries.map(e => e.weekStartDate))].sort().reverse(), [entries])
    const allEmployees = useMemo(() => {
        const map = new Map<string, string>()
        entries.forEach(e => map.set(e.employeeId, e.employeeName))
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [entries])

    const grouped = useMemo(() => groupByEmployee(entries), [entries])

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg)
        setTimeout(() => setSuccessMsg(null), 3000)
    }

    // Bulk selection helpers
    const submittedEntries = entries.filter(e => e.status === 'Submitted')
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }
    const selectAll = () => {
        setSelectedIds(new Set(submittedEntries.map(e => e.id)))
    }
    const deselectAll = () => setSelectedIds(new Set())

    /* ---- Actions ---- */
    const handleApprove = async (entryIds: string[], label: string) => {
        if (!user?.id) return
        setActionLoading(label)
        try {
            await api.post('/time-entries/approve', { 
                entryIds, 
                overrideReason: isAdminMode && overrideReason ? overrideReason : undefined
            })
            showSuccess(`Approved ${entryIds.length} entry(ies)`)
            setOverrideReason("")
            fetchEntries()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Approval failed')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (entryId: string) => {
        if (!user?.id) return
        setActionLoading(`reject-${entryId}`)
        try {
            await api.post('/time-entries/reject', {
                entryIds: [entryId],
                rejectionComment: rejectionComment || undefined,
                overrideReason: isAdminMode && overrideReason ? overrideReason : undefined
            })
            showSuccess('Entry rejected')
            setRejectingEntryId(null)
            setRejectionComment("")
            setOverrideReason("")
            fetchEntries()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Rejection failed')
        } finally {
            setActionLoading(null)
        }
    }

    const handleBulkApprove = () => {
        if (selectedIds.size === 0) return
        handleApprove(Array.from(selectedIds), 'bulk')
    }

    /* ---- Render ---- */
    return (
        <div className="p-6 space-y-4">
            {/* Filters Row */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Submitted">Submitted</SelectItem>
                            <SelectItem value="PM_Approved">Approved</SelectItem>
                            <SelectItem value="PM_Rejected">Rejected</SelectItem>
                            <SelectItem value="Draft">Draft</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                    <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {allEmployees.map(([id, name]) => (
                            <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filterWeek} onValueChange={setFilterWeek}>
                    <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Weeks</SelectItem>
                        {allWeeks.map(w => (
                            <SelectItem key={w} value={w}>{formatWeek(w)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {isAdminUser && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-md">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isAdminMode} 
                                onChange={(e) => setIsAdminMode(e.target.checked)}
                                className="w-3 h-3 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                            />
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Admin Override Mode</span>
                        </label>
                        {isAdminMode && (
                            <input 
                                type="text"
                                className="w-32 text-[10px] border border-amber-200 rounded p-1 bg-white ml-1"
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                placeholder="Override reason..."
                            />
                        )}
                    </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                            disabled={!!actionLoading || (isAdminMode && !overrideReason)}
                            onClick={handleBulkApprove}
                        >
                            {actionLoading === 'bulk' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                            Approve Selected ({selectedIds.size})
                        </Button>
                    )}
                    {submittedEntries.length > 0 && (
                        <>
                            <Button size="sm" variant="outline" className="text-xs h-8" onClick={selectAll}>Select All Submitted</Button>
                            {selectedIds.size > 0 && <Button size="sm" variant="ghost" className="text-xs h-8" onClick={deselectAll}>Clear</Button>}
                        </>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                    <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setError(null)}>✕</button>
                </div>
            )}
            {successMsg && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {successMsg}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                    <span className="ml-2 text-sm text-gray-500">Loading entries…</span>
                </div>
            )}

            {/* Empty */}
            {!loading && entries.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p className="font-medium">No time entries found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or check back later.</p>
                </div>
            )}

            {/* Grouped View */}
            {!loading && grouped.map(emp => (
                <div key={emp.employeeId} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Employee Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700">
                                {emp.employeeName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{emp.employeeName}</span>
                        </div>
                        <Badge className="bg-brand-50 text-brand-700 text-xs">{emp.totalHours.toFixed(1)}h</Badge>
                    </div>

                    {/* Week sub-groups */}
                    {emp.weeks.map(week => (
                        <div key={week.weekStartDate} className="border-b last:border-b-0">
                            <div className="flex items-center justify-between px-4 py-2 bg-blue-50/50">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-blue-800">
                                        Week of {formatWeek(week.weekStartDate)}
                                    </span>
                                    {weekStatusBadge(week.weekStatus)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">{week.totalHours.toFixed(1)}h</Badge>
                                    {(isAdminMode || week.entries.some(e => e.status === 'Submitted')) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-[11px] h-6 border-green-300 text-green-700 hover:bg-green-50"
                                            disabled={!!actionLoading || (isAdminMode && !overrideReason)}
                                            onClick={() => {
                                                const ids = isAdminMode 
                                                    ? week.entries.map(e => e.id)
                                                    : week.entries.filter(e => e.status === 'Submitted').map(e => e.id)
                                                handleApprove(ids, `week-${emp.employeeId}-${week.weekStartDate}`)
                                            }}
                                        >
                                            {actionLoading === `week-${emp.employeeId}-${week.weekStartDate}` ?
                                                <Loader2 className="w-3 h-3 animate-spin" /> : (isAdminMode ? 'Approve Week (Override)' : 'Approve Week')}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Entries Table */}
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b bg-white">
                                        <th className="px-4 py-1.5 w-8"></th>
                                        <th className="px-2 py-1.5 font-medium">Date</th>
                                        <th className="px-2 py-1.5 font-medium">Hours</th>
                                        <th className="px-2 py-1.5 font-medium">Time Code</th>
                                        <th className="px-2 py-1.5 font-medium">Comments</th>
                                        <th className="px-2 py-1.5 font-medium">Status</th>
                                        <th className="px-2 py-1.5 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {week.entries.map(entry => (
                                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2">
                                                {entry.status === 'Submitted' && (
                                                    <button onClick={() => toggleSelect(entry.id)} className="text-gray-400 hover:text-brand-600">
                                                        {selectedIds.has(entry.id)
                                                            ? <CheckSquare className="w-4 h-4 text-brand-600" />
                                                            : <Square className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 font-medium text-gray-900 text-xs">{formatDate(entry.date)}</td>
                                            <td className="px-2 py-2">
                                                <span className="font-semibold">{entry.hours}h</span>
                                                {entry.isBillable && <Badge className="ml-1 bg-emerald-50 text-emerald-700 text-[9px] px-1">$</Badge>}
                                            </td>
                                            <td className="px-2 py-2 text-xs text-gray-700">{entry.timeCode}</td>
                                            <td className="px-2 py-2 text-xs text-gray-500 max-w-[180px] truncate">
                                                {entry.comments || '—'}
                                                {entry.overrideReason && (
                                                    <div className="text-[9px] text-amber-600 italic font-medium mt-0.5" title={entry.overrideReason}>
                                                        OR: {entry.overrideReason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-2 py-2">{statusBadge(entry.status)}</td>
                                            <td className="px-2 py-2 text-right">
                                                {(entry.status === 'Submitted' || isAdminMode) && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                                            title={isAdminMode ? "Admin Approval (Override)" : "Approve"}
                                                            disabled={!!actionLoading || (isAdminMode && !overrideReason)}
                                                            onClick={() => handleApprove([entry.id], `approve-${entry.id}`)}
                                                        >
                                                            {actionLoading === `approve-${entry.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                                                            title={isAdminMode ? "Admin Rejection (Override)" : "Reject"}
                                                            disabled={!!actionLoading}
                                                            onClick={() => { setRejectingEntryId(entry.id); setRejectionComment("") }}
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                                {entry.status === 'PM_Rejected' && entry.rejectionComment && (
                                                    <span className="text-[10px] text-red-500 italic" title={entry.rejectionComment}>
                                                        "{entry.rejectionComment.slice(0, 40)}…"
                                                    </span>
                                                )}

                                                {/* Inline reject comment */}
                                                {rejectingEntryId === entry.id && (
                                                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-200 min-w-[200px] absolute right-0 z-10 shadow-sm text-left">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <MessageSquare className="w-3 h-3 text-red-500" />
                                                            <span className="text-[10px] text-red-600 font-medium">
                                                                {isAdminMode ? 'Override Detail (Required)' : 'Reason (optional)'}
                                                            </span>
                                                        </div>
                                                        <textarea
                                                            className="w-full text-xs border border-red-200 rounded p-1 resize-none bg-white"
                                                            rows={2}
                                                            maxLength={500}
                                                            value={isAdminMode ? overrideReason : rejectionComment}
                                                            onChange={(e) => isAdminMode ? setOverrideReason(e.target.value) : setRejectionComment(e.target.value)}
                                                            placeholder={isAdminMode ? "Why are you overriding?" : "Reason for rejection…"}
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-1 mt-1">
                                                            <Button 
                                                                size="sm" 
                                                                className="h-5 text-[10px] bg-red-600 hover:bg-red-700 text-white px-2" 
                                                                disabled={!!actionLoading || (isAdminMode && !overrideReason)} 
                                                                onClick={() => handleReject(entry.id)}
                                                            >
                                                                {actionLoading === `reject-${entry.id}` ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                                {isAdminMode ? 'Confirm Override' : 'Reject'}
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => setRejectingEntryId(null)}>Cancel</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}
