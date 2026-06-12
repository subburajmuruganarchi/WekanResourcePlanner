import { useState } from "react"
import {
    FileBarChart,
    Download,
    RefreshCcw,
    Users,
    Calendar,
    Activity,
    Info,
    AlertCircle,
    FolderKanban,
    BarChart3,
    AlertTriangle,
    History,
    type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"

type ReportId =
    | "resource-view"
    | "project-view"
    | "resource-analytics"
    | "role-summary-hrs"
    | "role-summary-perc"
    | "bandwidth"
    | "overallocated"
    | "consolidated-history"

interface ReportCard {
    id: ReportId
    title: string
    description: string
    icon: LucideIcon
    tags: string[]
    colorClass: string
}

const REPORT_CONFIG: Record<ReportId, { endpoint: string; filename: string }> = {
    "resource-view": { endpoint: "/reports/resource-view", filename: "Resource_View.xlsx" },
    "project-view": { endpoint: "/reports/project-view", filename: "Project_View.xlsx" },
    "resource-analytics": { endpoint: "/reports/resource-analytics", filename: "Resource_Analytics.xlsx" },
    "role-summary-hrs": { endpoint: "/reports/role-summary?type=hours", filename: "Role_Hrs.xlsx" },
    "role-summary-perc": { endpoint: "/reports/role-summary?type=percentage", filename: "Role_Percent.xlsx" },
    bandwidth: { endpoint: "/reports/bandwidth", filename: "Bandwidth.xlsx" },
    overallocated: { endpoint: "/reports/overallocated", filename: "Overallocated.xlsx" },
    "consolidated-history": { endpoint: "/reports/consolidated-history", filename: "Consolidated_History.xlsx" },
}

export default function ReportsPage() {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [downloading, setDownloading] = useState<ReportId | null>(null)
    const [downloadError, setDownloadError] = useState<string | null>(null)

    const handleRefresh = () => {
        setIsRefreshing(true)
        window.location.reload()
    }

    const downloadReport = async (id: ReportId) => {
        const config = REPORT_CONFIG[id]
        setDownloading(id)
        setDownloadError(null)
        try {
            const response = await api.get(config.endpoint, { responseType: "blob" })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", config.filename)
            document.body.appendChild(link)
            link.click()
            link.parentNode?.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to download report. Please try again."
            setDownloadError(message)
        } finally {
            setDownloading(null)
        }
    }

    const reportCards: ReportCard[] = [
        {
            id: "resource-view",
            title: "Resource View",
            description:
                "Employee-wise master schedule from the current week onwards. External, internal, and projected projects with bandwidth rows, colour-coded.",
            icon: Users,
            colorClass: "bg-blue-50 text-blue-600",
            tags: ["Master schedule", "Employee-wise"],
        },
        {
            id: "project-view",
            title: "Project View",
            description:
                "Project-wise master schedule from the current week onwards. Aggregate project hours plus individual resource allocations per week.",
            icon: FolderKanban,
            colorClass: "bg-indigo-50 text-indigo-600",
            tags: ["Master schedule", "Project-wise"],
        },
        {
            id: "resource-analytics",
            title: "Resource Analytics",
            description:
                "Talent acquisition heatmap: required FTE gaps (0.25 increments) by role, plus dedicated overallocated and bandwidth sections.",
            icon: BarChart3,
            colorClass: "bg-purple-50 text-purple-600",
            tags: ["Hiring", "FTE gaps"],
        },
        {
            id: "role-summary-hrs",
            title: "Role Hrs",
            description: "Capacity and utilization: total allocated hours broken down by specific role.",
            icon: Calendar,
            colorClass: "bg-amber-50 text-amber-600",
            tags: ["Capacity", "Hours"],
        },
        {
            id: "role-summary-perc",
            title: "Role %",
            description: "Capacity and utilization: allocation percentages broken down by specific role.",
            icon: Activity,
            colorClass: "bg-emerald-50 text-emerald-600",
            tags: ["Utilization", "Percent"],
        },
        {
            id: "bandwidth",
            title: "Bandwidth",
            description:
                "Heatmap from the current week onwards: overworked resources (negative / blue) vs bench availability (positive / red).",
            icon: FileBarChart,
            colorClass: "bg-sky-50 text-sky-600",
            tags: ["Heatmap", "Planning"],
        },
        {
            id: "overallocated",
            title: "Overallocated",
            description:
                "Focused heatmap showing only resources with negative bandwidth in any upcoming week.",
            icon: AlertTriangle,
            colorClass: "bg-orange-50 text-orange-600",
            tags: ["Risk", "Heatmap"],
        },
        {
            id: "consolidated-history",
            title: "Consolidated History",
            description:
                "Full master schedule (like Resource View) including all historic project allocation data through the planning horizon.",
            icon: History,
            colorClass: "bg-slate-50 text-slate-600",
            tags: ["History", "Allocations"],
        },
    ]

    return (
        <div className="space-y-8 p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h1>
                    <p className="text-gray-500 mt-2 max-w-2xl">
                        Download Excel master schedules and capacity reports aligned with the Resource Planner
                        workbook. All reports use live allocation data.
                    </p>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    variant="outline"
                    className="gap-2 shrink-0"
                >
                    <RefreshCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {downloadError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">Report download failed</p>
                        <p className="text-sm mt-1">{downloadError}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
                {reportCards.map((report) => (
                    <Card
                        key={report.id}
                        className="overflow-hidden border-gray-200 hover:border-brand-300 transition-all hover:shadow-md flex flex-col"
                    >
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-3">
                            <div className="space-y-1 min-w-0">
                                <CardTitle className="text-lg font-bold">{report.title}</CardTitle>
                                <CardDescription className="text-sm text-gray-500 leading-relaxed">
                                    {report.description}
                                </CardDescription>
                            </div>
                            <div className={`p-2 rounded-lg shrink-0 ${report.colorClass}`}>
                                <report.icon className="w-5 h-5" />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="flex flex-wrap gap-2">
                                {report.tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="text-[10px] uppercase tracking-wider font-semibold"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-gray-50/50 border-t border-gray-100 flex justify-end p-4 mt-auto">
                            <Button
                                onClick={() => downloadReport(report.id)}
                                disabled={!!downloading}
                                className="gap-2"
                                size="sm"
                            >
                                <Download
                                    className={`w-4 h-4 ${downloading === report.id ? "animate-bounce" : ""}`}
                                />
                                {downloading === report.id ? "Generating…" : "Download .xlsx"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Card className="bg-brand-50 border-brand-100">
                <CardContent className="flex items-start gap-4 p-6 text-brand-800">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                        <p>
                            <strong>Colour legend:</strong> External = blue, Internal = amber, Projected = grey.
                            Bandwidth rows use blue for overallocated (negative) and red tones for bench (positive).
                        </p>
                        <p>Default horizon is 12 weeks from the current Monday unless configured on the server.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
