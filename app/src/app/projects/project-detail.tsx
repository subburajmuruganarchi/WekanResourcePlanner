import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Users, Calendar, DollarSign, Loader2 } from "lucide-react"
import { useProject } from "@/lib/use-projects"
import { projectStatusLabel, projectStatusOf } from "@/lib/project-status"
import { projectTypeLabel } from "@/lib/project-type-label"
import { useAuth } from "@/lib/auth-context"
import { normalizeRoleName } from "@/lib/role-utils"
import { ROLES, isEmployeeAccessRole } from "@/lib/roles"
import { TimesheetApprovalsTab } from "./components/timesheet-approvals-tab"
import { StaffingRiskBadge } from "@/components/ai/staffing-risk-badge"
import { ProjectLeadershipPanel } from "./components/project-leadership-panel"
import { ProjectDialog } from "./components/project-dialog"

export function ProjectDetail() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const { project, loading, error, refetch } = useProject(id)
    const { user } = useAuth()
    const [editOpen, setEditOpen] = useState(false)

    const isAdmin = normalizeRoleName(user?.role) === ROLES.ADMIN
    const isReadOnlyEmployee = isEmployeeAccessRole(user?.role)

    const isPM = !!(user && project && project.managerId === user.id)

    const backPath = isReadOnlyEmployee ? "/workspace" : "/projects"
    const backLabel = isReadOnlyEmployee ? "Back to My Workspace" : "Back to Projects"

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
                    <Button variant="outline" onClick={() => navigate(backPath)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
                    </Button>
                </div>
            </PageContainer>
        )
    }

    const status = projectStatusOf(project)
    const statusLabel = projectStatusLabel(project.status)
    const billingLabel = project.billingType || projectTypeLabel(project.type, project.billingType)

    const startDate = new Date(project.startDate)
    const endDate = project.endDate ? new Date(project.endDate) : new Date()
    const durationMonths = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))

    return (
        <PageContainer>
            <div className="mb-8">
                <Button variant="link" className="pl-0 text-gray-500 mb-4" onClick={() => navigate(backPath)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
                </Button>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
                            <Badge variant={status === "Active" ? "success" : status === "OnHold" ? "warning" : "secondary"}>
                                {statusLabel}
                            </Badge>
                            <Badge variant={project.priority === "High" ? "warning" : project.priority === "Low" ? "secondary" : "default"}>
                                {project.priority} Priority
                            </Badge>
                            {isReadOnlyEmployee && (
                                <Badge variant="secondary">Read-only</Badge>
                            )}
                            {id && !isReadOnlyEmployee && <StaffingRiskBadge projectId={id} />}
                        </div>
                        <p className="font-mono text-sm text-gray-500">{project.code}</p>
                    </div>
                    {!isReadOnlyEmployee && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setEditOpen(true)}>Edit Project</Button>
                            <Button onClick={() => navigate("/allocation")}>Allocate Resources</Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><Users className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Team Size</p><p className="text-xl font-semibold">{project.teamSize || 0}</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600"><Calendar className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Duration</p><p className="text-xl font-semibold">{durationMonths} mo</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600"><DollarSign className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Billing</p><p className="text-xl font-semibold">{billingLabel}</p></div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="bg-white border border-gray-200 rounded-lg">
                <TabsList className="px-6 pt-4 border-b border-gray-200 w-full justify-start rounded-none h-auto bg-transparent mb-0">
                    <TabsTrigger value="overview" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">Overview</TabsTrigger>
                    {isPM && (
                        <TabsTrigger value="approvals" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">
                            Timesheet Approvals
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="overview" className="p-8">
                    <div className="grid grid-cols-3 gap-12">
                        <div className="col-span-2 space-y-6">
                            {project.businessGoal && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Business Goal</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{project.businessGoal}</p>
                                </div>
                            )}

                            {project.staffingStrategy && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Staffing Strategy</h3>
                                    <Badge variant="outline">{project.staffingStrategy}</Badge>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                                <div className="space-y-4">
                                    <div><p className="text-xs text-gray-500">Delivery Manager</p><p className="font-medium">{project.owner}</p></div>
                                    <div><p className="text-xs text-gray-500">Project Type</p><p className="font-medium">{projectTypeLabel(project.type, project.billingType)}</p></div>
                                </div>
                                <div className="space-y-4">
                                    <div><p className="text-xs text-gray-500">Start Date</p><p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p></div>
                                    <div><p className="text-xs text-gray-500">End Date</p><p className="font-medium">{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}</p></div>
                                </div>
                            </div>

                            {isAdmin && id && (
                                <div className="pt-6 border-t border-gray-100">
                                    <ProjectLeadershipPanel
                                        projectId={id}
                                        managerId={project.managerId}
                                        managerName={project.managerName}
                                        deliveryManagerIds={project.deliveryManagerIds}
                                        deliveryManagerNames={project.deliveryManagerNames}
                                        status={project.status}
                                        onUpdated={() => void refetch()}
                                    />
                                </div>
                            )}

                            {(project.teamMembers?.length ?? 0) > 0 && (
                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Team Members</h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50">
                                                <TableHead>Name</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead className="text-right">Allocation</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {project.teamMembers!.map((member) => (
                                                <TableRow key={member.employeeId}>
                                                    <TableCell>
                                                        <p className="font-medium text-gray-900">{member.name}</p>
                                                        {member.email && (
                                                            <p className="text-xs text-gray-500">{member.email}</p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {member.roleName ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {member.allocationPercent}%
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                        <div className="col-span-1 border-l border-gray-100 pl-8">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Summary</h3>
                            <div className="space-y-3 text-sm text-gray-600">
                                <p><span className="font-medium text-gray-900">{project.managerName}</span> project manager</p>
                                <p><span className="font-medium text-gray-900">{project.teamSize || 0}</span> team members allocated</p>
                                <p><span className="font-medium text-gray-900">{billingLabel}</span> billing</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {isPM && (
                    <TabsContent value="approvals" className="p-0">
                        <TimesheetApprovalsTab projectId={id!} />
                    </TabsContent>
                )}
            </Tabs>

            <ProjectDialog
                project={project}
                open={editOpen}
                onOpenChange={(open) => {
                    setEditOpen(open)
                    if (!open) void refetch()
                }}
            />
        </PageContainer>
    )
}
