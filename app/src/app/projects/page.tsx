import { useNavigate } from "react-router-dom"
import { useMemo, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterBar } from "@/components/shared/filter-bar"
import { Loader2, AlertCircle } from "lucide-react"
import { useEmployees } from "@/lib/use-employees"
import { useProjects } from "@/lib/use-projects"
import { EmployeeDialog } from "./components/employee-dialog"
import { ProjectDialog } from "./components/project-dialog"
import { EmployeeListCards } from "./components/employee-list-cards"
import { ProjectListCards } from "./components/project-list-cards"
import type { Employee, EmployeeStatus, Project, ProjectPriority, ProjectStatus } from "@/types/api"

const EMPLOYEE_STATUS_OPTIONS: { value: EmployeeStatus | "all"; label: string }[] = [
    { value: "all", label: "All statuses" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
    { value: "On Probation", label: "On probation" },
    { value: "On Notice Period", label: "On notice period" },
    { value: "Terminated", label: "Terminated" },
]

const PROJECT_STATUS_OPTIONS: { value: ProjectStatus | "all"; label: string }[] = [
    { value: "all", label: "All statuses" },
    { value: "Planning", label: "Planning" },
    { value: "Active", label: "Active" },
    { value: "Completed", label: "Completed" },
    { value: "OnHold", label: "On hold" },
]

const PROJECT_PRIORITY_OPTIONS: { value: ProjectPriority | "all"; label: string }[] = [
    { value: "all", label: "All priorities" },
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
]

function matchesEmployeeSearch(employee: Employee, query: string): boolean {
    const haystack = [
        employee.name,
        employee.email,
        employee.employeeCode,
        employee.position,
        employee.jobRole,
        employee.role,
        employee.department,
        ...(employee.skills?.map((skill) => skill.name) ?? []),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

    return haystack.includes(query.toLowerCase())
}

function matchesProjectSearch(project: Project, query: string): boolean {
    const haystack = [
        project.name,
        project.code,
        project.owner,
        project.managerName,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

    return haystack.includes(query.toLowerCase())
}

export function Projects() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState("employee")
    const { employees, loading: empLoading, error: empError } = useEmployees()
    const { projects, loading: projLoading, error: projError } = useProjects()

    const [selectedProject, setSelectedProject] = useState<any | undefined>(undefined)
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any | undefined>(undefined)
    const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)
    const [employeeSearch, setEmployeeSearch] = useState("")
    const [employeeStatusFilter, setEmployeeStatusFilter] = useState<EmployeeStatus | "all">("all")
    const [projectSearch, setProjectSearch] = useState("")
    const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | "all">("all")
    const [projectPriorityFilter, setProjectPriorityFilter] = useState<ProjectPriority | "all">("all")

    const filteredEmployees = useMemo(() => {
        return (employees || []).filter((employee) => {
            const query = employeeSearch.trim()
            if (query && !matchesEmployeeSearch(employee, query)) return false
            if (employeeStatusFilter !== "all" && employee.status !== employeeStatusFilter) return false
            return true
        })
    }, [employees, employeeSearch, employeeStatusFilter])

    const filteredProjects = useMemo(() => {
        return (projects || []).filter((project) => {
            const query = projectSearch.trim()
            if (query && !matchesProjectSearch(project, query)) return false
            if (projectStatusFilter !== "all" && project.status !== projectStatusFilter) return false
            if (projectPriorityFilter !== "all" && project.priority !== projectPriorityFilter) return false
            return true
        })
    }, [projects, projectSearch, projectStatusFilter, projectPriorityFilter])

    const handleEditEmployee = (emp: Employee) => {
        setSelectedEmployee(emp)
        setIsEmployeeDialogOpen(true)
    }

    const handleCreateEmployee = () => {
        setSelectedEmployee(undefined)
        setIsEmployeeDialogOpen(true)
    }

    const handleEditProject = (proj: Project) => {
        setSelectedProject(proj)
        setIsProjectDialogOpen(true)
    }

    const handleCreateProject = () => {
        setSelectedProject(undefined)
        setIsProjectDialogOpen(true)
    }

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Employees and Projects</h1>
                    <p className="text-sm text-gray-600 mt-1">View all employee&apos;s personal information, manage projects and allocation.</p>
                </div>
                {activeTab === "employee" ? (
                    <Button onClick={handleCreateEmployee} className="bg-brand-500 hover:bg-brand-600">Add Employee</Button>
                ) : (
                    <Button onClick={handleCreateProject} className="bg-brand-500 hover:bg-brand-600">Add Project</Button>
                )}
            </div>

            <ProjectDialog
                project={selectedProject}
                open={isProjectDialogOpen}
                onOpenChange={setIsProjectDialogOpen}
            />

            <EmployeeDialog
                employee={selectedEmployee}
                open={isEmployeeDialogOpen}
                onOpenChange={setIsEmployeeDialogOpen}
            />

            <Tabs defaultValue="employee" className="space-y-6" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="employee">Employee</TabsTrigger>
                    <TabsTrigger value="project">Project</TabsTrigger>
                </TabsList>

                <TabsContent value="employee" className="space-y-4">
                    <FilterBar
                        value={employeeSearch}
                        onChange={setEmployeeSearch}
                        placeholder="Search employees by name, email, role, or skill"
                        statusFilter={{
                            value: employeeStatusFilter,
                            onChange: (value) => setEmployeeStatusFilter(value as EmployeeStatus | "all"),
                            options: EMPLOYEE_STATUS_OPTIONS,
                        }}
                    />
                    {empLoading ? (
                        <div className="flex items-center justify-center p-12 bg-white border border-gray-200 rounded-xl">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                            <span className="ml-2 text-gray-500">Loading employees...</span>
                        </div>
                    ) : empError ? (
                        <div className="flex flex-col items-center justify-center p-12 text-red-600 gap-2 bg-white border border-gray-200 rounded-xl">
                            <AlertCircle className="w-8 h-8" />
                            <p>Error: {empError}</p>
                        </div>
                    ) : (
                        <EmployeeListCards
                            employees={filteredEmployees}
                            onEdit={handleEditEmployee}
                        />
                    )}
                </TabsContent>

                <TabsContent value="project" className="space-y-4">
                    <FilterBar
                        value={projectSearch}
                        onChange={setProjectSearch}
                        placeholder="Search projects by name, code, owner, or manager"
                        statusFilter={{
                            value: projectStatusFilter,
                            onChange: (value) => setProjectStatusFilter(value as ProjectStatus | "all"),
                            options: PROJECT_STATUS_OPTIONS,
                        }}
                        priorityFilter={{
                            value: projectPriorityFilter,
                            onChange: (value) => setProjectPriorityFilter(value as ProjectPriority | "all"),
                            options: PROJECT_PRIORITY_OPTIONS,
                        }}
                    />
                    {projLoading ? (
                        <div className="flex items-center justify-center p-12 bg-white border border-gray-200 rounded-xl">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                            <span className="ml-2 text-gray-500">Loading projects...</span>
                        </div>
                    ) : projError ? (
                        <div className="flex flex-col items-center justify-center p-12 text-red-600 gap-2 bg-white border border-gray-200 rounded-xl">
                            <AlertCircle className="w-8 h-8" />
                            <p>Error: {projError}</p>
                        </div>
                    ) : (
                        <ProjectListCards
                            projects={filteredProjects}
                            onEdit={handleEditProject}
                            onOpen={(id) => navigate(`/projects/${id}`)}
                        />
                    )}
                </TabsContent>
            </Tabs>
        </PageContainer>
    )
}
