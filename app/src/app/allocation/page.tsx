import { useState, useMemo, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { Section } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AllocationDialog } from "./components/allocation-dialog"
import { AvailableResourceCards } from "./components/available-resource-cards"
import { ProjectManagerAssignment } from "./components/project-manager-assignment"
import { useRankedEmployees, type RankedEmployee } from "@/lib/use-ranked-employees"
import { useProjects, useProject } from "@/lib/use-projects"
import { useAuth } from "@/lib/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function Allocation() {
    const { user } = useAuth()
    const canEditPm = user?.role === 'Admin'
    const { projects, loading: projLoading, refetch: refetchProjects } = useProjects()
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
    const { project: selectedProject, loading: projectDetailsLoading, refetch: refetchProject } = useProject(selectedProjectId)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<RankedEmployee | null>(null)
    const [editingAllocation, setEditingAllocation] = useState<{
        id: string; percentage: number; startDate: string; endDate: string; skillId?: string; skillIds?: string[]; roleId?: string
    } | null>(null)
    const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | undefined>()

    useEffect(() => {
        setSelectedSkillFilter(undefined)
    }, [selectedProjectId])

    const listProject = useMemo(
        () => projects.find((p) => p.id === selectedProjectId),
        [projects, selectedProjectId]
    )

    const activeProject = useMemo(() => {
        if (selectedProject?.id === selectedProjectId) return selectedProject
        return listProject ?? null
    }, [selectedProject, selectedProjectId, listProject])

    const detailProject = selectedProject?.id === selectedProjectId ? selectedProject : null

    const rankedParams = useMemo(() => ({
        projectId: selectedProjectId,
        skill: selectedSkillFilter,
        startDate: activeProject?.startDate,
        endDate: activeProject?.endDate,
    }), [selectedProjectId, selectedSkillFilter, activeProject?.startDate, activeProject?.endDate])

    const { rankedEmployees, loading: rankLoading, error: rankError, refetch: refetchRanked } = useRankedEmployees(rankedParams)

    const handleAllocationSuccess = () => {
        refetchRanked()
        refetchProject()
    }

    const handlePmUpdated = () => {
        refetchProject()
        refetchProjects()
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
                skillIds: projectAlloc.skillIds?.length
                    ? projectAlloc.skillIds
                    : projectAlloc.skillId
                      ? [projectAlloc.skillId]
                      : undefined,
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

            {/* Project + PM toolbar */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div
                    className={
                        selectedProjectId && activeProject
                            ? canEditPm
                                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto_auto]'
                                : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto]'
                            : 'max-w-xl'
                    }
                >
                    <div className="space-y-2 min-w-0">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Select project
                        </label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 text-sm font-medium">
                                <SelectValue placeholder="Choose a project…" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                                {projLoading ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                                    </div>
                                ) : (
                                    (projects || []).map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            <span className="flex items-center gap-2">
                                                <span>{project.name}</span>
                                                <span className="font-mono text-[10px] text-gray-400">
                                                    {project.code}
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedProjectId && activeProject && (
                        <>
                            <ProjectManagerAssignment
                                key={selectedProjectId}
                                projectId={selectedProjectId}
                                managerId={activeProject.managerId}
                                managerName={activeProject.managerName}
                                readOnly={!canEditPm}
                                onUpdated={handlePmUpdated}
                            />
                            <div className="space-y-2 min-w-0">
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Status
                                </label>
                                <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700">
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${
                                            activeProject.status === 'Active'
                                                ? 'bg-green-500'
                                                : activeProject.status === 'Planning'
                                                  ? 'bg-amber-500'
                                                  : 'bg-gray-400'
                                        }`}
                                    />
                                    {activeProject.status || 'Active'}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {selectedProjectId && (
                <div className="space-y-6">
                    {/* Project Requirements */}
                    <Section title="Project Requirements">
                        {projectDetailsLoading ? (
                            <div className="flex items-center justify-center p-8 bg-white border border-gray-200 rounded-xl">
                                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                            </div>
                        ) : detailProject ? (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                                {(detailProject.businessGoal || detailProject.staffingStrategy) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                                        {detailProject.businessGoal && (
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Business Goal</label>
                                                <p className="text-sm text-gray-700">{detailProject.businessGoal}</p>
                                            </div>
                                        )}
                                        {detailProject.staffingStrategy && (
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Staffing Strategy</label>
                                                <Badge variant="outline" className="text-xs">{detailProject.staffingStrategy}</Badge>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Required Skills — primary driver for resource matching */}
                                <div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required Skills</label>
                                        {selectedSkillFilter && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => setSelectedSkillFilter(undefined)}
                                            >
                                                Show all matching skills
                                            </Button>
                                        )}
                                    </div>
                                    {detailProject.skillRequirements && detailProject.skillRequirements.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {detailProject.skillRequirements.map((req) => {
                                                const skillLabel = req.skillName || 'Skill';
                                                const isActive = selectedSkillFilter === skillLabel;
                                                return (
                                                    <button
                                                        key={req.skillId}
                                                        type="button"
                                                        onClick={() => setSelectedSkillFilter(isActive ? undefined : skillLabel)}
                                                        className={`text-left bg-gray-50 rounded-lg p-3 border transition-colors ${
                                                            isActive
                                                                ? 'border-brand-500 ring-2 ring-brand-100 bg-brand-50/50'
                                                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-100/80'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <Badge variant="default" className="text-[10px] bg-brand-600 hover:bg-brand-700 border-none">
                                                                {skillLabel}
                                                            </Badge>
                                                            <span className="text-xs text-gray-400 font-medium">{req.minSkillLevel}+</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                                                            <span>{req.originalHeadcount} needed · {req.fulfilledPercent}% filled</span>
                                                            {req.roleName && <span>{req.roleName}</span>}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 tabular-nums mt-1">
                                                            {req.startDate} to {req.endDate}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                                            No skill requirements defined for this project. Add tech skills under Projects to filter available resources by skill match.
                                        </p>
                                    )}
                                    {detailProject.skillRequirements && detailProject.skillRequirements.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            {selectedSkillFilter
                                                ? `Showing resources matching "${selectedSkillFilter}". Click the skill again or use "Show all matching skills" to reset.`
                                                : 'Available resources below are filtered to employees who match at least one required skill. Click a skill to narrow the list.'}
                                        </p>
                                    )}
                                </div>

                                {/* Role Efforts — headcount by job role */}
                                {detailProject.roleEfforts && detailProject.roleEfforts.length > 0 && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Role Headcount</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {detailProject.roleEfforts.map((effort) => (
                                                <div key={effort.roleId} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <Badge variant="secondary" className="text-[10px] bg-gray-200 text-gray-800 border-none">
                                                            {effort.roleName || 'Role'}
                                                        </Badge>
                                                        <span className="text-xs font-bold text-gray-900">{effort.fulfilledPercent}% filled</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 tabular-nums flex justify-between">
                                                        <span>{effort.originalHeadcount} required</span>
                                                        <span>{effort.hoursPerDay}h/day · {effort.startDate} to {effort.endDate}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </Section>

                    {/* Ranking Logic hint */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">Ranking Logic</h4>
                        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Skill match (project skill requirements)</li>
                            <li>Role effort gaps (unfilled job roles on project)</li>
                            <li>Free capacity over project dates (all active projects)</li>
                            <li>Experience on matched skills</li>
                        </ol>
                        <p className="text-xs text-blue-800/90 mt-3 pt-3 border-t border-blue-200 leading-relaxed">
                            <strong>Free capacity</strong> includes every <strong>active</strong> allocation on
                            other projects whose dates overlap this project&apos;s window. When someone is
                            released from another project (end date passed or allocation updated), refresh
                            the list or re-select the project to see updated availability.
                        </p>
                    </div>

                    {/* Available Resources */}
                    <Section
                        title={`Available Resources (${employeesToShow.length})`}
                        description={
                            detailProject?.skillRequirements?.length
                                ? selectedSkillFilter
                                    ? `Employees matching "${selectedSkillFilter}", ranked by best fit.`
                                    : 'Employees matching at least one required skill, ranked by best fit.'
                                : 'Ranked by best match. Peak load = busiest day across all overlapping projects.'
                        }
                    >
                        {rankLoading ? (
                            <div className="flex items-center justify-center p-8 bg-white border border-gray-200 rounded-xl">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                <span className="ml-2 text-gray-500">Loading ranked employees...</span>
                            </div>
                        ) : rankError ? (
                            <div className="p-8 text-center text-red-600 bg-white border border-gray-200 rounded-xl">
                                <p>Error: {rankError}</p>
                            </div>
                        ) : employeesToShow.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">
                                <p className="text-sm font-medium text-gray-700">No matching resources found</p>
                                <p className="text-xs mt-1">
                                    {detailProject?.skillRequirements?.length
                                        ? 'No employees match the selected skill requirements. Try another skill or update project requirements.'
                                        : 'Select a project with skill requirements to see ranked matches.'}
                                </p>
                            </div>
                        ) : (
                            <AvailableResourceCards
                                employees={employeesToShow}
                                selectedProjectId={selectedProjectId}
                                onAllocate={handleAllocate}
                                onEdit={handleEdit}
                            />
                        )}
                    </Section>
                </div>
            )}

            <AllocationDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                employeeId={selectedEmployee?.id || ""}
                employeeName={selectedEmployee?.name || ""}
                projectId={selectedProjectId || ""}
                projectName={selectedProjectName}
                skillRequirements={detailProject?.skillRequirements}
                roleEfforts={detailProject?.roleEfforts}
                suggestedAllocationRoleId={selectedEmployee?.suggestedAllocationRoleId}
                suggestedAllocationRoleName={selectedEmployee?.suggestedAllocationRoleName}
                projectStartDate={activeProject?.startDate}
                projectEndDate={activeProject?.endDate}
                allocationId={editingAllocation?.id}
                initialPercentage={editingAllocation?.percentage}
                initialStartDate={editingAllocation?.startDate}
                initialEndDate={editingAllocation?.endDate}
                initialSkillId={editingAllocation?.skillId}
                initialSkillIds={editingAllocation?.skillIds}
                initialRoleId={editingAllocation?.roleId}
                onSuccess={handleAllocationSuccess}
            />
        </PageContainer>
    )
}
