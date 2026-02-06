import { useState } from "react"
import { Search, UserPlus } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { Section } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RoleGuard } from "@/components/shared/role-guard"
import { AllocationDialog } from "./components/allocation-dialog"

// Mock Data
const projects = [
    { id: 1, name: "E-Commerce Platform Redesign", code: "PRJ-001" },
    { id: 2, name: "Mobile App Development", code: "PRJ-002" },
    { id: 3, name: "API Gateway Migration", code: "PRJ-003" },
]

const employees = [
    { id: 1, name: "Alice Johnson", role: "Frontend", primarySkill: "React", skillLevel: "Expert", availability: 0, experience: 5, currentAllocations: [{ project: "PRJ-001", allocation: 100 }] },
    { id: 2, name: "Bob Smith", role: "Frontend", primarySkill: "React", skillLevel: "Expert", availability: 0, experience: 6, currentAllocations: [{ project: "PRJ-001", allocation: 100 }] },
    { id: 3, name: "Carol White", role: "Backend", primarySkill: "Node.js", skillLevel: "Expert", availability: 25, experience: 7, currentAllocations: [{ project: "PRJ-001", allocation: 75 }] },
    { id: 4, name: "David Lee", role: "Designer", primarySkill: "UI/UX Design", skillLevel: "Expert", availability: 50, experience: 8, currentAllocations: [{ project: "PRJ-001", allocation: 50 }] },
    { id: 5, name: "Emily Chen", role: "DevOps", primarySkill: "AWS", skillLevel: "Intermediate", availability: 100, experience: 3, currentAllocations: [] },
    { id: 6, name: "Frank Wilson", role: "Backend", primarySkill: "Python", skillLevel: "Expert", availability: 100, experience: 9, currentAllocations: [] },
]

export function Allocation() {
    const [selectedProject, setSelectedProject] = useState(projects[0].id)
    const [searchQuery, setSearchQuery] = useState("")
    const [requiredSkill, setRequiredSkill] = useState("React")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<{ name: string } | null>(null)

    const handleAllocate = (employee: typeof employees[0]) => {
        setSelectedEmployee(employee)
        setIsDialogOpen(true)
    }

    // Filter and rank employees
    const rankedEmployees = employees
        .filter((emp) =>
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.primarySkill.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            const aSkillMatch = a.primarySkill === requiredSkill ? 1 : 0
            const bSkillMatch = b.primarySkill === requiredSkill ? 1 : 0
            if (aSkillMatch !== bSkillMatch) return bSkillMatch - aSkillMatch

            if (a.availability !== b.availability) return b.availability - a.availability
            return b.experience - a.experience
        })

    const selectedProjectName = projects.find(p => p.id === selectedProject)?.name || "Project"

    return (
        <PageContainer className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Resource Allocation</h1>
                <p className="text-sm text-gray-600 mt-1">Allocate resources to projects based on skills, availability, and experience.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Project Selection & Filters */}
                <div className="space-y-6">
                    <Section title="Select Project">
                        <div className="space-y-2">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => setSelectedProject(project.id)}
                                    className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedProject === project.id
                                        ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="font-semibold text-sm text-gray-900">{project.name}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">{project.code}</div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="Target Criteria">
                        <div className="bg-white p-4 border border-gray-200 rounded-xl space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Required Skill</label>
                                <Select value={requiredSkill} onValueChange={setRequiredSkill}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="React">React</SelectItem>
                                        <SelectItem value="Node.js">Node.js</SelectItem>
                                        <SelectItem value="Python">Python</SelectItem>
                                        <SelectItem value="UI/UX Design">UI/UX Design</SelectItem>
                                        <SelectItem value="AWS">AWS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name..."
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </Section>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">Ranking Logic</h4>
                        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Primary Skill Match</li>
                            <li>Availability % (High to Low)</li>
                            <li>Experience Level</li>
                        </ol>
                    </div>
                </div>

                {/* Right Column: Ranked Table */}
                <div className="lg:col-span-2">
                    <Section title={`Available Resources (${rankedEmployees.length})`} description="Ranked by best match">
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Skill Match</TableHead>
                                        <TableHead>Availability</TableHead>
                                        <TableHead>Experience</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rankedEmployees.map((emp) => (
                                        <TableRow key={emp.id} className="hover:bg-gray-50 group">
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-gray-900">{emp.name}</div>
                                                    <div className="text-xs text-gray-500">{emp.role}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={emp.primarySkill === requiredSkill ? "default" : "secondary"} className="text-[10px]">
                                                            {emp.primarySkill}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">{emp.skillLevel}</span>
                                                    </div>
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
                                            <TableCell className="text-sm text-gray-600">{emp.experience} yrs</TableCell>
                                            <TableCell className="text-right">
                                                <RoleGuard allowedRoles={["Admin", "ProjectManager"]}>
                                                    <Button
                                                        size="sm"
                                                        disabled={emp.availability === 0}
                                                        onClick={() => handleAllocate(emp)}
                                                        className={emp.availability === 0 ? "opacity-50" : ""}
                                                    >
                                                        <UserPlus className="w-4 h-4 mr-1.5" />
                                                        Allocate
                                                    </Button>
                                                </RoleGuard>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Section>
                </div>
            </div>

            <AllocationDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                employeeName={selectedEmployee?.name || ""}
                projectName={selectedProjectName}
            />
        </PageContainer>
    )
}
