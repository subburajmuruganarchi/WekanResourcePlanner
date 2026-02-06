import { Users, FolderKanban, Clock, TrendingUp } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { Section } from "@/components/layout/section"
import { StatCard } from "./components/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

// Mock Data
const stats = [
    { label: "Active Projects", value: "24", change: "+3 this month", icon: FolderKanban, color: "blue" as const },
    { label: "Total Employees", value: "156", change: "8 available", icon: Users, color: "green" as const },
    { label: "Avg Utilization", value: "82%", change: "+5% from last month", icon: TrendingUp, color: "purple" as const },
    { label: "Hours This Week", value: "6,248", change: "Across all projects", icon: Clock, color: "orange" as const },
]

const utilizationData = [
    { month: "Jan", utilization: 75 },
    { month: "Feb", utilization: 78 },
    { month: "Mar", utilization: 82 },
    { month: "Apr", utilization: 80 },
    { month: "May", utilization: 85 },
    { month: "Jun", utilization: 82 },
]

const projectData = [
    { name: "Backend", hours: 1850 },
    { name: "Frontend", hours: 1620 },
    { name: "DevOps", hours: 980 },
    { name: "QA", hours: 1150 },
    { name: "Design", hours: 650 },
]

const recentProjects = [
    { name: "E-Commerce Platform Redesign", code: "PRJ-001", status: "Active", progress: 65, team: 8 },
    { name: "Mobile App Development", code: "PRJ-002", status: "Active", progress: 45, team: 12 },
    { name: "API Gateway Migration", code: "PRJ-003", status: "Active", progress: 85, team: 6 },
    { name: "Customer Portal v2", code: "PRJ-004", status: "Planning", progress: 20, team: 5 },
]

export function Dashboard() {
    return (
        <PageContainer className="pl-0 space-y-8"> {/* pl-0 because PageContainer has p-8 and main layout handles padding, verifying visual match */}

            {/* Header Section */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">Welcome back! Here's what's happening.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Download Report</Button>
                    <Button>New Project</Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Utilization Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Utilization Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={utilizationData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                                    <Line type="monotone" dataKey="utilization" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Hours by Role */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Hours by Role</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                                    <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Projects */}
            <Section title="Recent Projects">
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead>Project</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Team Size</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentProjects.map((project) => (
                                <TableRow key={project.code} className="hover:bg-gray-50 cursor-pointer">
                                    <TableCell className="font-medium text-gray-900">{project.name}</TableCell>
                                    <TableCell className="font-mono text-xs text-gray-500">{project.code}</TableCell>
                                    <TableCell>
                                        <Badge variant={project.status === "Active" ? "success" : "info"}>
                                            {project.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${project.progress}%` }}></div>
                                            </div>
                                            <span className="text-xs text-gray-500">{project.progress}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500">{project.team} members</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Section>

        </PageContainer>
    )
}
