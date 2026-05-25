import { useState, useMemo } from "react"
import { UserPlus, Loader2, HelpCircle } from "lucide-react"
import { AllocationExplainPanel } from "@/components/ai/allocation-explain-panel"
import { fetchAllocationExplanation, type AllocationExplanation } from "@/lib/use-ai-insights"
import { PageContainer } from "@/components/layout/page-container"
import { Section } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RoleGuard } from "@/components/shared/role-guard"
import { AllocationDialog } from "./components/allocation-dialog"
import { useRankedEmployees, type RankedEmployee } from "@/lib/use-ranked-employees"
import { useProjects, useProject } from "@/lib/use-projects"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function Allocation() {
    const { projects, loading: projLoading } = useProjects()
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
    const { project: selectedProject, loading: projectDetailsLoading, refetch: refetchProject } = useProject(selectedProjectId)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<RankedEmployee | null>(null)
    const [editingAllocation, setEditingAllocation] = useState<{
        id: string; percentage: number; startDate: string; endDate: string; skillId?: string; roleId?: string
    } | null>(null)
    const [explainLoading, setExplainLoading] = useState(false)
    const [explanation, setExplanation] = useState<AllocationExplanation | null>(null)

    const handleExplain = async (employeeId: string) => {
        if (!selectedProjectId) return
        setExplainLoading(true)
        setExplanation(null)
        const result = await fetchAllocationExplanation(
            selectedProjectId,
            employeeId,
            selectedProject?.startDate,
            selectedProject?.endDate
        )
        setExplanation(result)
        setExplainLoading(false)
    }



    const rankedParams = useMemo(() => ({
        projectId: selectedProjectId,
        startDate: selectedProject?.startDate,
        endDate: selectedProject?.endDate,
    }), [selectedProjectId, selectedProject?.startDate, selectedProject?.endDate])

    const { rankedEmployees, loading: rankLoading, error: rankError, refetch: refetchRanked } = useRankedEmployees(rankedParams)

    const handleAllocationSuccess = () => {
        refetchRanked()
        refetchProject()
    }

    const handleAllocate = (employee: RankedEmployee) => {
        setSelectedEmployee(employee)
        setEditingAllocation(null) // New allocation
        setIsDialogOpen(true)
    }

    const handleEdit = (employee: RankedEmployee) => {
        // Find the allocation for the current project
        const projectAlloc = employee.currentAllocations?.find(
            a => a.projectId === selectedProjectId
        )
        if (projectAlloc) {
            setSelectedEmployee(employee)
            setEditingAllocation({
                id: projectAlloc.id,
                percentage: projectAlloc.percentage,
                startDate: projectAlloc.startDate,
                endDate: projectAlloc.endDate,
                skillId: projectAlloc.skillId,
                roleId: projectAlloc.roleId,
            })
            setIsDialogOpen(true)
        }
    }

    // List of ranked employees
    const employeesToShow = rankedEmployees || []

    const selectedProjectName = projects.find(p => p.id === selectedProjectId)?.name || "Project"

    return (
        <PageContainer className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Resource Allocation</h1>
                <p className="text-sm text-gray-600 mt-1">Allocate resources to projects based on skills, availability, and experience.</p>
            </div>

            {/* Top Row: Project Selection */}
            <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Select Project to Allocate Resources</label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-full md:w-[400px] h-12 text-base font-medium border-gray-200 focus:ring-brand-500 rounded-xl">
                            <SelectValue placeholder="Choose a project..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                            {projLoading ? (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                                </div>
                            ) : (
                                (projects || []).map((project) => (
                                    <SelectItem key={project.id} value={project.id} className="h-10 text-sm focus:bg-brand-50 focus:text-brand-900 cursor-pointer">
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <span>{project.name}</span>
                                            <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{project.code}</span>
                                        </div>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
                {selectedProjectId && (
                    <div className="flex gap-2">
                        <Badge variant="outline" className="h-12 px-4 rounded-xl bg-gray-50 border-gray-200 text-gray-600 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            {selectedProject?.status || 'Active'}
                        </Badge>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Requirements */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Project Requirements Section */}
                    {selectedProjectId && (
                        <Section title="Project Requirements">
                            {projectDetailsLoading ? (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                                </div>
                            ) : selectedProject ? (
                                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                                    {/* Business Goal */}
                                    {selectedProject.businessGoal && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Business Goal</label>
                                            <p className="text-sm text-gray-700">{selectedProject.businessGoal}</p>
                                        </div>
                                    )}

                                    {/* Staffing Strategy */}
                                    {selectedProject.staffingStrategy && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Staffing Strategy</label>
                                            <Badge variant="outline" className="text-xs">{selectedProject.staffingStrategy}</Badge>
                                        </div>
                                    )}

                                    {/* Skill Requirements */}
                                    {selectedProject.skillRequirements && selectedProject.skillRequirements.length > 0 && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Skill Requirements</label>
                                            <div className="space-y-2">
                                                {selectedProject.skillRequirements.map((req, i) => (
                                                    <div key={i} className="bg-gray-50 rounded-lg p-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="default" className="text-[10px] bg-red-500 hover:bg-red-600 border-none">{req.skillName || 'Skill'}</Badge>
                                                                <span className="text-xs text-gray-400 font-medium">{req.minSkillLevel}+</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs font-bold text-gray-900">{req.fulfilledPercent}% fulfilled</div>
                                                                <div className="text-[10px] text-gray-400 font-medium">{req.originalHeadcount} people required</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 tabular-nums">
                                                            {req.startDate} to {req.endDate} ({req.requiredDays}d)
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Role Efforts */}
                                    {selectedProject.roleEfforts && selectedProject.roleEfforts.length > 0 && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Role Efforts</label>
                                            <div className="space-y-2">
                                                {selectedProject.roleEfforts.map((effort, i) => (
                                                    <div key={i} className="bg-gray-50 rounded-lg p-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-red-100">{effort.roleName || 'Role'}</Badge>
                                                            <div className="text-right">
                                                                <div className="text-xs font-bold text-gray-900">{effort.fulfilledPercent}% fulfilled</div>
                                                                <div className="text-[10px] text-gray-400 font-medium">{effort.originalHeadcount} required</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 tabular-nums flex justify-between">
                                                            <span>{effort.startDate} to {effort.endDate}</span>
                                                            <span>{effort.hoursPerDay}h/day</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No requirements message */}
                                    {(!selectedProject.skillRequirements || selectedProject.skillRequirements.length === 0) &&
                                        (!selectedProject.roleEfforts || selectedProject.roleEfforts.length === 0) &&
                                        !selectedProject.businessGoal && (
                                            <p className="text-xs text-gray-400 italic">No requirements defined for this project</p>
                                        )}
                                </div>
                            ) : null}
                        </Section>
                    )}

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">Ranking Logic</h4>
                        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Skill match (project skill requirements)</li>
                            <li>Role effort gaps (unfilled job roles on project)</li>
                            <li>Availability over project dates</li>
                            <li>Experience on matched skills</li>
                        </ol>
                    </div>
                </div>

                {/* Right Column: Ranked Table */}
                <div className="lg:col-span-3">
                    <Section title={`Available Resources (${employeesToShow.length})`} description="Ranked by best match">
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            {rankLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                    <span className="ml-2 text-gray-500">Loading ranked employees...</span>
                                </div>
                            ) : rankError ? (
                                <div className="p-8 text-center text-red-600">
                                    <p>Error: {rankError}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Access / Job role</TableHead>
                                            <TableHead>Skill Match</TableHead>
                                            <TableHead>Current Allocations</TableHead>
                                            <TableHead>Availability</TableHead>
                                            <TableHead>Experience</TableHead>
                                            <TableHead>Match</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(employeesToShow || []).map((emp) => (
                                            <TableRow key={emp.id} className="hover:bg-gray-50 group">
                                                <TableCell>
                                                    <div className="font-medium text-gray-900">{emp.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs space-y-1">
                                                        <div>
                                                            <span className="text-gray-400">Access:</span>{' '}
                                                            <span className="text-gray-700">{emp.role}</span>
                                                        </div>
                                                        {emp.jobRoleName && (
                                                            <div>
                                                                <span className="text-gray-400">Job:</span>{' '}
                                                                <span className="text-gray-800 font-medium">{emp.jobRoleName}</span>
                                                            </div>
                                                        )}
                                                        {emp.suggestedAllocationRoleName && (
                                                            <div>
                                                                <span className="text-gray-400">Suggest:</span>{' '}
                                                                <span className="text-brand-700 font-medium">{emp.suggestedAllocationRoleName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-2 py-1">
                                                        {emp.matchingSkills && emp.matchingSkills.length > 0 ? (
                                                            emp.matchingSkills.map((ms, i) => (
                                                                <div key={i} className="flex items-center gap-2">
                                                                    <Badge variant={emp.factors?.skillMatch ? "default" : "secondary"} className="text-[10px] whitespace-nowrap">
                                                                        {ms.name}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-gray-500 font-medium">{ms.level}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant={emp.factors?.skillMatch ? "default" : "secondary"} className="text-[10px] whitespace-nowrap">
                                                                    {emp.primarySkill}
                                                                </Badge>
                                                                <span className="text-[10px] text-gray-500 font-medium">{emp.skillLevel}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {emp.currentAllocations?.length > 0 ? (
                                                            emp.currentAllocations.map((alloc, i) => (
                                                                <Badge key={i} variant="outline" className="text-[10px] bg-gray-50 border-gray-200 py-0.5 px-1.5 h-auto leading-tight flex flex-col items-start gap-0.5">
                                                                    <span className="font-semibold text-gray-700">{alloc.projectName} ({alloc.percentage}%)</span>
                                                                    <span className="text-[9px] text-gray-400 tabular-nums font-normal">{alloc.startDate} to {alloc.endDate}</span>
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400">Not allocated</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 w-32">
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${emp.availability === 100 ? "bg-green-500" :
                                                                    emp.availability > 0 ? "bg-yellow-500" : "bg-red-500"
                                                                    }`}
                                                                style={{ width: `${emp.availability}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium w-8">{emp.availability}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">{emp.experienceYears} yrs</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-medium">{Math.round((emp.matchScore ?? 0) * 100)}%</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs justify-start px-1"
                                                            onClick={() => handleExplain(emp.id)}
                                                        >
                                                            <HelpCircle className="w-3 h-3 mr-1" />
                                                            Why?
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <RoleGuard allowedRoles={["Admin"]}>
                                                        {emp.isAllocatedToProject ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleEdit(emp)}
                                                                className="text-xs"
                                                            >
                                                                Edit
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                disabled={emp.availability === 0}
                                                                onClick={() => handleAllocate(emp)}
                                                                className={emp.availability === 0 ? "opacity-50" : ""}
                                                            >
                                                                <UserPlus className="w-4 h-4 mr-1.5" />
                                                                Allocate
                                                            </Button>
                                                        )}
                                                    </RoleGuard>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </Section>
                </div>
            </div>

            <AllocationExplainPanel
                explanation={explanation}
                loading={explainLoading}
                onClose={() => setExplanation(null)}
            />

            <AllocationDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                employeeId={selectedEmployee?.id || ""}
                employeeName={selectedEmployee?.name || ""}
                projectId={selectedProjectId || ""}
                projectName={selectedProjectName}
                skillRequirements={selectedProject?.skillRequirements}
                roleEfforts={selectedProject?.roleEfforts}
                suggestedAllocationRoleId={selectedEmployee?.suggestedAllocationRoleId}
                suggestedAllocationRoleName={selectedEmployee?.suggestedAllocationRoleName}
                allocationId={editingAllocation?.id}
                initialPercentage={editingAllocation?.percentage}
                initialStartDate={editingAllocation?.startDate}
                initialEndDate={editingAllocation?.endDate}
                initialSkillId={editingAllocation?.skillId}
                initialRoleId={editingAllocation?.roleId}
                onSuccess={handleAllocationSuccess}
            />
        </PageContainer>
    )
}
