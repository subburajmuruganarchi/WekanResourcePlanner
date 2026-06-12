import { useState } from "react"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { api } from "@/lib/api"

interface ImportResult {
    employeesUpserted: number
    projectsUpserted: number
    allocationsUpserted: number
    weeklyEntriesUpserted: number
    jobRoles: number
    skills: number
    resourceOnly: boolean
    message: string
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
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                (err instanceof Error ? err.message : "Import failed")
            setError(msg)
        } finally {
            setUploading(false)
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
                    Upload WeKan Resource Planner Excel files to seed employees, projects, and weekly
                    allocations. Uploaded files are saved to the server and imported into the database.
                </p>
            </div>

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
                        </dl>
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
