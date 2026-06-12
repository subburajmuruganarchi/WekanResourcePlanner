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
import { useSkills } from "@/lib/use-skills"
import { useRoles } from "@/lib/use-roles"
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react"
import type { CreateProjectRequest, SkillRequirement, RoleEffort, SkillLevel, ProjectStatus, BillingType, DeliveryModel, Project } from "@/types/api"
import { normalizeRoleName } from "@/lib/role-utils"

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
    const { skills } = useSkills()
    const { roles } = useRoles()

    const projectManagerOptions = useMemo(
        () =>
            (employees || []).filter((emp) => {
                const accessRole = normalizeRoleName(emp.role || '')
                return accessRole === 'Project Manager' || accessRole === 'Admin'
            }),
        [employees]
    )

    const isEdit = !!project

    // Form State
    const [formData, setFormData] = useState<Partial<CreateProjectRequest>>({
        status: 'Active',
        priority: 'Medium',
        billingType: 'Billable',
        deliveryModel: 'T&M',
        skillRequirements: [],
        roleEfforts: []
    })

    useEffect(() => {
        if (project && open) {
            setFormData({
                name: project.name,
                code: project.code,
                ownerId: project.ownerId || '',
                managerId: project.managerId || '',
                status: project.status as ProjectStatus,
                startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
                endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
                priority: project.priority,
                billingType: project.billingType as BillingType,
                deliveryModel: project.deliveryModel as DeliveryModel,
                skillRequirements: project.skillRequirements || [],
                roleEfforts: project.roleEfforts || []
            })
        } else if (!project && open) {
            // Reset for create mode
            setFormData({
                status: 'Active',
                priority: 'Medium',
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
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const addSkill = () => {
        setFormData(prev => ({
            ...prev,
            skillRequirements: [
                ...(prev.skillRequirements || []),
                {
                    skillId: '',
                    minSkillLevel: 'Intermediate',
                    originalHeadcount: 1,
                    startDate: prev.startDate || '',
                    endDate: prev.endDate || ''
                }
            ]
        }))
    }

    const removeSkill = (index: number) => {
        setFormData(prev => ({
            ...prev,
            skillRequirements: prev.skillRequirements?.filter((_, i) => i !== index)
        }))
    }

    const updateSkill = (index: number, field: keyof SkillRequirement, value: any) => {
        setFormData(prev => ({
            ...prev,
            skillRequirements: prev.skillRequirements?.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }))
    }

    const addRoleEffort = () => {
        setFormData(prev => ({
            ...prev,
            roleEfforts: [
                ...(prev.roleEfforts || []),
                {
                    roleId: '',
                    originalHeadcount: 1,
                    startDate: prev.startDate || '',
                    endDate: prev.endDate || '',
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
            if (!formData.name || !formData.code || !formData.ownerId || !formData.managerId || !formData.startDate || !formData.endDate) {
                throw new Error("Please fill in all required fields in the General tab (including Project Manager).")
            }
            if (!formData.skillRequirements || formData.skillRequirements.length === 0) {
                throw new Error("At least one skill requirement is needed.")
            }
            if (formData.skillRequirements.some(s => !s.skillId)) {
                throw new Error("Please select a skill for all skill requirements.")
            }

            if (isEdit && project) {
                await updateProject(project.id, formData as CreateProjectRequest)
            } else {
                await createProject(formData as CreateProjectRequest)
            }

            setOpen(false)
            if (!isEdit) {
                setFormData({
                    status: 'Active',
                    priority: 'Medium',
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
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="general">General Info</TabsTrigger>
                            <TabsTrigger value="skills">Skill Requirements ({formData.skillRequirements?.length || 0})</TabsTrigger>
                            <TabsTrigger value="roles">Role Efforts ({formData.roleEfforts?.length || 0})</TabsTrigger>
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
                                <div className="space-y-2">
                                    <Label>Project Code *</Label>
                                    <Input
                                        value={formData.code || ''}
                                        onChange={e => updateField('code', e.target.value)}
                                        placeholder="e.g. PRJ-001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Owner *</Label>
                                    <Select
                                        value={formData.ownerId}
                                        onValueChange={v => updateField('ownerId', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select Owner" /></SelectTrigger>
                                        <SelectContent>
                                            {(employees || []).map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                            ))}
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
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v: ProjectStatus) => updateField('status', v)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Planning">Planning</SelectItem>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                            <SelectItem value="OnHold">On Hold</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Start Date *</Label>
                                    <Input
                                        type="date"
                                        value={formData.startDate || ''}
                                        onChange={e => updateField('startDate', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date *</Label>
                                    <Input
                                        type="date"
                                        value={formData.endDate || ''}
                                        onChange={e => updateField('endDate', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Billing Type</Label>
                                    <Select
                                        value={formData.billingType}
                                        onValueChange={(v: BillingType) => updateField('billingType', v)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Billable">Billable</SelectItem>
                                            <SelectItem value="Non-billable">Non-billable</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Delivery Model</Label>
                                    <Select
                                        value={formData.deliveryModel}
                                        onValueChange={(v: DeliveryModel) => updateField('deliveryModel', v)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Fixed">Fixed</SelectItem>
                                            <SelectItem value="T&M">T&M</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        {/* SKILLS TAB */}
                        <TabsContent value="skills" className="space-y-4 py-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-medium">Required Skills</h3>
                                <p className="text-[10px] text-gray-500">Project window: {formData.startDate} to {formData.endDate}</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                                <Plus className="w-4 h-4 mr-2" /> Add Skill
                            </Button>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {formData.skillRequirements?.map((skill, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-lg bg-gray-50">
                                        <div className="col-span-3 space-y-1">
                                            <Label className="text-xs">Skill</Label>
                                            <Select
                                                value={skill.skillId}
                                                onValueChange={v => updateSkill(index, 'skillId', v)}
                                            >
                                                <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    {(skills || []).map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Min Level</Label>
                                            <Select
                                                value={skill.minSkillLevel}
                                                onValueChange={(v: SkillLevel) => updateSkill(index, 'minSkillLevel', v)}
                                            >
                                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Beginner">Beginner</SelectItem>
                                                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                                                    <SelectItem value="Expert">Expert</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Start Date</Label>
                                            <Input
                                                type="date"
                                                className="h-8 text-[11px] px-2"
                                                value={skill.startDate}
                                                min={formData.startDate}
                                                max={formData.endDate}
                                                onChange={e => updateSkill(index, 'startDate', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">End Date</Label>
                                            <Input
                                                type="date"
                                                className="h-8 text-[11px] px-2"
                                                value={skill.endDate}
                                                min={skill.startDate || formData.startDate}
                                                max={formData.endDate}
                                                onChange={e => updateSkill(index, 'endDate', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-end pb-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeSkill(index)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {formData.skillRequirements?.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                                        No skills added. Click "Add Skill" to define requirements.
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* ROLES TAB */}
                        <TabsContent value="roles" className="space-y-4 py-4">
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium">Role Efforts (Optional)</h3>
                                    <p className="text-[10px] text-gray-500">Project window: {formData.startDate} to {formData.endDate}</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addRoleEffort}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Role
                                </Button>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {formData.roleEfforts?.map((effort, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-lg bg-gray-50">
                                        <div className="col-span-4 space-y-1">
                                            <Label className="text-xs">Role</Label>
                                            <Select
                                                value={effort.roleId}
                                                onValueChange={v => updateRoleEffort(index, 'roleId', v)}
                                            >
                                                <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    {(roles || []).map(r => (
                                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Count</Label>
                                            <Input
                                                type="number"
                                                className="h-8"
                                                min={1}
                                                value={effort.originalHeadcount}
                                                onChange={e => updateRoleEffort(index, 'originalHeadcount', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Start Date</Label>
                                            <Input
                                                type="date"
                                                className="h-8 text-[11px] px-2"
                                                value={effort.startDate}
                                                min={formData.startDate}
                                                max={formData.endDate}
                                                onChange={e => updateRoleEffort(index, 'startDate', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">End Date</Label>
                                            <Input
                                                type="date"
                                                className="h-8 text-[11px] px-2"
                                                value={effort.endDate}
                                                min={effort.startDate || formData.startDate}
                                                max={formData.endDate}
                                                onChange={e => updateRoleEffort(index, 'endDate', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Hours/Day</Label>
                                            <Input
                                                type="number"
                                                className="h-8"
                                                min={1} max={24}
                                                value={effort.hoursPerDay}
                                                onChange={e => updateRoleEffort(index, 'hoursPerDay', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-end pb-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeRoleEffort(index)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {formData.roleEfforts?.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                                        No role efforts defined.
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
