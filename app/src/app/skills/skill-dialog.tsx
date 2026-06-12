import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { useSkills, type Skill } from "@/lib/use-skills"
import { Loader2, AlertCircle } from "lucide-react"

interface SkillDialogProps {
    skill?: Skill;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SkillDialog({ skill, open, onOpenChange }: SkillDialogProps) {
    const [loading, setLoading] = useState(false)
    const { createSkill, updateSkill } = useSkills()
    const isEdit = !!skill

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        isActive: true
    })

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (skill && open) {
            setFormData({
                name: skill.name,
                category: skill.category,
                description: '', // Description not currently in Skill type but in ISkill model
                isActive: skill.isActive
            })
        } else if (!skill && open) {
            setFormData({
                name: '',
                category: '',
                description: '',
                isActive: true
            })
        }
        setError(null)
    }, [skill, open])

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isEdit && skill) {
                await updateSkill(skill.id, formData)
            } else {
                await createSkill(formData)
            }
            onOpenChange(false)
        } catch (error: any) {
            console.error("Failed to save skill:", error)
            setError(error.message || "Failed to save skill. The skill name might already exist.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit Skill' : 'Add New Skill'}</DialogTitle>
                        <DialogDescription>
                            {isEdit ? 'Update the details of the skill.' : 'Add a new skill to the global list.'}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Skill Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={e => updateField('name', e.target.value)}
                                required
                                placeholder="e.g. React"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={v => updateField('category', v)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Frontend">Frontend</SelectItem>
                                    <SelectItem value="Backend">Backend</SelectItem>
                                    <SelectItem value="Mobile">Mobile</SelectItem>
                                    <SelectItem value="Design">Design</SelectItem>
                                    <SelectItem value="DevOps">DevOps</SelectItem>
                                    <SelectItem value="Data Science">Data Science</SelectItem>
                                    <SelectItem value="Project Management">Project Management</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.isActive ? "Active" : "Inactive"}
                                onValueChange={v => updateField('isActive', v === "Active")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-brand-600 hover:bg-brand-700">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Update Skill' : 'Create Skill'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
