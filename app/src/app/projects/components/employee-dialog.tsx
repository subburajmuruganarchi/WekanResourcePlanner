import { useState, useEffect } from "react"
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
import { useEmployees } from "@/lib/use-employees"
import { useRoles } from "@/lib/use-roles"
import { useSkills } from "@/lib/use-skills"
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react"
import type { SkillLevel, EmployeeStatus, EmployeeDepartment, EmployeeRole, Employee } from "@/types/api"

interface SkillEntry {
    skillId: string;
    skillType: 'Primary' | 'Secondary';
    level: SkillLevel;
    experienceYears: number;
}

interface EmployeeDialogProps {
    employee?: Employee;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function EmployeeDialog({ employee, open: controlledOpen, onOpenChange }: EmployeeDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = onOpenChange || setInternalOpen

    const [loading, setLoading] = useState(false)
    const { createEmployee, updateEmployee } = useEmployees()
    const { roles } = useRoles()
    const { skills: availableSkills } = useSkills()

    const isEdit = !!employee

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        employeeCode: '',
        status: 'Active' as EmployeeStatus,
        roleId: '',
        department: '' as EmployeeDepartment | '',
        designation: '' as EmployeeRole | '',
        maxAllocationPercent: 100,
        joiningDate: ''
    })

    const [selectedSkills, setSelectedSkills] = useState<SkillEntry[]>([
        { skillId: '', skillType: 'Primary', level: 'Beginner', experienceYears: 0 }
    ])

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (employee && open) {
            // Populate form for edit
            const names = employee.name.split(' ')
            setFormData({
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
                email: employee.email,
                employeeCode: employee.employeeCode || '',
                status: employee.status as EmployeeStatus,
                roleId: employee.roleId || roles?.find(r => r.name === employee.role)?.id || '',
                department: employee.department as EmployeeDepartment || '',
                designation: employee.position as EmployeeRole || '',
                maxAllocationPercent: employee.maxAllocationPercent || 100,
                joiningDate: employee.joinDate || ''
            })

            if (employee.skills && employee.skills.length > 0) {
                const mappedSkills = employee.skills.map(s => {
                    const skillObj = availableSkills?.find(as => as.name === s.name)
                    return {
                        skillId: skillObj?.id || '',
                        skillType: (s.isPrimary ? 'Primary' : 'Secondary') as 'Primary' | 'Secondary',
                        level: s.skillLevel as SkillLevel,
                        experienceYears: s.yearsOfExperience
                    }
                })
                setSelectedSkills(mappedSkills)
            } else {
                setSelectedSkills([{ skillId: '', skillType: 'Primary', level: 'Beginner', experienceYears: 0 }])
            }

        } else if (!employee && open) {
            // Reset for create
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                employeeCode: '',
                status: 'Active',
                roleId: '',
                department: '',
                designation: '',
                maxAllocationPercent: 100,
                joiningDate: ''
            })
            setSelectedSkills([{ skillId: '', skillType: 'Primary', level: 'Beginner', experienceYears: 0 }])
        }
    }, [employee, open, roles, availableSkills])

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleAddSkill = () => {
        setSelectedSkills([...selectedSkills, { skillId: '', skillType: 'Secondary', level: 'Beginner', experienceYears: 0 }])
    }

    const handleRemoveSkill = (index: number) => {
        setSelectedSkills(selectedSkills.filter((_, i) => i !== index))
    }

    const updateSkill = (index: number, field: keyof SkillEntry, value: any) => {
        const newSkills = [...selectedSkills]
        newSkills[index] = { ...newSkills[index], [field]: value }
        setSelectedSkills(newSkills)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const data = {
            ...formData,
            department: formData.department || undefined,
            designation: formData.designation || undefined,
            joiningDate: formData.joiningDate || undefined,
            skills: selectedSkills.filter(s => s.skillId !== '')
        }

        try {
            if (isEdit && employee) {
                await updateEmployee(employee.id, data as any)
            } else {
                await createEmployee(data as any)
            }

            setOpen(false)
            if (!isEdit) {
                // Reset form only on create success
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    employeeCode: '',
                    status: 'Active',
                    roleId: '',
                    department: '',
                    designation: '',
                    maxAllocationPercent: 100,
                    joiningDate: ''
                })
                setSelectedSkills([{ skillId: '', skillType: 'Primary', level: 'Beginner', experienceYears: 0 }])
            }
        } catch (error: any) {
            console.error("Failed to save employee:", error)
            setError(error.message || "Failed to save employee")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {controlledOpen === undefined && (
                <DialogTrigger asChild>
                    <Button className="bg-brand-500 hover:bg-brand-600">Add Employee</Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                        <DialogDescription>
                            {isEdit ? 'Update employee details.' : 'Enter the details of the new employee.'}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input id="firstName" value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input id="lastName" value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="employeeCode">Employee Code *</Label>
                            <Input id="employeeCode" value={formData.employeeCode} onChange={e => updateField('employeeCode', e.target.value)} placeholder="EMP-001" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select value={formData.status} onValueChange={v => updateField('status', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                    <SelectItem value="On Probation">On Probation</SelectItem>
                                    <SelectItem value="On Notice Period">On Notice Period</SelectItem>
                                    <SelectItem value="Terminated">Terminated</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roleId">Type *</Label>
                            <Select value={formData.roleId} onValueChange={v => updateField('roleId', v)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(roles || []).map(role => (
                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Select value={formData.department} onValueChange={v => updateField('department', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Engineering">Engineering</SelectItem>
                                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                                    <SelectItem value="Product Management">Product Management</SelectItem>
                                    <SelectItem value="Quality Assurance">Quality Assurance</SelectItem>
                                    <SelectItem value="Design">Design</SelectItem>
                                    <SelectItem value="DevOps / Infrastructure">DevOps / Infrastructure</SelectItem>
                                    <SelectItem value="Data & Analytics">Data & Analytics</SelectItem>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="Customer Support">Customer Support</SelectItem>
                                    <SelectItem value="Finance">Finance</SelectItem>
                                    <SelectItem value="Operations">Operations</SelectItem>
                                    <SelectItem value="Administration">Administration</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="designation">Role</Label>
                            <Select value={formData.designation} onValueChange={v => updateField('designation', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Architect">Architect</SelectItem>
                                    <SelectItem value="Mobile Architect">Mobile Architect</SelectItem>
                                    <SelectItem value="Associate Architect">Associate Architect</SelectItem>
                                    <SelectItem value="SDE III (Full Stack)">SDE III (Full Stack)</SelectItem>
                                    <SelectItem value="SDE (Full Stack)">SDE (Full Stack)</SelectItem>
                                    <SelectItem value="SDE II (Full Stack)">SDE II (Full Stack)</SelectItem>
                                    <SelectItem value="SDE (Backend)">SDE (Backend)</SelectItem>
                                    <SelectItem value="SDE II (Backend)">SDE II (Backend)</SelectItem>
                                    <SelectItem value="SDE II (Frontend)">SDE II (Frontend)</SelectItem>
                                    <SelectItem value="SDE III (Mobile)">SDE III (Mobile)</SelectItem>
                                    <SelectItem value="SDE II (Mobile)">SDE II (Mobile)</SelectItem>
                                    <SelectItem value="QA Engineer">QA Engineer</SelectItem>
                                    <SelectItem value="DBA">DBA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxAllocationPercent">Max Allocation %</Label>
                            <Input id="maxAllocationPercent" type="number" value={formData.maxAllocationPercent} onChange={e => updateField('maxAllocationPercent', parseInt(e.target.value))} min={1} max={100} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="joiningDate">Joining Date</Label>
                            <Input id="joiningDate" type="date" value={formData.joiningDate} onChange={e => updateField('joiningDate', e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Skills *</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddSkill}>
                                <Plus className="h-4 w-4 mr-1" /> Add Skill
                            </Button>
                        </div>

                        {selectedSkills.map((entry, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md bg-gray-50">
                                <div className="col-span-4 space-y-1">
                                    <Label className="text-xs">Skill</Label>
                                    <Select
                                        value={entry.skillId}
                                        onValueChange={(val) => updateSkill(index, 'skillId', val)}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select skill" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(availableSkills || []).map(skill => (
                                                <SelectItem key={skill.id} value={skill.id} disabled={selectedSkills.some((s, i) => s.skillId === skill.id && i !== index)}>
                                                    {skill.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <Label className="text-xs">Type</Label>
                                    <Select
                                        value={entry.skillType}
                                        onValueChange={(val) => updateSkill(index, 'skillType', val)}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Primary">Primary</SelectItem>
                                            <SelectItem value="Secondary">Secondary</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <Label className="text-xs">Level</Label>
                                    <Select
                                        value={entry.level}
                                        onValueChange={(val: SkillLevel) => updateSkill(index, 'level', val)}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Beginner">Beginner</SelectItem>
                                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                                            <SelectItem value="Expert">Expert</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-1">
                                    {selectedSkills.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-500"
                                            onClick={() => handleRemoveSkill(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading || !selectedSkills.some(s => s.skillType === 'Primary' && s.skillId !== '')}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Update Employee' : 'Create Employee'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
