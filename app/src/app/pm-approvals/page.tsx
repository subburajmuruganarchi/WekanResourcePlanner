"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle, ChevronDown, ChevronRight, MessageSquare } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { ApprovalAnomalyPanel } from "@/components/ai/approval-anomaly-panel"
import { fetchApprovalAnomalies, type ApprovalInsightSummary } from "@/lib/use-ai-insights"

/* ---------- Types ---------- */
interface PendingEntry {
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
    rejectionComment?: string
    overriddenAt?: string
    overriddenBy?: string
    overrideReason?: string
    status: string
}

interface GroupedByProject {
    projectId: string
    projectName: string
    projectCode: string
    employees: GroupedByEmployee[]
    totalHours: number
    entryCount: number
}

interface GroupedByEmployee {
    employeeId: string
    employeeName: string
    employeeEmail: string
    weeks: GroupedByWeek[]
    totalHours: number
}

interface GroupedByWeek {
    weekStartDate: string
    entries: PendingEntry[]
    totalHours: number
    weekStatus: string
}

/* ---------- Helpers ---------- */
function groupEntries(entries: PendingEntry[]): GroupedByProject[] {
    const projectMap = new Map<string, GroupedByProject>()

    for (const entry of entries) {
        if (!projectMap.has(entry.projectId)) {
            projectMap.set(entry.projectId, {
                projectId: entry.projectId,
                projectName: entry.projectName,
                projectCode: entry.projectCode,
                employees: [],
                totalHours: 0,
                entryCount: 0,
            })
        }
        const proj = projectMap.get(entry.projectId)!
        proj.totalHours += entry.hours
        proj.entryCount++

        let emp = proj.employees.find(e => e.employeeId === entry.employeeId)
        if (!emp) {
            emp = {
                employeeId: entry.employeeId,
                employeeName: entry.employeeName,
                employeeEmail: entry.employeeEmail,
                weeks: [],
                totalHours: 0,
            }
            proj.employees.push(emp)
        }
        emp.totalHours += entry.hours

        let week = emp.weeks.find(w => w.weekStartDate === entry.weekStartDate)
        if (!week) {
            week = { weekStartDate: entry.weekStartDate, entries: [], totalHours: 0, weekStatus: 'DRAFT' }
            emp.weeks.push(week)
        }
        week.entries.push(entry)
        week.totalHours += entry.hours
    }

    // Calculate weekStatus and Sort weeks descending
    for (const proj of projectMap.values()) {
        for (const emp of proj.employees) {
            for (const week of emp.weeks) {
                const statuses = week.entries.map(e => e.status)
                if (statuses.includes('PM_Rejected')) week.weekStatus = 'PARTIAL_REJECTED'
                else if (statuses.every(s => s === 'PM_Approved')) week.weekStatus = 'APPROVED'
                else if (statuses.some(s => s === 'Submitted')) week.weekStatus = 'PENDING_APPROVAL'
                else week.weekStatus = 'DRAFT'
            }
            emp.weeks.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
        }
        proj.employees.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
    }

    return Array.from(projectMap.values()).sort((a, b) => a.projectName.localeCompare(b.projectName))
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

function weekStatusBadge(status: string) {
    switch (status) {
        case 'APPROVED': return <Badge className="bg-green-100 text-green-700 text-[10px]">Approved</Badge>
        case 'PARTIAL_REJECTED': return <Badge className="bg-red-100 text-red-700 text-[10px]">Partial Rejection</Badge>
        case 'PENDING_APPROVAL': return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Pending Approval</Badge>
        default: return <Badge variant="outline" className="text-[10px]">Draft</Badge>
    }
}

/* ---------- Component ---------- */
export function PmApprovalsPage() {
    const { user } = useAuth()
    const [entries, setEntries] = useState<PendingEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null) // tracks which action is in progress
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [rejectingEntryId, setRejectingEntryId] = useState<string | null>(null)
    const [rejectionComment, setRejectionComment] = useState("")
    const [overrideReason, setOverrideReason] = useState("")
    const [isAdminMode, setIsAdminMode] = useState(false)
    const isAdminUser = user?.role === 'Admin'

    // Collapsible state
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
    const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
    const [approvalInsight, setApprovalInsight] = useState<ApprovalInsightSummary | null>(null)

    const fetchEntries = useCallback(async () => {
        if (!user?.id) return
        setLoading(true)
        setError(null)
        try {
            const data = await api.get<PendingEntry[]>('/time-entries/pending-approval')
            setEntries(data)
            fetchApprovalAnomalies().then(setApprovalInsight)
            // Auto-expand all projects
            const projIds = new Set(data.map(e => e.projectId))
            setExpandedProjects(projIds)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load pending approvals')
        } finally {
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    const grouped = useMemo(() => groupEntries(entries), [entries])

    const toggleProject = (id: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleEmployee = (key: string) => {
        setExpandedEmployees(prev => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg)
        setTimeout(() => setSuccessMsg(null), 3000)
    }

    /* ---- Actions ---- */
    const handleApproveAll = async (entryIds: string[], label: string) => {
        if (!user?.id) return
        setActionLoading(`approve-all-${label}`)
        try {
            await api.post('/time-entries/approve', { 
                entryIds, 
                overrideReason: isAdminMode && overrideReason ? overrideReason : undefined
            })
            showSuccess(`Approved ${entryIds.length} entries`)
            setOverrideReason("")
            fetchEntries()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Approval failed')
        } finally {
            setActionLoading(null)
        }
    }

    const handleApproveOne = async (entryId: string) => {
        if (!user?.id) return
        setActionLoading(`approve-${entryId}`)
        try {
            await api.post('/time-entries/approve', { 
                entryIds: [entryId], 
                overrideReason: isAdminMode && overrideReason ? overrideReason : undefined
            })
            showSuccess('Entry approved')
            setOverrideReason("")
            fetchEntries()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Approval failed')
        } finally {
            setActionLoading(null)
        }
    }

    const handleRejectOne = async (entryId: string) => {
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

    /* ---- Render ---- */
    if (loading) {
        return (
            <PageContainer className="pl-0">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    <span className="ml-3 text-gray-500">Loading pending approvals…</span>
                </div>
            </PageContainer>
        )
    }

    return (
        <PageContainer className="pl-0 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Timesheet Approvals</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {entries.length === 0
                            ? 'No timesheets pending your approval.'
                            : `${entries.length} entries across ${grouped.length} project(s) awaiting review.`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdminUser && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isAdminMode} 
                                    onChange={(e) => setIsAdminMode(e.target.checked)}
                                    className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                                />
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Admin Override Mode</span>
                            </label>
                            {isAdminMode && (
                                <input 
                                    type="text"
                                    className="w-48 text-xs border border-amber-200 rounded p-1 bg-white ml-2"
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    placeholder="Reason for override..."
                                />
                            )}
                        </div>
                    )}
                    <Button variant="outline" onClick={fetchEntries} disabled={loading}>
                        Refresh
                    </Button>
                </div>
            </div>

            <ApprovalAnomalyPanel summary={approvalInsight} />

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

            {/* Empty State */}
            {entries.length === 0 && !error && (
                <Card className="p-12 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700">All caught up!</h3>
                    <p className="text-sm text-gray-500 mt-1">No timesheets are pending your approval right now.</p>
                </Card>
            )}

            {/* Grouped Entries */}
            {grouped.map(project => (
                <Card key={project.projectId} className="overflow-hidden">
                    {/* Project Header */}
                    <button
                        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => toggleProject(project.projectId)}
                    >
                        <div className="flex items-center gap-3">
                            {expandedProjects.has(project.projectId) ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                            <div className="text-left">
                                <h2 className="text-base font-semibold text-gray-900">{project.projectName}</h2>
                                <span className="text-xs text-gray-500">{project.projectCode}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="text-xs">{project.entryCount} entries</Badge>
                            <Badge className="bg-brand-50 text-brand-700 border-brand-200">{project.totalHours.toFixed(1)}h</Badge>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                disabled={!!actionLoading}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const allIds = project.employees.flatMap(emp => emp.weeks.flatMap(w => w.entries.map(e => e.id)))
                                    handleApproveAll(allIds, project.projectId)
                                }}
                            >
                                {actionLoading === `approve-all-${project.projectId}` ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                Approve All
                            </Button>
                        </div>
                    </button>

                    {/* Project Body */}
                    {expandedProjects.has(project.projectId) && (
                        <div className="divide-y divide-gray-100">
                            {project.employees.map(emp => {
                                const empKey = `${project.projectId}::${emp.employeeId}`
                                const isExpanded = expandedEmployees.has(empKey)

                                return (
                                    <div key={empKey}>
                                        {/* Employee Header */}
                                        <button
                                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => toggleEmployee(empKey)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700">
                                                    {emp.employeeName.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-gray-900">{emp.employeeName}</p>
                                                    <p className="text-xs text-gray-400">{emp.employeeEmail}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-600 font-medium">{emp.totalHours.toFixed(1)}h total</span>
                                                <Badge variant="outline" className="text-xs">{emp.weeks.length} week(s)</Badge>
                                            </div>
                                        </button>

                                        {/* Weekly Entries Table */}
                                        {isExpanded && emp.weeks.map(week => (
                                            <div key={week.weekStartDate} className="mx-6 mb-4 border border-gray-200 rounded-lg overflow-hidden">
                                                {/* Week Header */}
                                                <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-medium text-blue-800">
                                                            Week of {formatWeek(week.weekStartDate)}
                                                        </span>
                                                        {weekStatusBadge(week.weekStatus)}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-blue-100 text-blue-700 text-xs">{week.totalHours.toFixed(1)}h</Badge>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs h-6 border-green-300 text-green-700 hover:bg-green-50"
                                                            disabled={!!actionLoading}
                                                            onClick={() => handleApproveAll(week.entries.map(e => e.id), `${empKey}::${week.weekStartDate}`)}
                                                        >
                                                            {actionLoading === `approve-all-${empKey}::${week.weekStartDate}` ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve Week'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Entries Table */}
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                                                            <th className="px-4 py-2 font-medium">Date</th>
                                                            <th className="px-4 py-2 font-medium">Hours</th>
                                                            <th className="px-4 py-2 font-medium">Time Code</th>
                                                            <th className="px-4 py-2 font-medium">Comments</th>
                                                            <th className="px-4 py-2 font-medium text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {week.entries.map(entry => (
                                                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-2.5 text-gray-900 font-medium">{formatDate(entry.date)}</td>
                                                                <td className="px-4 py-2.5">
                                                                    <span className="font-semibold text-gray-900">{entry.hours}h</span>
                                                                    {entry.isBillable && <Badge className="ml-2 bg-emerald-50 text-emerald-700 text-[10px] px-1.5">$</Badge>}
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    <span className="text-gray-700">{entry.timeCode}</span>
                                                                    <span className="text-xs text-gray-400 ml-1">({entry.timeCodeDescription})</span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate">
                                                                    {entry.comments || '—'}
                                                                    {entry.overrideReason && (
                                                                        <div className="text-[10px] text-amber-600 italic font-medium mt-0.5" title={entry.overrideReason}>
                                                                            Override: {entry.overrideReason}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right">
                                                                    {(entry.status === 'Submitted' || isAdminMode) && (
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                                                                                title={isAdminMode ? "Admin Approval (Override)" : "Approve"}
                                                                                disabled={!!actionLoading || (isAdminMode && !overrideReason)}
                                                                                onClick={() => handleApproveOne(entry.id)}
                                                                            >
                                                                                {actionLoading === `approve-${entry.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                                                                title={isAdminMode ? "Admin Rejection (Override)" : "Reject"}
                                                                                disabled={!!actionLoading}
                                                                                onClick={() => { setRejectingEntryId(entry.id); setRejectionComment(""); }}
                                                                            >
                                                                                <XCircle className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>
                                                                    )}

                                                                    {/* Inline Reject Comment */}
                                                                    {rejectingEntryId === entry.id && (
                                                                        <div className="mt-2 text-left p-2 bg-red-50 rounded-md border border-red-200 min-w-[200px] absolute right-0 z-10 shadow-sm">
                                                                            <div className="flex items-center gap-1 mb-1">
                                                                                <MessageSquare className="w-3 h-3 text-red-500" />
                                                                                <span className="text-xs text-red-600 font-medium">
                                                                                    {isAdminMode ? 'Override Detail (Required)' : 'Rejection reason (optional)'}
                                                                                </span>
                                                                            </div>
                                                                            <textarea
                                                                                className="w-full text-xs border border-red-200 rounded p-1.5 resize-none bg-white"
                                                                                rows={2}
                                                                                maxLength={500}
                                                                                value={isAdminMode ? overrideReason : rejectionComment}
                                                                                onChange={(e) => isAdminMode ? setOverrideReason(e.target.value) : setRejectionComment(e.target.value)}
                                                                                placeholder={isAdminMode ? "Why are you overriding?" : "Enter reason for rejection…"}
                                                                                autoFocus
                                                                            />
                                                                            <div className="flex gap-1 mt-1">
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="h-6 text-xs bg-red-600 hover:bg-red-700 text-white"
                                                                                    disabled={!!actionLoading || (isAdminMode && !overrideReason)}
                                                                                    onClick={() => handleRejectOne(entry.id)}
                                                                                >
                                                                                    {actionLoading === `reject-${entry.id}` ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                                                    {isAdminMode ? 'Confirm Override' : 'Reject'}
                                                                                </Button>
                                                                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setRejectingEntryId(null)}>Cancel</Button>
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
                                )
                            })}
                        </div>
                    )}
                </Card>
            ))}
        </PageContainer>
    )
}
