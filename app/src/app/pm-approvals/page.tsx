"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle, ChevronDown, ChevronRight, MessageSquare, ClipboardCheck, Users, FolderKanban } from "lucide-react"
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
        case 'APPROVED': return <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>
        case 'PARTIAL_REJECTED': return <Badge className="bg-red-100 text-red-700 text-xs">Partial rejection</Badge>
        case 'PENDING_APPROVAL': return <Badge className="bg-amber-100 text-amber-800 text-xs">Pending approval</Badge>
        default: return <Badge variant="outline" className="text-xs">Draft</Badge>
    }
}

function SummaryMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 min-h-[84px] flex flex-col justify-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
    )
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
            const projIds = new Set(data.map(e => e.projectId))
            setExpandedProjects(projIds)
            setExpandedEmployees(new Set(data.map(e => `${e.projectId}::${e.employeeId}`)))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load pending approvals')
        } finally {
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    const grouped = useMemo(() => groupEntries(entries), [entries])

    const summaryStats = useMemo(() => {
        const employeeIds = new Set(entries.map(e => e.employeeId))
        const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)
        return {
            entryCount: entries.length,
            projectCount: grouped.length,
            employeeCount: employeeIds.size,
            totalHours: Math.round(totalHours * 10) / 10,
        }
    }, [entries, grouped.length])

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
        <PageContainer className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-6 h-6 text-brand-600" />
                        <h1 className="text-2xl font-semibold text-gray-900">Timesheet Approvals</h1>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                        {entries.length === 0
                            ? isAdminUser
                                ? 'No submitted timesheets are waiting for approval.'
                                : 'No timesheets pending your approval.'
                            : isAdminUser
                              ? 'Review submitted hours across all projects. As admin you can approve any entry.'
                              : 'Review and approve submitted hours for projects you manage.'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isAdminUser && (
                        <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <input
                                type="checkbox"
                                checked={isAdminMode}
                                onChange={(e) => setIsAdminMode(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="font-medium">Override mode</span>
                        </label>
                    )}
                    {isAdminMode && (
                        <input
                            type="text"
                            className="h-9 w-52 text-sm border border-amber-200 rounded-lg px-3 bg-white"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="Override reason (optional)"
                        />
                    )}
                    <Button variant="outline" onClick={fetchEntries} disabled={loading}>
                        Refresh
                    </Button>
                </div>
            </div>

            {entries.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <SummaryMetric label="Pending entries" value={String(summaryStats.entryCount)} />
                    <SummaryMetric label="Projects" value={String(summaryStats.projectCount)} />
                    <SummaryMetric label="Employees" value={String(summaryStats.employeeCount)} />
                    <SummaryMetric label="Total hours" value={`${summaryStats.totalHours}h`} sub="Awaiting approval" />
                </div>
            )}

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
                <Card key={project.projectId} className="overflow-hidden border-gray-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
                        <button
                            type="button"
                            className="flex items-center gap-3 min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-md"
                            onClick={() => toggleProject(project.projectId)}
                        >
                            {expandedProjects.has(project.projectId) ? (
                                <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <FolderKanban className="w-4 h-4 text-brand-600 shrink-0" />
                                    <h2 className="text-base font-semibold text-gray-900 truncate">{project.projectName}</h2>
                                </div>
                                <span className="text-xs text-gray-500">{project.projectCode}</span>
                            </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                            <Badge variant="outline" className="text-xs">{project.entryCount} entries</Badge>
                            <Badge className="bg-brand-50 text-brand-700 border-brand-200 text-xs">{project.totalHours.toFixed(1)}h</Badge>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white h-8"
                                disabled={!!actionLoading}
                                onClick={() => {
                                    const allIds = project.employees.flatMap(emp => emp.weeks.flatMap(w => w.entries.map(e => e.id)))
                                    handleApproveAll(allIds, project.projectId)
                                }}
                            >
                                {actionLoading === `approve-all-${project.projectId}` ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                )}
                                Approve all
                            </Button>
                        </div>
                    </div>

                    {expandedProjects.has(project.projectId) && (
                        <div className="divide-y divide-gray-100">
                            {project.employees.map(emp => {
                                const empKey = `${project.projectId}::${emp.employeeId}`
                                const isExpanded = expandedEmployees.has(empKey)

                                return (
                                    <div key={empKey} className="bg-white">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30"
                                            onClick={() => toggleEmployee(empKey)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                                )}
                                                <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-xs font-semibold text-brand-700 shrink-0">
                                                    {emp.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{emp.employeeName}</p>
                                                    <p className="text-xs text-gray-500 truncate">{emp.employeeEmail}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm text-gray-700 font-medium tabular-nums">{emp.totalHours.toFixed(1)}h</span>
                                                <Badge variant="outline" className="text-xs">{emp.weeks.length} week{emp.weeks.length === 1 ? '' : 's'}</Badge>
                                            </div>
                                        </button>

                                        {isExpanded && emp.weeks.map(week => (
                                            <div key={week.weekStartDate} className="mx-5 mb-4 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-gray-200">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Users className="w-4 h-4 text-slate-500" />
                                                        <span className="text-sm font-medium text-gray-900">
                                                            Week of {formatWeek(week.weekStartDate)}
                                                        </span>
                                                        {weekStatusBadge(week.weekStatus)}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Badge variant="outline" className="text-xs tabular-nums">{week.totalHours.toFixed(1)}h</Badge>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 border-green-300 text-green-700 hover:bg-green-50"
                                                            disabled={!!actionLoading}
                                                            onClick={() => handleApproveAll(week.entries.map(e => e.id), `${empKey}::${week.weekStartDate}`)}
                                                        >
                                                            {actionLoading === `approve-all-${empKey}::${week.weekStartDate}` ? (
                                                                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                                            ) : (
                                                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                            )}
                                                            Approve week
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-gray-50/80 text-left text-xs text-gray-500 border-b border-gray-100">
                                                                <th className="px-4 py-2.5 font-medium">Date</th>
                                                                <th className="px-4 py-2.5 font-medium">Hours</th>
                                                                <th className="px-4 py-2.5 font-medium">Time code</th>
                                                                <th className="px-4 py-2.5 font-medium">Comments</th>
                                                                <th className="px-4 py-2.5 font-medium text-right w-28">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {week.entries.map(entry => (
                                                                <tr key={entry.id} className="hover:bg-gray-50/60">
                                                                    <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatDate(entry.date)}</td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        <span className="font-semibold text-gray-900 tabular-nums">{entry.hours}h</span>
                                                                        {entry.isBillable && (
                                                                            <Badge className="ml-2 bg-emerald-50 text-emerald-700 text-[10px] px-1.5">Billable</Badge>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="text-gray-800 font-medium">{entry.timeCode}</span>
                                                                        <span className="block text-xs text-gray-500 mt-0.5">{entry.timeCodeDescription}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-600 max-w-[220px]">
                                                                        <span className="line-clamp-2">{entry.comments || '—'}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right relative">
                                                                        {(entry.status === 'Submitted' || isAdminMode) && (
                                                                            <div className="inline-flex items-center justify-end gap-1">
                                                                                <Button
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="h-8 w-8 text-green-600 hover:bg-green-50"
                                                                                    title="Approve entry"
                                                                                    disabled={!!actionLoading}
                                                                                    onClick={() => handleApproveOne(entry.id)}
                                                                                >
                                                                                    {actionLoading === `approve-${entry.id}` ? (
                                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                                    ) : (
                                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                                    )}
                                                                                </Button>
                                                                                <Button
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                                                    title="Reject entry"
                                                                                    disabled={!!actionLoading}
                                                                                    onClick={() => { setRejectingEntryId(entry.id); setRejectionComment("") }}
                                                                                >
                                                                                    <XCircle className="w-4 h-4" />
                                                                                </Button>
                                                                            </div>
                                                                        )}

                                                                        {rejectingEntryId === entry.id && (
                                                                            <div className="absolute right-4 top-full mt-1 z-20 w-64 text-left p-3 bg-white rounded-lg border border-red-200 shadow-lg">
                                                                                <div className="flex items-center gap-1 mb-2">
                                                                                    <MessageSquare className="w-3.5 h-3.5 text-red-500" />
                                                                                    <span className="text-xs text-red-700 font-medium">
                                                                                        {isAdminMode ? 'Override reason' : 'Rejection reason (optional)'}
                                                                                    </span>
                                                                                </div>
                                                                                <textarea
                                                                                    className="w-full text-xs border border-gray-200 rounded-md p-2 resize-none bg-white focus:outline-none focus:ring-2 focus:ring-red-200"
                                                                                    rows={2}
                                                                                    maxLength={500}
                                                                                    value={isAdminMode ? overrideReason : rejectionComment}
                                                                                    onChange={(e) => isAdminMode ? setOverrideReason(e.target.value) : setRejectionComment(e.target.value)}
                                                                                    placeholder={isAdminMode ? 'Why are you overriding?' : 'Enter reason for rejection…'}
                                                                                    autoFocus
                                                                                />
                                                                                <div className="flex gap-2 mt-2">
                                                                                    <Button
                                                                                        size="sm"
                                                                                        className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                                                                                        disabled={!!actionLoading || (isAdminMode && !overrideReason)}
                                                                                        onClick={() => handleRejectOne(entry.id)}
                                                                                    >
                                                                                        Reject
                                                                                    </Button>
                                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectingEntryId(null)}>Cancel</Button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
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
