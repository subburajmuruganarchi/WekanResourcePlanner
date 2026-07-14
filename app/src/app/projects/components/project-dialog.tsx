import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProjects } from "@/lib/use-projects"
import { useEmployees } from "@/lib/use-employees"
import { isActiveRosterMember } from "@/lib/employee-status"
import { useRoles } from "@/lib/use-roles"
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react"
import type { CreateProjectRequest, RoleEffort, ProjectStatus, BillingType, Project } from "@/types/api"
import { PROJECT_STATUS_OPTIONS } from "@/lib/project-status"
import { normalizeRoleName } from "@/lib/role-utils"
import { ROLES } from "@/lib/roles"
import { projectTypeLabel } from "@/lib/project-type-label"

/** Job titles eligible to appear in the Project Manager picker. */
const PROJECT_MANAGER_JOB_ROLES = new Set([
    'Program Manager',
    'Senior Project Manager',
    'Project Manager',
    'Associate Project Manager',
])

/** Job titles eligible to appear in the Delivery Manager picker. */
const DELIVERY_MANAGER_JOB_ROLES = new Set([
    'Program Delivery Manager',
    'Senior Delivery Manager',
    'Delivery Manager',
    'Associate Delivery Manager',
])

function employeeJobTitle(emp: { jobRole?: string; position?: string }): string {
    return (emp.jobRole || emp.position || '').trim()
}

function isProjectManagerCandidate(emp: {
    role?: string
    jobRole?: string
    position?: string
}): boolean {
    const accessRole = normalizeRoleName(emp.role || '')
    if (accessRole === ROLES.PROJECT_MANAGER || accessRole === ROLES.ADMIN) return true
    return PROJECT_MANAGER_JOB_ROLES.has(employeeJobTitle(emp))
}

function isDeliveryManagerCandidate(emp: {
    role?: string
    jobRole?: string
    position?: string
}): boolean {
    const accessRole = normalizeRoleName(emp.role || '')
    if (accessRole === ROLES.DELIVERY_MANAGER || accessRole === ROLES.ADMIN) return true
    return DELIVERY_MANAGER_JOB_ROLES.has(employeeJobTitle(emp))
}

interface ProjectDialogProps {
    project?: Project;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ProjectDialog({ project, open: controlledOpen, onOpenChange }: ProjectDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = onOpenChange || setInternalOpen

    const [loading, setLoading] = useState(false)
    const { createProject, updateProject } = useProjects()
    const { employees } = useEmployees()
    const { roles } = useRoles()

    const projectManagerOptions = useMemo(
        () => (employees || []).filter(isProjectManagerCandidate),
        [employees]
    )

    const deliveryManagerOptions = useMemo(
        () => (employees || []).filter(isDeliveryManagerCandidate),
        [employees]
    )

    const activeEmployees = useMemo(
        () => (employees || []).filter((e) => isActiveRosterMember(e)),
        [employees]
    )

    const isEdit = !!project

    // Form State
    const [formData, setFormData] = useState<Partial<CreateProjectRequest>>({
        status: 'Active',
        priority: 'Medium',
        type: 'Customer',
        billingType: 'Billable',
        deliveryModel: 'T&M',
        skillRequirements: [],
        roleEfforts: []
    })

    useEffect(() => {
        if (project && open) {
            // Prefill the Resources section from the project's actual team (project_allocations),
            // falling back to role efforts so previously-added resources reflect on edit.
            const teamRoleEfforts: RoleEffort[] = (project.teamMembers || []).map((m) => {
                const emp = (employees || []).find((e) => e.id === m.employeeId)
                return {
                    employeeId: m.employeeId,
                    roleId: emp?.jobRoleId || '',
                    roleName: m.roleName,
                    originalHeadcount: 1,
                    startDate: m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : '',
                    endDate: m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : '',
                    hoursPerDay: 8,
                }
            })
            setFormData({
                name: project.name,
                code: project.code,
                ownerId: project.ownerId || '',
                managerId: project.managerId || '',
                managerIds: project.managerIds?.filter((id) => id !== project.managerId) ?? [],
                status: project.status as ProjectStatus,
                startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
                endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
                priority: project.priority,
                type: project.type || projectTypeLabel(project.type, project.billingType),
                billingType: project.billingType as BillingType,
                skillRequirements: project.skillRequirements || [],
                roleEfforts: teamRoleEfforts.length > 0 ? teamRoleEfforts : (project.roleEfforts || [])
            })
        } else if (!project && open) {
            // Reset for create mode
            setFormData({
                status: 'Active',
                priority: 'Medium',
                type: 'Customer',
                billingType: 'Billable',
                deliveryModel: 'T&M',
                skillRequirements: [],
                roleEfforts: []
            })
        }
    }, [project, open])


    const [error, setError] = useState<string | null>(null)

    // Handlers
    const updateField = (field: keyof CreateProjectRequest, value: any) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value }
            if (field === 'type') {
                next.billingType = value === 'Internal' ? 'Non-billable' : 'Billable'
            }
            return next
        })
    }

    const addRoleEffort = () => {
        setFormData(prev => ({
            ...prev,
            roleEfforts: [
                ...(prev.roleEfforts || []),
                {
                    employeeId: '',
                    roleId: '',
                    originalHeadcount: 1,
                    startDate: '',
                    endDate: '',
                    hoursPerDay: 8
                }
            ]
        }))
    }

    const removeRoleEffort = (index: number) => {
        setFormData(prev => ({
            ...prev,
            roleEfforts: prev.roleEfforts?.filter((_, i) => i !== index)
        }))
    }

    const updateRoleEffort = (index: number, field: keyof RoleEffort, value: any) => {
        setFormData(prev => ({
            ...prev,
            roleEfforts: prev.roleEfforts?.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Basic Frontend Validation
            if (!formData.name || !formData.ownerId || !formData.managerId) {
                throw new Error("Please fill in project name, delivery manager, and project manager.")
            }

            const mappedRoleEfforts = (formData.roleEfforts || [])
                .map((effort) => {
                    const emp = (employees || []).find((e) => e.id === effort.employeeId);
                    const roleId = effort.roleId || emp?.jobRoleId || '';
                    if (!roleId) return null;
                    return {
                        ...effort,
                        roleId,
                        originalHeadcount: effort.originalHeadcount || 1,
                        hoursPerDay: effort.hoursPerDay || 8,
                        startDate: effort.startDate || formData.startDate || '',
                        endDate: effort.endDate || formData.endDate || '',
                    };
                })
                .filter(Boolean);

            // Build the real resource assignments (project_allocations) from the selected
            // employees so they reflect in the resource grid and project team.
            const resources = (formData.roleEfforts || [])
                .filter((effort) => !!effort.employeeId)
                .map((effort) => {
                    const emp = (employees || []).find((e) => e.id === effort.employeeId);
                    const roleId = effort.roleId || emp?.jobRoleId || '';
                    return {
                        employeeId: effort.employeeId as string,
                        roleId: roleId || undefined,
                        startDate: effort.startDate || formData.startDate || undefined,
                        endDate: effort.endDate || formData.endDate || undefined,
                    };
                })
                .filter((r) => !!r.roleId);

            const payload = {
                ...formData,
                skillRequirements: [],
                roleEfforts: mappedRoleEfforts,
                resources,
                managerIds: [
                    formData.managerId,
                    ...(formData.managerIds ?? []),
                ].filter(Boolean) as string[],
            }

            if (isEdit && project) {
                await updateProject(project.id, payload as CreateProjectRequest)
            } else {
                await createProject(payload as CreateProjectRequest)
            }

            setOpen(false)
            if (!isEdit) {
                setFormData({
                    status: 'Active',
                    priority: 'Medium',
                    type: 'Customer',
                    billingType: 'Billable',
                    deliveryModel: 'T&M',
                    skillRequirements: [],
                    roleEfforts: []
                })
            }
        } catch (err: any) {
            setError(err.message || "Failed to save project")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {controlledOpen === undefined && (
                <DialogTrigger asChild>
                    <Button className="bg-brand-500 hover:bg-brand-600">Add Project</Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit Project' : 'Add New Project'}</DialogTitle>
                        <DialogDescription>
                            {isEdit ? 'Update project details and resource requirements.' : 'Create a new project with resource requirements.'}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 mt-4 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <Tabs defaultValue="general" className="mt-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="general">General Info</TabsTrigger>
                            <TabsTrigger value="roles">Resources ({formData.roleEfforts?.length || 0})</TabsTrigger>
                        </TabsList>

                        {/* GENERAL TAB */}
                        <TabsContent value="general" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Project Name *</Label>
                                    <Input
                                        value={formData.name || ''}
                                        onChange={e => updateField('name', e.target.value)}
                                        placeholder="e.g. Apollo Redesign"
                                    />
                                </div>
                                {isEdit && (
                                    <div className="space-y-2">
                                        <Label>Project Code</Label>
                                        <Input value={formData.code || ''} disabled className="bg-gray-50" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Delivery Manager *</Label>
                                    <Select
                                        value={formData.ownerId}
                                        onValueChange={v => updateField('ownerId', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select delivery manager" /></SelectTrigger>
                                        <SelectContent>
                                            {deliveryManagerOptions.length > 0 ? (
                                                deliveryManagerOptions.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                                ))
                                            ) : (
                                                <div className="px-2 py-1.5 text-xs text-gray-500">No delivery managers found</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Project Manager *</Label>
                                    <Select
                                        value={formData.managerId}
                                        onValueChange={v => updateField('managerId', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select Project Manager" /></SelectTrigger>
                                        <SelectContent>
                                            {projectManagerOptions.length > 0 ? (
                                                projectManagerOptions.map((emp) => (
                                                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                                ))
                                            ) : (
                                                (employees || []).map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Additional Project Managers</Label>
                                    <div className="flex flex-wrap gap-3 border rounded-md p-3 max-h-32 overflow-y-auto">
                                        {projectManagerOptions
                                            .filter((emp) => emp.id !== formData.managerId)
                                            .map((emp) => {
                                                const checked = (formData.managerIds ?? []).includes(emp.id)
                                                return (
                                                    <label key={emp.id} className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) => {
                                                                const next = new Set(formData.managerIds ?? [])
                                                                if (e.target.checked) next.add(emp.id)
                                                                else next.delete(emp.id)
                                                                updateField('managerIds', [...next])
                                                            }}
                                                        />
                                                        {emp.name}
                                                    </label>
                                                )
                                            })}
                                        {projectManagerOptions.filter((emp) => emp.id !== formData.managerId).length === 0 && (
                                            <span className="text-xs text-gray-500">Select a primary PM first, or add employees with the Project Manager role.</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v: ProjectStatus) => updateField('status', v)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PROJECT_STATUS_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.startDate || ''}
                                        onChange={e => updateField('startDate', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.endDate || ''}
                                        onChange={e => updateField('endDate', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(v) => updateField('priority', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Project Type</Label>
                                    <Select
                                        value={formData.type || 'Customer'}
                                        onValueChange={(v) => updateField('type', v)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Customer">Customer (billable)</SelectItem>
                                            <SelectItem value="Internal">Internal (non-billable)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Billing Type</Label>
                                    <Input
                                        value={formData.billingType || '—'}
                                        disabled
                                        className="bg-gray-50"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* RESOURCES TAB */}
                        <TabsContent value="roles" className="space-y-4 py-4">
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium">Assigned resources</h3>
                                    <p className="text-[10px] text-gray-500">Pick a role first, then choose an employee with that role.</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addRoleEffort}>
                                    <Plus className="w-4 h-4 mr-2" /> Add resource
                                </Button>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {formData.roleEfforts?.map((effort, index) => {
                                    const employeesForRole = activeEmployees.filter(
                                        (e) => !effort.roleId || e.jobRoleId === effort.roleId
                                    )
                                    return (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-lg bg-gray-50">
                                        <div className="col-span-5 space-y-1">
                                            <Label className="text-xs">Role *</Label>
                                            <Select
                                                value={effort.roleId || ''}
                                                onValueChange={v => {
                                                    updateRoleEffort(index, 'roleId', v)
                                                    const emp = activeEmployees.find(e => e.id === effort.employeeId)
                                                    if (emp && emp.jobRoleId !== v) {
                                                        updateRoleEffort(index, 'employeeId', '')
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-8"><SelectValue placeholder="Select role" /></SelectTrigger>
                                                <SelectContent>
                                                    {(roles || []).map(r => (
                                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-6 space-y-1">
                                            <Label className="text-xs">Resource *</Label>
                                            <Select
                                                value={effort.employeeId || ''}
                                                disabled={!effort.roleId}
                                                onValueChange={v => updateRoleEffort(index, 'employeeId', v)}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <SelectValue placeholder={effort.roleId ? 'Select employee' : 'Select a role first'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {employeesForRole.length > 0 ? (
                                                        employeesForRole.map(emp => (
                                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="px-2 py-1.5 text-xs text-gray-500">No employees with this role</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1 flex justify-end pb-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeRoleEffort(index)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    )
                                })}
                                {formData.roleEfforts?.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                                        No resources assigned yet. Use “Add resource” to staff this project.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Update Project' : 'Create Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
