import { useNavigate } from "react-router-dom"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Users, Calendar, Clock, DollarSign } from "lucide-react"

// Mock Data (Single Project)
const projectData = {
    id: "1",
    name: "E-Commerce Platform Redesign",
    code: "PRJ-001",
    owner: "Sarah Chen",
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    status: "Active",
    priority: "High",
    billingType: "Billable",
    deliveryModel: "T&M",
    projectedHours: 2400,
    actualHours: 1560,
    description: "Complete redesign of the e-commerce platform with improved UX, performance optimization, and mobile responsiveness.",
}

const skillRequirements = [
    { skill: "React", level: "Expert", headcount: 3, days: 120, hours: 2880 },
    { skill: "Node.js", level: "Intermediate", headcount: 2, days: 120, hours: 1920 },
    { skill: "UI/UX Design", level: "Expert", headcount: 2, days: 80, hours: 1280 },
]

const allocatedResources = [
    { name: "Alice Johnson", role: "Frontend", skill: "React", allocation: 100, startDate: "2026-01-15", endDate: "2026-06-30" },
    { name: "Bob Smith", role: "Frontend", skill: "React", allocation: 100, startDate: "2026-01-15", endDate: "2026-06-30" },
    { name: "Carol White", role: "Backend", skill: "Node.js", allocation: 75, startDate: "2026-01-20", endDate: "2026-06-30" },
]

export function ProjectDetail() {
    const navigate = useNavigate()
    // const { id } = useParams() // Temporarily unused until we fetch data

    return (
        <PageContainer>
            {/* Header */}
            <div className="mb-8">
                <Button variant="link" className="pl-0 text-gray-500 mb-4" onClick={() => navigate("/projects")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
                </Button>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-semibold text-gray-900">{projectData.name}</h1>
                            <Badge variant="success">{projectData.status}</Badge>
                            <Badge variant="warning">{projectData.priority} Priority</Badge>
                        </div>
                        <p className="font-mono text-sm text-gray-500">{projectData.code}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">Edit Project</Button>
                        <Button>Allocate Resources</Button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><Users className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Team Size</p><p className="text-xl font-semibold">8</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600"><Calendar className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Duration</p><p className="text-xl font-semibold">5.5 mo</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600"><Clock className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Hours Used</p><p className="text-xl font-semibold">{projectData.actualHours}/{projectData.projectedHours}</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600"><DollarSign className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">Billing</p><p className="text-xl font-semibold">{projectData.billingType}</p></div>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="bg-white border border-gray-200 rounded-lg">
                <TabsList className="px-6 pt-4 border-b border-gray-200 w-full justify-start rounded-none h-auto bg-transparent mb-0">
                    <TabsTrigger value="overview" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">Overview</TabsTrigger>
                    <TabsTrigger value="requirements" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">Skill Requirements</TabsTrigger>
                    <TabsTrigger value="resources" className="pb-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-600">Allocated Resources</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="p-8">
                    <div className="grid grid-cols-3 gap-12">
                        <div className="col-span-2 space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{projectData.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                                <div className="space-y-4">
                                    <div><p className="text-xs text-gray-500">Project Owner</p><p className="font-medium">{projectData.owner}</p></div>
                                    <div><p className="text-xs text-gray-500">Delivery Model</p><p className="font-medium">{projectData.deliveryModel}</p></div>
                                </div>
                                <div className="space-y-4">
                                    <div><p className="text-xs text-gray-500">Start Date</p><p className="font-medium">{new Date(projectData.startDate).toLocaleDateString()}</p></div>
                                    <div><p className="text-xs text-gray-500">End Date</p><p className="font-medium">{new Date(projectData.endDate).toLocaleDateString()}</p></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-1 border-l border-gray-100 pl-8">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Progress</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span>Overall</span>
                                    <span className="font-medium">{Math.round((projectData.actualHours / projectData.projectedHours) * 100)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500" style={{ width: `${(projectData.actualHours / projectData.projectedHours) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="requirements" className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50"><TableHead>Skill</TableHead><TableHead>Level</TableHead><TableHead>Headcount</TableHead><TableHead>Hours</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {skillRequirements.map((req, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{req.skill}</TableCell>
                                    <TableCell><Badge variant="info" className="text-[10px]">{req.level}</Badge></TableCell>
                                    <TableCell>{req.headcount}</TableCell>
                                    <TableCell>{req.hours}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>

                <TabsContent value="resources" className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50"><TableHead>Employee</TableHead><TableHead>Role</TableHead><TableHead>Skill</TableHead><TableHead>Allocation</TableHead><TableHead>Period</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {allocatedResources.map((res, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{res.name}</TableCell>
                                    <TableCell><Badge variant="secondary" className="text-[10px]">{res.role}</Badge></TableCell>
                                    <TableCell>{res.skill}</TableCell>
                                    <TableCell>{res.allocation}%</TableCell>
                                    <TableCell className="text-xs text-gray-500">{new Date(res.startDate).toLocaleDateString()} - {new Date(res.endDate).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        </PageContainer>
    )
}
