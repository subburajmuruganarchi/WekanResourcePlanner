import { useParams, Link } from "react-router";
import { ArrowLeft, Users, Calendar, DollarSign, Clock } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";

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
  description:
    "Complete redesign of the e-commerce platform with improved UX, performance optimization, and mobile responsiveness.",
};

const skillRequirements = [
  { skill: "React", level: "Expert", headcount: 3, days: 120, hours: 2880 },
  { skill: "Node.js", level: "Intermediate", headcount: 2, days: 120, hours: 1920 },
  { skill: "UI/UX Design", level: "Expert", headcount: 2, days: 80, hours: 1280 },
  { skill: "DevOps", level: "Intermediate", headcount: 1, days: 60, hours: 480 },
];

const allocatedResources = [
  {
    name: "Alice Johnson",
    role: "Frontend",
    skill: "React",
    allocation: 100,
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    hoursPerWeek: 40,
  },
  {
    name: "Bob Smith",
    role: "Frontend",
    skill: "React",
    allocation: 100,
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    hoursPerWeek: 40,
  },
  {
    name: "Carol White",
    role: "Backend",
    skill: "Node.js",
    allocation: 75,
    startDate: "2026-01-20",
    endDate: "2026-06-30",
    hoursPerWeek: 30,
  },
  {
    name: "David Lee",
    role: "Designer",
    skill: "UI/UX Design",
    allocation: 50,
    startDate: "2026-01-15",
    endDate: "2026-04-30",
    hoursPerWeek: 20,
  },
];

export function ProjectDetail() {
  const { id } = useParams();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{projectData.name}</h1>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  projectData.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {projectData.status}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  projectData.priority === "High"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {projectData.priority} Priority
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{projectData.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Edit Project
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Allocate Resources
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Team Size</p>
              <p className="text-xl font-semibold text-gray-900">8</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Duration</p>
              <p className="text-xl font-semibold text-gray-900">5.5 mo</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Hours Used</p>
              <p className="text-xl font-semibold text-gray-900">
                {projectData.actualHours}/{projectData.projectedHours}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Billing Type</p>
              <p className="text-xl font-semibold text-gray-900">{projectData.billingType}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="overview" className="bg-white border border-gray-200 rounded-lg">
        <Tabs.List className="flex border-b border-gray-200">
          <Tabs.Trigger
            value="overview"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger
            value="requirements"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Skill Requirements
          </Tabs.Trigger>
          <Tabs.Trigger
            value="resources"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Allocated Resources
          </Tabs.Trigger>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Content value="overview" className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-700">{projectData.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Details</h3>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Project Owner</dt>
                  <dd className="text-gray-900 font-medium">{projectData.owner}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Start Date</dt>
                  <dd className="text-gray-900">{new Date(projectData.startDate).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">End Date</dt>
                  <dd className="text-gray-900">{new Date(projectData.endDate).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Delivery Model</dt>
                  <dd className="text-gray-900">{projectData.deliveryModel}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Progress</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Overall Progress</span>
                    <span className="text-gray-900 font-medium">
                      {Math.round((projectData.actualHours / projectData.projectedHours) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${(projectData.actualHours / projectData.projectedHours) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Skill Requirements Tab */}
        <Tabs.Content value="requirements" className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Skill
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Min Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Headcount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Days/Person
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Total Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {skillRequirements.map((req, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.skill}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {req.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{req.headcount}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{req.days}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{req.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* Allocated Resources Tab */}
        <Tabs.Content value="resources" className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Skill
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Allocation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Hours/Week
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allocatedResources.map((resource, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {resource.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {resource.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{resource.skill}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{resource.allocation}%</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>
                        {new Date(resource.startDate).toLocaleDateString()} -{" "}
                        {new Date(resource.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{resource.hoursPerWeek}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}