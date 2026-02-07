import { useState } from "react"
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
import { Loader2, Plus, Trash2 } from "lucide-react"
import type { SkillLevel } from "@/types/api"

interface SkillEntry {
    skillId: string;
    skillType: 'Primary' | 'Secondary';
    level: SkillLevel;
    experienceYears: number;
}

export function EmployeeDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { createEmployee } = useEmployees()
    const { roles } = useRoles()
    const { skills: availableSkills } = useSkills()

    const [selectedSkills, setSelectedSkills] = useState<SkillEntry[]>([
        { skillId: '', skillType: 'Primary', level: 'Beginner', experienceYears: 0 }
    ])

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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const data = {
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            email: formData.get("email") as string,
            employeeCode: formData.get("employeeCode") as string,
            status: formData.get("status") as 'Active' | 'Inactive',
            roleId: formData.get("roleId") as string,
            department: formData.get("department") as string || undefined,
            designation: formData.get("designation") as string || undefined,
            maxAllocationPercent: Number(formData.get("maxAllocationPercent")),
            joiningDate: (formData.get("joiningDate") as string) || undefined,
            skills: selectedSkills.filter(s => s.skillId !== '')
        }

        try {
            await createEmployee(data as any)
            setOpen(false)
            // Reset form
            setSelectedSkills([{ skillId: '', skillType: 'Primary', level: 'Beginner', experienceYears: 0 }])
        } catch (error) {
            console.error("Failed to create employee:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-brand-500 hover:bg-brand-600">Add Employee</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>Add New Employee</DialogTitle>
                        <DialogDescription>
                            Enter the details of the new employee according to the authoritative spec.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input id="firstName" name="firstName" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input id="lastName" name="lastName" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" name="email" type="email" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="employeeCode">Employee Code *</Label>
                            <Input id="employeeCode" name="employeeCode" placeholder="EMP-001" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select name="status" defaultValue="Active">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roleId">Role *</Label>
                            <Select name="roleId" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
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
                            <Input id="department" name="department" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="designation">Designation</Label>
                            <Input id="designation" name="designation" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxAllocationPercent">Max Allocation %</Label>
                            <Input id="maxAllocationPercent" name="maxAllocationPercent" type="number" defaultValue={100} min={1} max={100} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="joiningDate">Joining Date</Label>
                            <Input id="joiningDate" name="joiningDate" type="date" />
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
                        <Button type="submit" disabled={loading || !selectedSkills.some(s => s.skillType === 'Primary' && s.skillId !== '')}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Employee
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
