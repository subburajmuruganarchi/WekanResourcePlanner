import { useNavigate, useParams } from "react-router-dom"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Users, Calendar, Clock, DollarSign, Loader2 } from "lucide-react"
import { useProject } from "@/lib/use-projects"
import { useAuth } from "@/lib/auth-context"
import { TimesheetApprovalsTab } from "./components/timesheet-approvals-tab"

export function ProjectDetail() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const { project, loading, error } = useProject(id)
    const { user } = useAuth()

    // Check if logged-in user is the PM for this project
    const isPM = !!(user && project && project.managerId === user.id)

    if (loading) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    <span className="ml-3 text-gray-500">Loading project...</span>
                </div>
            </PageContainer>
        )
    }

    if (error || !project) {
        return (
            <PageContainer>
                <div className="text-center py-12">
                    <p className="text-red-600 mb-4">{error || "Project not found"}</p>
                    <Button variant="outline" onClick={() => navigate("/projects")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
                    </Button>
                </div>
            </PageContainer>
        )
    }

    // Calculate duration in months
    const startDate = new Date(project.startDate)
    const endDate = project.endDate ? new Date(project.endDate) : new Date()
    const durationMonths = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))

    // Skill requirements from API
    const skillRequirements = project.skillRequirements || []

    // Role efforts from API  
    const roleEfforts = project.roleEfforts || []

    return (
        <PageContainer>
            {/* Header */}
            <div className="mb-8">
                <Button variant="link" className="pl-0 text-gray-500 mb-4" onClick={() => navigate("/projects")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
                </Button>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
                            <Badge variant={project.status === "Active" ? "success" : project.status === "OnHold" ? "warning" : "secondary"}>
                                {project.status}
                            </Badge>
                            <Badge variant={project.priority === "High" ? "warning" : project.priority === "Low" ? "secondary" : "default"}>
                                {project.priority} Priority
                            </Badge>
                        </div>
                        <p className="font-mono text-sm text-gray-500">{project.code}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">Edit Project</Button>
                        <Button onClick={() => navigate("/allocation")}>Allocate Resources</Button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><Users className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Team Size</p><p className="text-xl font-semibold">{project.teamSize || 0}</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600"><Calendar className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Duration</p><p className="text-xl font-semibold">{durationMonths} mo</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600"><Clock className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Skills Required</p><p className="text-xl font-semibold">{skillRequirements.length}</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600"><DollarSign className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Billing</p><p className="text-xl font-semibold">Billable</p></div>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="bg-white border border-gray-200 rounded-lg">
                <TabsList className="px-6 pt-4 border-b border-gray-200 w-full justify-start rounded-none h-auto bg-transparent mb-0">
                    <TabsTrigger value="overview" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">Overview</TabsTrigger>
                    <TabsTrigger value="requirements" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">Skill Requirements</TabsTrigger>
                    <TabsTrigger value="roles" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">Role Efforts</TabsTrigger>
                    {isPM && (
                        <TabsTrigger value="approvals" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">
                            Timesheet Approvals
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="overview" className="p-8">
                    <div className="grid grid-cols-3 gap-12">
                        <div className="col-span-2 space-y-6">
                            {/* Business Goal */}
                            {project.businessGoal && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Business Goal</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{project.businessGoal}</p>
                                </div>
                            )}

                            {/* Staffing Strategy */}
                            {project.staffingStrategy && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Staffing Strategy</h3>
                                    <Badge variant="outline">{project.staffingStrategy}</Badge>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                                <div className="space-y-4">
                                    <div><p className="text-xs text-gray-500">Project Owner</p><p className="font-medium">{project.owner}</p></div>
                                    <div><p className="text-xs text-gray-500">Client</p><p className="font-medium">{project.clientName || '-'}</p></div>
                                </div>
                                <div className="space-y-4">
                                    <div><p className="text-xs text-gray-500">Start Date</p><p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p></div>
                                    <div><p className="text-xs text-gray-500">End Date</p><p className="font-medium">{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}</p></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-1 border-l border-gray-100 pl-8">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Summary</h3>
                            <div className="space-y-3 text-sm text-gray-600">
                                <p><span className="font-medium text-gray-900">{skillRequirements.length}</span> skill requirements</p>
                                <p><span className="font-medium text-gray-900">{roleEfforts.length}</span> role efforts defined</p>
                                <p><span className="font-medium text-gray-900">{project.teamSize || 0}</span> team members allocated</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="requirements" className="p-0">
                    {skillRequirements.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead>Skill</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead>Headcount</TableHead>
                                    <TableHead>Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skillRequirements.map((req, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{req.skillName || 'Unknown Skill'}</TableCell>
                                        <TableCell><Badge variant="info" className="text-[10px]">{req.minSkillLevel}</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{req.originalHeadcount} required</span>
                                                <span className="text-[10px] text-brand-600 font-semibold">{req.fulfilledPercent}% fulfilled</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500 tabular-nums">
                                            {req.startDate} to {req.endDate} ({req.requiredDays}d)
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            <p>No skill requirements defined for this project.</p>
                            <p className="text-sm mt-2">Edit the project to add skill requirements.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="roles" className="p-0">
                    {roleEfforts.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead>Role</TableHead>
                                    <TableHead>Headcount</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Hours/Day</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roleEfforts.map((effort, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{effort.roleName || 'Unknown Role'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{effort.originalHeadcount} required</span>
                                                <span className="text-[10px] text-brand-600 font-semibold">{effort.fulfilledPercent}% fulfilled</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500 tabular-nums">
                                            {effort.startDate} to {effort.endDate} ({effort.requiredDays}d)
                                        </TableCell>
                                        <TableCell>{effort.hoursPerDay}h</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            <p>No role efforts defined for this project.</p>
                            <p className="text-sm mt-2">Edit the project to add role requirements.</p>
                        </div>
                    )}
                </TabsContent>

                {isPM && (
                    <TabsContent value="approvals" className="p-0">
                        <TimesheetApprovalsTab projectId={id!} />
                    </TabsContent>
                )}
            </Tabs>
        </PageContainer>
    )
}
