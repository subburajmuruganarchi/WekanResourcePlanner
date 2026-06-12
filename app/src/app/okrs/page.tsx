import { useState, useEffect } from "react"
import { Target, Plus, ChevronDown, ChevronRight, Pencil, Trash2, Loader2, User } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { Section } from "@/components/layout/section"
import { useAuth } from "@/lib/auth-context"
import { useEmployees } from "@/lib/use-employees"
import {
    useOkrs,
    updateKeyResultProgress,
    deleteOkr,
    type OkrEntry,
} from "@/lib/use-okrs"
import { OkrFormDialog } from "./okr-form"

// ── Quarter helpers ─────────────────────────────────────────────

function getCurrentQuarter(): string {
    const now = new Date()
    const q = Math.ceil((now.getMonth() + 1) / 3)
    return `Q${q}-${now.getFullYear()}`
}

function generatePeriodOptions(): string[] {
    const year = new Date().getFullYear()
    const options: string[] = []
    for (let y = year + 1; y >= year - 2; y--) {
        for (let q = 4; q >= 1; q--) {
            options.push(`Q${q}-${y}`)
        }
    }
    return options
}

// ── Achievement color helpers ───────────────────────────────────

function getScoreColor(score: number): string {
    if (score >= 80) return "text-emerald-600"
    if (score >= 60) return "text-amber-600"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
}

function getProgressBarColor(score: number): string {
    if (score >= 80) return "bg-emerald-500"
    if (score >= 60) return "bg-amber-500"
    if (score >= 40) return "bg-orange-400"
    return "bg-red-400"
}

function getStatusBadge(status: string): { bg: string; text: string } {
    switch (status) {
        case "Completed": return { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" }
        case "Active": return { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" }
        case "In Progress": return { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" }
        case "Draft": return { bg: "bg-gray-50 border-gray-200", text: "text-gray-600" }
        case "Cancelled": return { bg: "bg-red-50 border-red-200", text: "text-red-600" }
        default: return { bg: "bg-gray-50 border-gray-200", text: "text-gray-600" }
    }
}

// ── Main Component ──────────────────────────────────────────────

export default function OkrsPage() {
    const { user } = useAuth()
    const canCreate = user?.role === "Admin" || user?.role === "Project Manager"
    const canEdit = canCreate
    const canDelete = user?.role === "Admin"
    const canUpdateProgress = true // All roles can update their own OKR progress
    const isEmployeeView = user?.role === "Employee"

    const { employees } = useEmployees()

    // Employee role: auto-select self. Others: must pick an employee.
    const [selectedEmployee, setSelectedEmployee] = useState<string>(
        isEmployeeView ? (user?.id || "") : ""
    )
    const [selectedPeriod, setSelectedPeriod] = useState(getCurrentQuarter())
    const [showForm, setShowForm] = useState(false)
    const [editingOkr, setEditingOkr] = useState<OkrEntry | null>(null)
    const [expandedOkrs, setExpandedOkrs] = useState<Set<string>>(new Set())

    // Only fetch when an employee is selected
    const { okrs, overallScore, loading, refetch } = useOkrs(
        selectedEmployee || undefined,
        selectedPeriod
    )

    const periodOptions = generatePeriodOptions()

    // Find the selected employee name for display
    const selectedEmployeeName = employees.find(e => e.id === selectedEmployee)?.name || ""

    const toggleExpand = (okrId: string) => {
        setExpandedOkrs(prev => {
            const next = new Set(prev)
            if (next.has(okrId)) next.delete(okrId)
            else next.add(okrId)
            return next
        })
    }

    const handleProgressUpdate = async (okrId: string, krId: string, value: string) => {
        const achieved = Number(value)
        if (isNaN(achieved) || achieved < 0) return
        try {
            await updateKeyResultProgress(okrId, krId, achieved)
            await refetch()
        } catch (err) {
            console.error("Failed to update progress:", err)
        }
    }

    const handleDelete = async (okrId: string) => {
        if (!window.confirm("Are you sure you want to delete this OKR?")) return
        try {
            await deleteOkr(okrId)
            refetch()
        } catch (err) {
            console.error("Failed to delete OKR:", err)
        }
    }

    const handleFormClose = () => {
        setShowForm(false)
        setEditingOkr(null)
        refetch()
    }

    return (
        <PageContainer>
            {/* Header */}
            <Section
                title="OKRs"
                description="Objectives & Key Results"
                action={
                    <div className="flex items-center gap-3">
                        {/* Employee selector (Admin/PM) */}
                        {!isEmployeeView && (
                            <select
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                            >
                                <option value="">Select Employee...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        )}

                        {/* Period selector */}
                        <select
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            {periodOptions.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>

                        {/* Create button */}
                        {canCreate && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Create OKR
                            </button>
                        )}
                    </div>
                }
            />

            {/* Prompt to select employee */}
            {!selectedEmployee && !isEmployeeView && (
                <div className="mt-8 text-center py-16 bg-white rounded-xl border border-gray-200">
                    <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">Select an Employee</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Choose an employee from the dropdown above to view their OKRs.
                    </p>
                </div>
            )}

            {/* Employee OKR View (shown when employee is selected) */}
            {selectedEmployee && (
                <>
                    {/* Overall Score Banner — per employee */}
                    {!loading && okrs.length > 0 && (
                        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                                        <Target className={`w-5 h-5 ${getScoreColor(overallScore)}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {selectedEmployeeName ? `${selectedEmployeeName}'s OKR Score` : "OKR Score"}
                                        </p>
                                        <p className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}%</p>
                                    </div>
                                </div>
                                <div className="w-64">
                                    <div className="w-full bg-gray-100 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(overallScore)}`}
                                            style={{ width: `${Math.min(overallScore, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="mt-8 flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                            <span className="ml-2 text-gray-500">Loading OKRs...</span>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && okrs.length === 0 && (
                        <div className="mt-8 text-center py-16 bg-white rounded-xl border border-gray-200">
                            <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">No OKRs Found</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {canCreate
                                    ? `No OKRs for ${selectedPeriod}. Click "Create OKR" to get started.`
                                    : `No OKRs found for ${selectedPeriod}.`
                                }
                            </p>
                        </div>
                    )}

                    {/* OKR List */}
                    {!loading && okrs.length > 0 && (
                        <div className="mt-6 space-y-4">
                            {okrs.map(okr => (
                                <div key={okr.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                    <OkrCard
                                        okr={okr}
                                        expanded={expandedOkrs.has(okr.id)}
                                        onToggle={() => toggleExpand(okr.id)}
                                        canEdit={canEdit}
                                        canDelete={canDelete}
                                        canUpdateProgress={canUpdateProgress}
                                        onEdit={() => { setEditingOkr(okr); setShowForm(true) }}
                                        onDelete={() => handleDelete(okr.id)}
                                        onProgressUpdate={handleProgressUpdate}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Form Dialog */}
            {showForm && (
                <OkrFormDialog
                    okr={editingOkr}
                    defaultPeriod={selectedPeriod}
                    defaultEmployeeId={selectedEmployee}
                    onClose={handleFormClose}
                />
            )}
        </PageContainer>
    )
}

// ── OKR Card Component ──────────────────────────────────────────

interface OkrCardProps {
    okr: OkrEntry
    expanded: boolean
    onToggle: () => void
    canEdit: boolean
    canDelete: boolean
    canUpdateProgress: boolean
    onEdit: () => void
    onDelete: () => void
    onProgressUpdate: (okrId: string, krId: string, value: string) => Promise<void>
}

function OkrCard({ okr, expanded, onToggle, canEdit, canDelete, canUpdateProgress, onEdit, onDelete, onProgressUpdate }: OkrCardProps) {
    const statusBadge = getStatusBadge(okr.status)

    return (
        <div className="group">
            {/* Header */}
            <div
                className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={onToggle}
            >
                {expanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">{okr.objective}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge.bg} ${statusBadge.text}`}>
                            {okr.status}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {okr.keyResults.length} key result{okr.keyResults.length !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* Score */}
                <div className="flex items-center gap-3">
                    <div className="w-24">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(okr.achievementPercent)}`}
                                style={{ width: `${Math.min(okr.achievementPercent, 100)}%` }}
                            />
                        </div>
                    </div>
                    <span className={`text-sm font-bold w-10 text-right ${getScoreColor(okr.achievementPercent)}`}>
                        {okr.achievementPercent}%
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {canEdit && (
                        <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Key Results */}
            {expanded && (
                <div className="px-6 pb-4 pt-1 space-y-3 border-t border-gray-50 bg-gray-50/30">
                    {okr.keyResults.map(kr => (
                        <KeyResultRow
                            key={kr.id}
                            kr={kr}
                            okrId={okr.id}
                            canUpdateProgress={canUpdateProgress}
                            onProgressUpdate={onProgressUpdate}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Key Result Row with editable input ──────────────────────────

interface KeyResultRowProps {
    kr: OkrEntry["keyResults"][0]
    okrId: string
    canUpdateProgress: boolean
    onProgressUpdate: (okrId: string, krId: string, value: string) => Promise<void>
}

function KeyResultRow({ kr, okrId, canUpdateProgress, onProgressUpdate }: KeyResultRowProps) {
    const [localValue, setLocalValue] = useState(String(kr.achieved))
    const [saving, setSaving] = useState(false)
    const krStatus = getStatusBadge(kr.status)

    // Sync local value when parent data refreshes after save
    useEffect(() => {
        setLocalValue(String(kr.achieved))
    }, [kr.achieved])

    const handleSave = async () => {
        if (localValue === String(kr.achieved) || saving) return
        setSaving(true)
        try {
            await onProgressUpdate(okrId, kr.id, localValue)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{kr.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${krStatus.bg} ${krStatus.text}`}>
                            {kr.status}
                        </span>
                        <span className="text-xs text-gray-500">
                            Target: {kr.target} {kr.unit}
                        </span>
                    </div>
                </div>

                {/* Editable progress or read-only */}
                <div className="flex items-center gap-2 shrink-0">
                    {canUpdateProgress ? (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                                <input
                                    type="number"
                                    className="w-16 text-sm text-right bg-transparent outline-none"
                                    value={localValue}
                                    onChange={(e) => setLocalValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleSave()
                                        }
                                    }}
                                />
                                <span className="text-xs text-gray-500">{kr.unit}</span>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving || localValue === String(kr.achieved)}
                                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${localValue !== String(kr.achieved)
                                    ? "bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {saving ? "Saving..." : "Update"}
                            </button>
                        </div>
                    ) : (
                        <span className="text-sm text-gray-700 font-medium">{kr.achieved} / {kr.target} {kr.unit}</span>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(kr.achievementPercent)}`}
                        style={{ width: `${Math.min(kr.achievementPercent, 100)}%` }}
                    />
                </div>
                <span className={`text-xs font-semibold w-10 text-right ${getScoreColor(kr.achievementPercent)}`}>
                    {kr.achievementPercent}%
                </span>
            </div>
        </div>
    )
}
