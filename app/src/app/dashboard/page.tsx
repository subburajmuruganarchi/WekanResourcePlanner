import { useState, useEffect } from 'react';
import { Users, FolderKanban, Clock, TrendingUp } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { StatCard } from "./components/stat-card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export default function Dashboard() {
    const [stats, setStats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/dashboard/stats');
                const result = response.data;

                if (result.status === 'success') {
                    const data = result.data;
                    setStats([
                        { label: "Active Projects", value: data.activeProjects.toString(), change: "Live from Platform", icon: FolderKanban, color: "blue" as const },
                        { label: "Total Employees", value: data.totalEmployees.toString(), change: "Live from Platform", icon: Users, color: "green" as const },
                        { label: "Avg Utilization", value: `${data.avgUtilization}%`, change: "Real-time average", icon: TrendingUp, color: "purple" as const },
                        { label: "Hours This Week", value: data.hoursThisWeek.toLocaleString(), change: "Logged time entries", icon: Clock, color: "orange" as const },
                        { label: "Pending Approvals", value: data.pendingApprovals.toLocaleString(), change: "Submitted entries", icon: Clock, color: "orange" as const },
                        { label: "Approved Hours", value: data.approvedHours.toLocaleString(), change: "Total lifetime", icon: FolderKanban, color: "green" as const },
                        { label: "Rejected Hours", value: data.rejectedHours.toLocaleString(), change: "Total lifetime", icon: TrendingUp, color: "red" as const },
                    ]);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                // Fallback to zeros if API fails
                setStats([
                    { label: "Active Projects", value: "0", change: "API Error", icon: FolderKanban, color: "blue" as const },
                    { label: "Total Employees", value: "0", change: "API Error", icon: Users, color: "green" as const },
                    { label: "Avg Utilization", value: "0%", change: "API Error", icon: TrendingUp, color: "purple" as const },
                    { label: "Hours This Week", value: "0", change: "API Error", icon: Clock, color: "orange" as const },
                    { label: "Pending Approvals", value: "0", change: "API Error", icon: Clock, color: "orange" as const },
                    { label: "Approved Hours", value: "0", change: "API Error", icon: FolderKanban, color: "green" as const },
                    { label: "Rejected Hours", value: "0", change: "API Error", icon: TrendingUp, color: "red" as const },
                ]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <PageContainer className="pl-0 space-y-8">
            {/* Header Section */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {isLoading ? 'Computing latest metrics...' : "Welcome back! Here's the live data from your platform."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Download Report</Button>
                    <Button>New Project</Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {!isLoading ? stats.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                )) : (
                    // Simple loading skeletons
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl border border-gray-100"></div>
                    ))
                )}
            </div>

            {/* AI and Reports shortcut */}
            <div className="mt-8 p-8 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 border-none inline-flex items-center gap-2">
                        <TrendingUp className="text-blue-500" />
                        AI Analytics Ready
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                        The new Project Management, Performance Review, and Strategic Reports bots are ready to assist.
                        Optimize your team allocations and track real-time utilization.
                    </p>
                </div>
                <Button className="shrink-0" onClick={() => window.location.href = '/ai-analytics'}>
                    Open AI Hub
                </Button>
            </div>
        </PageContainer>
    )
}
