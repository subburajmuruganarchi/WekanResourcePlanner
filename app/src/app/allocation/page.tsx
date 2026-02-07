import { useState } from "react"
import { Search, UserPlus, Loader2 } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { Section } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RoleGuard } from "@/components/shared/role-guard"
import { AllocationDialog } from "./components/allocation-dialog"
import { useRankedEmployees, type RankedEmployee } from "@/lib/use-ranked-employees"
import { useProjects } from "@/lib/use-projects"

export function Allocation() {
    const { projects, loading: projLoading } = useProjects()
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
    const [searchQuery, setSearchQuery] = useState("")
    const [requiredSkill, setRequiredSkill] = useState("React")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<RankedEmployee | null>(null)

    const { rankedEmployees, loading: rankLoading, error: rankError, refetch } = useRankedEmployees({
        projectId: selectedProjectId,
        skill: requiredSkill,
    })

    const handleAllocate = (employee: RankedEmployee) => {
        setSelectedEmployee(employee)
        setIsDialogOpen(true)
    }

    // Filter employees by search query (client-side filtering on top of server ranking)
    const filteredEmployees = rankedEmployees.filter((emp) =>
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.primarySkill?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const selectedProjectName = projects.find(p => p.id === selectedProjectId)?.name || "Project"

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
                            {projLoading ? (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                                </div>
                            ) : (
                                (projects || []).map((project) => (
                                    <div
                                        key={project.id}
                                        onClick={() => setSelectedProjectId(project.id)}
                                        className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedProjectId === project.id
                                            ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="font-semibold text-sm text-gray-900">{project.name}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-1">{project.code}</div>
                                    </div>
                                ))
                            )}
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
                    <Section title={`Available Resources (${filteredEmployees.length})`} description="Ranked by best match">
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
                                            <TableHead>Skill Match</TableHead>
                                            <TableHead>Current Allocations</TableHead>
                                            <TableHead>Availability</TableHead>
                                            <TableHead>Experience</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(filteredEmployees || []).map((emp) => (
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
                                                            <Badge variant={emp.factors?.skillMatch ? "default" : "secondary"} className="text-[10px]">
                                                                {emp.primarySkill}
                                                            </Badge>
                                                            <span className="text-xs text-gray-500">{emp.skillLevel}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {emp.currentAllocations?.length > 0 ? (
                                                            emp.currentAllocations.map((alloc, i) => (
                                                                <Badge key={i} variant="outline" className="text-[10px] bg-gray-50">
                                                                    {alloc.projectName} ({alloc.percentage}%)
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
                                                <TableCell className="text-right">
                                                    <RoleGuard allowedRoles={["Admin", "ProjectManager"]}>
                                                        {emp.isAllocatedToProject ? (
                                                            <Badge variant="secondary" className="text-xs">Already Allocated</Badge>
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

            <AllocationDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                employeeId={selectedEmployee?.id || ""}
                employeeName={selectedEmployee?.name || ""}
                projectId={selectedProjectId || ""}
                projectName={selectedProjectName}
                onSuccess={refetch}
            />
        </PageContainer>
    )
}
