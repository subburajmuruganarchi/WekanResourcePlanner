import { useState, useEffect, useCallback } from "react"
import { Cloud, Loader2, RefreshCw } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { api } from "@/lib/api"

interface SheetSyncStatus {
    sheet: string
    lastSyncAt: string | null
    status: string | null
    rowsProcessed: number
    rowsSkipped: number
    errors: string[]
}

interface SheetSyncSummary {
    received: number
    processed: number
    skipped: number
    status: string
    lastSyncAt: string | null
    errors: string[]
}

interface FullSyncSummary {
    resource: SheetSyncSummary
    project: SheetSyncSummary
    allocation: SheetSyncSummary
}

function summaryToSyncStatus(summary: FullSyncSummary): SheetSyncStatus[] {
    const map = (sheet: string, s: SheetSyncSummary): SheetSyncStatus => ({
        sheet,
        lastSyncAt: s.lastSyncAt,
        status: s.status,
        rowsProcessed: s.processed,
        rowsSkipped: s.skipped,
        errors: s.errors ?? [],
    })
    return [
        map("Resource", summary.resource),
        map("Project", summary.project),
        map("Project_Allocation", summary.allocation),
    ]
}

export default function InputsPage() {
    const [syncStatus, setSyncStatus] = useState<SheetSyncStatus[]>([])
    const [statusLoading, setStatusLoading] = useState(false)
    const [syncRunning, setSyncRunning] = useState(false)
    const [syncProgress, setSyncProgress] = useState<number | null>(null)
    const [syncMessage, setSyncMessage] = useState<string | null>(null)
    const [syncMessageTone, setSyncMessageTone] = useState<"info" | "success" | "error">("info")

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

    const pollFullSyncStatus = async (
        syncBatchId: string
    ): Promise<{ ok: true; summary: FullSyncSummary } | { ok: false }> => {
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
                summary?: FullSyncSummary
                errors: string[]
                durationMs?: number
                message?: string
            }>(`/google-sheet-sync/sync/status/${encodeURIComponent(syncBatchId)}`)

            setSyncProgress(res.data?.progress ?? null)
            const sheets = res.data?.sheets
            if (sheets) {
                setSyncMessageTone("info")
                setSyncMessage(
                    `Resource: ${sheets.Resource} · Project: ${sheets.Project} · Allocation: ${sheets.Project_Allocation}`
                )
            } else {
                const sheet = res.data?.currentSheet
                if (sheet) {
                    setSyncMessageTone("info")
                    setSyncMessage(`Syncing ${sheet}… (${res.data?.progress ?? 0}%)`)
                }
            }

            if (res.data?.status === "SUCCESS" && res.data.syncCompleted) {
                const summary = res.data.summary
                if (summary) {
                    setSyncStatus(summaryToSyncStatus(summary))
                }
                const detail = summary
                    ? `Resource ${summary.resource.processed}, Project ${summary.project.processed}, Allocation ${summary.allocation.processed}`
                    : ""
                const duration =
                    res.data.durationMs != null
                        ? ` (${Math.round(res.data.durationMs / 1000)}s)`
                        : ""
                setSyncMessageTone("success")
                setSyncMessage(`Full sync completed${duration}${detail ? ` — ${detail}` : ""}`)
                return summary ? { ok: true, summary } : { ok: false }
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
        setSyncMessageTone("info")
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
                setSyncMessageTone("info")
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

            setSyncMessageTone("info")
            setSyncMessage("Full sync started…")
            const result = await pollFullSyncStatus(syncBatchId)
            if (result.ok) {
                await loadSyncStatus()
            }
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                (err instanceof Error ? err.message : "Full sync failed")
            setSyncMessageTone("error")
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
                        <Cloud className="w-6 h-6 text-brand-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Inputs</h1>
                </div>
                <p className="text-gray-600 max-w-2xl">
                    Sync Resource, Project, and Project Allocation from Google Sheets into MongoDB.
                </p>
            </div>

            <section className="p-5 bg-white border border-gray-200 rounded-xl">
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
                    <p
                        className={`text-sm mb-3 p-3 rounded-lg ${
                            syncMessageTone === "success"
                                ? "text-green-800 bg-green-50 border border-green-100"
                                : syncMessageTone === "error"
                                  ? "text-red-800 bg-red-50 border border-red-100"
                                  : "text-gray-700 bg-gray-50"
                        }`}
                    >
                        {syncMessage}
                    </p>
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
        </PageContainer>
    )
}
