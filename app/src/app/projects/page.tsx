import { useNavigate } from "react-router-dom"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FilterBar } from "@/components/shared/filter-bar"
import { MoreVertical } from "lucide-react"

// Mock Data
const projects = [
    { id: "1", name: "E-Commerce Platform Redesign", code: "PRJ-001", owner: "Sarah Chen", startDate: "2026-01-15", endDate: "2026-06-30", status: "Active", priority: "High", team: 8 },
    { id: "2", name: "Mobile App Development", code: "PRJ-002", owner: "Marcus Johnson", startDate: "2026-02-01", endDate: "2026-08-31", status: "Active", priority: "High", team: 12 },
    { id: "3", name: "API Gateway Migration", code: "PRJ-003", owner: "Elena Rodriguez", startDate: "2025-12-01", endDate: "2026-03-31", status: "Active", priority: "Medium", team: 6 },
    { id: "4", name: "Customer Portal v2", code: "PRJ-004", owner: "David Park", startDate: "2026-03-01", endDate: "2026-09-30", status: "Planning", priority: "Medium", team: 5 },
]

const employees = [
    { id: "1", name: "Amol Deep", role: "admin", position: "Head of Delivery", status: "Active" },
    { id: "2", name: "Sanjay Mali", role: "employee", position: "Graphic Designer", status: "Active" },
    { id: "3", name: "Sachin Deshpande", role: "employee", position: "Project Manager", status: "Active" },
    { id: "4", name: "Deepak N", role: "employee", position: "Jr Associate TA", status: "Active" },
]


export function Projects() {
    const navigate = useNavigate()

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Employees and Projects</h1>
                    <p className="text-sm text-gray-600 mt-1">View all employee's personal information, manage projects and allocation.</p>
                </div>
                <Button className="bg-brand-500 hover:bg-brand-600">Add Employee</Button>
            </div>

            <Tabs defaultValue="employee" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="employee">Employee</TabsTrigger>
                    <TabsTrigger value="project">Project</TabsTrigger>
                </TabsList>

                <TabsContent value="employee" className="space-y-4">
                    <FilterBar />
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((emp) => (
                                    <TableRow key={emp.id} className="cursor-pointer hover:bg-gray-50">
                                        <TableCell className="font-medium text-brand-600">{emp.name}</TableCell>
                                        <TableCell><Badge variant="secondary" className="uppercase text-[10px]">{emp.role}</Badge></TableCell>
                                        <TableCell>{emp.position}</TableCell>
                                        <TableCell><span className="text-green-600 font-medium text-sm">{emp.status}</span></TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4 text-gray-400" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="project" className="space-y-4">
                    <FilterBar />
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Timeline</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Team</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map((project) => (
                                    <TableRow key={project.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/projects/${project.id}`)}>
                                        <TableCell className="font-medium text-brand-600">{project.name}</TableCell>
                                        <TableCell className="font-mono text-xs text-gray-500">{project.code}</TableCell>
                                        <TableCell>{project.owner}</TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                <div>{new Date(project.startDate).toLocaleDateString()}</div>
                                                <div className="text-gray-500">to {new Date(project.endDate).toLocaleDateString()}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={project.status === "Active" ? "success" : "info"}>{project.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={project.priority === "High" ? "warning" : "secondary"}>{project.priority}</Badge>
                                        </TableCell>
                                        <TableCell>{project.team}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4 text-gray-400" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </PageContainer>
    )
}
