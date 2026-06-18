import { useState, useEffect, useCallback } from "react"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, RefreshCw, Cloud } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { api } from "@/lib/api"

interface SkippedRow {
    identifier: string
    reason: string
}

interface ImportResult {
    employeesUpserted: number
    projectsUpserted: number
    allocationsUpserted: number
    weeklyEntriesUpserted: number
    jobRoles: number
    skills: number
    resourceOnly: boolean
    message: string
    rowsReceived?: number
    rowsProcessed?: number
    rowsSkipped?: number
    skippedRows?: SkippedRow[]
    errors?: string[]
}

interface SheetSyncStatus {
    sheet: string
    lastSyncAt: string | null
    status: string | null
    rowsProcessed: number
    rowsSkipped: number
    errors: string[]
}

type FileKey = "resource" | "project" | "projectAllocation"

const FILE_SLOTS: {
    key: FileKey
    label: string
    filename: string
    description: string
}[] = [
    {
        key: "resource",
        label: "Resource",
        filename: "Resource.xlsx",
        description: "Employees, job roles, and skills",
    },
    {
        key: "project",
        label: "Project",
        filename: "Project.xlsx",
        description: "Project master data",
    },
    {
        key: "projectAllocation",
        label: "Project Allocation",
        filename: "Project_Allocation.xlsx",
        description: "Weekly planned hours and allocations",
    },
]

export default function InputsPage() {
    const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({})
    const [resourceOnly, setResourceOnly] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [syncStatus, setSyncStatus] = useState<SheetSyncStatus[]>([])
    const [statusLoading, setStatusLoading] = useState(false)
    const [syncRunning, setSyncRunning] = useState(false)
    const [syncProgress, setSyncProgress] = useState<number | null>(null)
    const [syncMessage, setSyncMessage] = useState<string | null>(null)

    const loadSyncStatus = useCallback(async () => {
        setStatusLoading(true)
        try {
            const res = await api.get<{ data: { sheets: SheetSyncStatus[] } }>(
                "/google-sheet-sync/status"
            )
            setSyncStatus(res.data?.data?.sheets ?? [])
        } catch {
            setSyncStatus([])
        } finally {
            setStatusLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSyncStatus()
    }, [loadSyncStatus])

    const handleFileChange = (key: FileKey, file: File | undefined) => {
        setFiles((prev) => {
            const next = { ...prev }
            if (file) next[key] = file
            else delete next[key]
            return next
        })
        setResult(null)
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setResult(null)

        const hasAnyFile = FILE_SLOTS.some((slot) => files[slot.key])
        if (!hasAnyFile) {
            setError("Select at least one Excel file to import.")
            return
        }
        if (resourceOnly && !files.resource) {
            setError("Resource-only import requires Resource.xlsx.")
            return
        }

        const formData = new FormData()
        if (files.resource) formData.append("resource", files.resource)
        if (files.project) formData.append("project", files.project)
        if (files.projectAllocation) formData.append("projectAllocation", files.projectAllocation)
        if (resourceOnly) formData.append("resourceOnly", "true")

        setUploading(true)
        try {
            const res = await api.post<{ data: ImportResult; message: string }>(
                "/planner-import",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            )
            setResult(res.data?.data ?? (res.data as unknown as ImportResult))
            await loadSyncStatus()
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                (err instanceof Error ? err.message : "Import failed")
            setError(msg)
        } finally {
            setUploading(false)
        }
    }

    const pollFullSyncStatus = async (syncBatchId: string): Promise<boolean> => {
        const maxAttempts = 90
        for (let i = 0; i < maxAttempts; i++) {
            const res = await api.get<{
                status: string
                syncCompleted: boolean
                syncBatchId: string
                progress: number
                currentSheet?: string
                sheets?: {
                    Resource: string
                    Project: string
                    Project_Allocation: string
                }
                summary?: {
                    resource: { processed: number; received: number }
                    project: { processed: number; received: number }
                    allocation: { processed: number; received: number }
                }
                errors: string[]
                durationMs?: number
                message?: string
            }>(`/google-sheet-sync/sync/status/${encodeURIComponent(syncBatchId)}`)

            setSyncProgress(res.data?.progress ?? null)
            const sheets = res.data?.sheets
            if (sheets) {
                setSyncMessage(
                    `Resource: ${sheets.Resource} · Project: ${sheets.Project} · Allocation: ${sheets.Project_Allocation}`
                )
            } else {
                const sheet = res.data?.currentSheet
                if (sheet) {
                    setSyncMessage(`Syncing ${sheet}… (${res.data?.progress ?? 0}%)`)
                }
            }

            if (res.data?.status === "SUCCESS" && res.data.syncCompleted) {
                const summary = res.data.summary
                const detail = summary
                    ? `Resource ${summary.resource.processed}/${summary.resource.received}, Project ${summary.project.processed}/${summary.project.received}, Allocation ${summary.allocation.processed}/${summary.allocation.received}`
                    : ""
                const duration =
                    res.data.durationMs != null
                        ? ` (${Math.round(res.data.durationMs / 1000)}s)`
                        : ""
                setSyncMessage(`Full sync completed${duration}${detail ? ` — ${detail}` : ""}`)
                return true
            }

            if (res.data?.status === "FAILED" && res.data.syncCompleted) {
                const err =
                    res.data.errors?.join("; ") ?? res.data.message ?? "Full sync failed"
                throw new Error(err)
            }

            await new Promise((r) => setTimeout(r, 4000))
        }
        throw new Error("Full sync timed out while waiting for completion")
    }

    const handleSyncNow = async () => {
        setSyncMessage(null)
        setSyncProgress(null)
        setSyncRunning(true)
        try {
            const res = await api.post<{
                status: string
                syncId: string
                syncBatchId: string
                message?: string
            }>("/google-sheet-sync/sync/full", {}, { timeout: 30_000 })

            if (res.status === 409 || res.data?.status === "RUNNING") {
                const activeId = (res.data as { syncBatchId?: string })?.syncBatchId
                setSyncMessage(
                    activeId
                        ? `${res.data?.message ?? "Sync already in progress."} (${activeId})`
                        : (res.data?.message ?? "Sync already in progress.")
                )
                return
            }

            const syncBatchId = res.data?.syncBatchId ?? res.data?.syncId
            if (!syncBatchId) {
                throw new Error("Server did not return a sync batch id")
            }

            setSyncMessage("Full sync started…")
            const ok = await pollFullSyncStatus(syncBatchId)
            if (ok) {
                await loadSyncStatus()
                window.location.reload()
            }
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                (err instanceof Error ? err.message : "Full sync failed")
            setSyncMessage(msg)
        } finally {
            setSyncRunning(false)
            setSyncProgress(null)
        }
    }

    return (
        <PageContainer>
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-brand-50 rounded-lg">
                        <Upload className="w-6 h-6 text-brand-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Inputs</h1>
                </div>
                <p className="text-gray-600 max-w-2xl">
                    Upload WeKan Resource Planner Excel files or sync from Google Sheets to seed
                    employees, projects, and weekly allocations.
                </p>
            </div>

            {/* Google Sheet Sync */}
            <section className="mb-8 p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <Cloud className="w-6 h-6 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Google Sheet Sync</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleSyncNow}
                        disabled={syncRunning}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 disabled:opacity-60"
                    >
                        {syncRunning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {syncRunning
                            ? syncProgress != null
                                ? `Syncing… ${syncProgress}%`
                                : "Syncing…"
                            : "Full Sync"}
                    </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    Pulls Resource, Project, and Project_Allocation from Google Sheets into MongoDB.
                    Order: Resource → Project → Project_Allocation. This may take a few minutes.
                </p>
                {syncMessage && (
                    <p className="text-sm text-gray-700 mb-3 p-3 bg-gray-50 rounded-lg">{syncMessage}</p>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                    {syncStatus.length === 0 && !statusLoading && (
                        <p className="text-sm text-gray-500 col-span-3">No Google Sheet sync runs yet.</p>
                    )}
                    {syncStatus.map((s) => (
                        <div
                            key={s.sheet}
                            className="p-4 border border-gray-100 rounded-lg bg-gray-50/50"
                        >
                            <p className="font-medium text-gray-900">{s.sheet}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Last sync:{" "}
                                {s.lastSyncAt
                                    ? new Date(s.lastSyncAt).toLocaleString()
                                    : "Never"}
                            </p>
                            <p className="text-xs mt-1">
                                Status:{" "}
                                <span
                                    className={
                                        s.status === "SUCCESS"
                                            ? "text-green-700"
                                            : s.status === "FAILED"
                                              ? "text-red-700"
                                              : "text-gray-600"
                                    }
                                >
                                    {s.status ?? "—"}
                                </span>
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                Processed: {s.rowsProcessed} · Skipped: {s.rowsSkipped}
                            </p>
                            {s.errors.length > 0 && (
                                <p className="text-xs text-red-600 mt-1 truncate" title={s.errors.join("; ")}>
                                    {s.errors[0]}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
                <strong>Recommended order:</strong> Resource → Project → Project Allocation. You can upload
                all three at once for a full import, or upload Resource alone to refresh employee data.
                Missing files fall back to previously saved copies on the server.
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    {FILE_SLOTS.map((slot) => (
                        <label
                            key={slot.key}
                            className="flex flex-col gap-3 p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-300 transition-colors cursor-pointer"
                        >
                            <div className="flex items-start gap-3">
                                <FileSpreadsheet className="w-8 h-8 text-green-600 shrink-0" />
                                <div>
                                    <p className="font-semibold text-gray-900">{slot.label}</p>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{slot.filename}</p>
                                    <p className="text-sm text-gray-600 mt-1">{slot.description}</p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                                onChange={(e) =>
                                    handleFileChange(slot.key, e.target.files?.[0])
                                }
                            />
                            {files[slot.key] && (
                                <p className="text-xs text-green-700 truncate">
                                    Selected: {files[slot.key]!.name}
                                </p>
                            )}
                        </label>
                    ))}
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={resourceOnly}
                        onChange={(e) => setResourceOnly(e.target.checked)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Import Resource sheet only (skip projects and allocations)
                </label>

                {error && (
                    <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {result && (
                    <div className="p-5 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800 font-medium mb-3">
                            <CheckCircle2 className="w-5 h-5" />
                            {result.message}
                        </div>
                        <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                                <dt className="text-gray-600">Employees</dt>
                                <dd className="font-semibold text-gray-900">{result.employeesUpserted}</dd>
                            </div>
                            {!result.resourceOnly && (
                                <>
                                    <div>
                                        <dt className="text-gray-600">Projects</dt>
                                        <dd className="font-semibold text-gray-900">{result.projectsUpserted}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-600">Allocations</dt>
                                        <dd className="font-semibold text-gray-900">{result.allocationsUpserted}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-600">Weekly cells</dt>
                                        <dd className="font-semibold text-gray-900">{result.weeklyEntriesUpserted}</dd>
                                    </div>
                                </>
                            )}
                            <div>
                                <dt className="text-gray-600">Job roles</dt>
                                <dd className="font-semibold text-gray-900">{result.jobRoles}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-600">Skills</dt>
                                <dd className="font-semibold text-gray-900">{result.skills}</dd>
                            </div>
                            {result.rowsSkipped != null && result.rowsSkipped > 0 && (
                                <div>
                                    <dt className="text-gray-600">Rows skipped</dt>
                                    <dd className="font-semibold text-amber-800">{result.rowsSkipped}</dd>
                                </div>
                            )}
                        </dl>
                        {result.skippedRows && result.skippedRows.length > 0 && (
                            <details className="mt-3 text-sm">
                                <summary className="cursor-pointer text-amber-800 font-medium">
                                    Skipped rows ({result.skippedRows.length})
                                </summary>
                                <ul className="mt-2 space-y-1 text-gray-700 max-h-40 overflow-y-auto">
                                    {result.skippedRows.slice(0, 20).map((s, i) => (
                                        <li key={i}>
                                            {s.identifier}: {s.reason}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Importing…
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Import data
                        </>
                    )}
                </button>
            </form>
        </PageContainer>
    )
}
