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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"

export default function ReportsPage() {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [downloading, setDownloading] = useState<string | null>(null)
    const [downloadError, setDownloadError] = useState<string | null>(null)

    const handleRefresh = () => {
        setIsRefreshing(true)
        window.location.reload()
    }

    const downloadReport = async (type: "consolidated" | "role-summary-hrs" | "role-summary-perc" | "bandwidth") => {
        setDownloading(type)
        setDownloadError(null)
        try {
            let endpoint = ""
            let filename = ""
            
            switch (type) {
                case "consolidated":
                    endpoint = "/reports/consolidated"
                    filename = "Consolidated_Report.xlsx"
                    break
                case "role-summary-hrs":
                    endpoint = "/reports/role-summary?type=hours"
                    filename = "Role_Summary_Hours.xlsx"
                    break
                case "role-summary-perc":
                    endpoint = "/reports/role-summary?type=percentage"
                    filename = "Role_Summary_Percentage.xlsx"
                    break
                case "bandwidth":
                    endpoint = "/reports/bandwidth"
                    filename = "Bandwidth_Report.xlsx"
                    break
            }

            const response = await api.get(endpoint, { responseType: 'blob' })
            
            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            
            // Clean up
            link.parentNode?.removeChild(link)
            window.URL.revokeObjectURL(url)
            
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Failed to download report. Please try again."
            setDownloadError(message)
        } finally {
            setDownloading(null)
        }
    }

    const reportCards = [
        {
            id: "consolidated",
            title: "Consolidated View",
            description: "Detailed per-resource allocation and project assignment across a 12-week horizon.",
            icon: Users,
            color: "blue",
            tags: ["Staffing", "Allocations"]
        },
        {
            id: "role-summary-hrs",
            title: "Role Summary (Hours)",
            description: "Aggregate billable and internal hours grouped by role and seniority.",
            icon: Calendar,
            color: "amber",
            tags: ["Utilization", "Finance"]
        },
        {
            id: "role-summary-perc",
            title: "Role Summary (%)",
            description: "Utilization percentages by role, helpful for identifying bench and capacity gaps.",
            icon: Activity,
            color: "emerald",
            tags: ["KPI", "Capacity"]
        },
        {
            id: "bandwidth",
            title: "Bandwidth Heatmap",
            description: "Heatmap view of resource availability based on a 40h standard work week.",
            icon: FileBarChart,
            color: "indigo",
            tags: ["Hiring", "Planning"]
        }
    ]

    return (
        <div className="space-y-8 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reporting Dashboard</h1>
                    <p className="text-gray-500 mt-2">Generate and download comprehensive staff and project reports.</p>
                </div>
                <Button 
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                    variant="outline"
                    className="gap-2"
                >
                    <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Reports
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {reportCards.map((report) => (
                    <Card key={report.id} className="overflow-hidden border-gray-200 hover:border-brand-300 transition-all hover:shadow-md">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold">{report.title}</CardTitle>
                                <CardDescription className="text-sm text-gray-500">{report.description}</CardDescription>
                            </div>
                            <div className={`p-2 rounded-lg bg-${report.color}-50 text-${report.color}-600`}>
                                <report.icon className="w-6 h-6" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {report.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-gray-50/50 border-t border-gray-100 flex justify-end p-4">
                            <Button 
                                onClick={() => downloadReport(report.id as any)}
                                disabled={!!downloading}
                                className="gap-2"
                            >
                                <Download className={`w-4 h-4 ${downloading === report.id ? 'animate-bounce' : ''}`} />
                                {downloading === report.id ? 'Generating...' : 'Download (.xlsx)'}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Card className="bg-brand-50 border-brand-100">
                <CardContent className="flex items-center gap-4 p-6 text-brand-800">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">
                        Pro Tip: The reports are generated using live data from the resource pool and reflect all current project allocations and staff assignments.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
