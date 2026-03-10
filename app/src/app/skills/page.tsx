import { useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Edit, Trash2, Plus } from "lucide-react"
import { useSkills, type Skill } from "@/lib/use-skills"
import { SkillDialog } from "./skill-dialog"

export default function SkillsPage() {
    const { skills, loading, deleteSkill } = useSkills()
    const [selectedSkill, setSelectedSkill] = useState<Skill | undefined>(undefined)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleCreateSkill = () => {
        setSelectedSkill(undefined)
        setIsDialogOpen(true)
    }

    const handleEditSkill = (skill: Skill) => {
        setSelectedSkill(skill)
        setIsDialogOpen(true)
    }

    const handleDeleteSkill = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete the skill "${name}"?`)) {
            try {
                await deleteSkill(id)
            } catch (err) {
                console.error("Failed to delete skill:", err)
                alert("Failed to delete skill. It might be in use.")
            }
        }
    }

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Skill Master</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage the global list of skills available for employees and project requirements.</p>
                </div>
                <Button onClick={handleCreateSkill} className="bg-brand-500 hover:bg-brand-600">
                    <Plus className="w-4 h-4 mr-2" /> Add Skill
                </Button>
            </div>

            <SkillDialog
                skill={selectedSkill}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />

            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                        <span className="ml-2 text-gray-500">Loading skills...</span>
                    </div>
                ) : skills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-500 gap-2">
                        <p>No skills found.</p>
                        <Button variant="outline" size="sm" onClick={handleCreateSkill}>Create your first skill</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Skill Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {skills.map((skill) => (
                                <TableRow key={skill.id} className="hover:bg-gray-50">
                                    <TableCell className="font-medium text-gray-900">{skill.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal">
                                            {skill.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={skill.isActive ? "success" : "secondary"}>
                                            {skill.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditSkill(skill)}
                                                className="h-8 w-8 text-gray-500 hover:text-brand-600"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteSkill(skill.id, skill.name)}
                                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </PageContainer>
    )
}
