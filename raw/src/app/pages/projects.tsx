import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, ChevronDown, MoreVertical } from "lucide-react";
import { CreateProjectModal } from "../components/modals/create-project-modal";
import * as Tabs from "@radix-ui/react-tabs";

const employees = [
  {
    id: "1",
    name: "Amol Deep",
    role: "admin",
    position: "Head of Delivery",
    location: "Bangalore",
    reportee: "-",
    status: "Active",
  },
  {
    id: "2",
    name: "Sanjay Mali",
    role: "employee",
    position: "Graphic Designer",
    location: "Bangalore",
    reportee: "-",
    status: "Active",
  },
  {
    id: "3",
    name: "Sachin Deshpande",
    role: "employee",
    position: "Project Manager",
    location: "Pune",
    reportee: "-",
    status: "Active",
  },
  {
    id: "4",
    name: "Deepak N",
    role: "employee",
    position: "Jr Associate TA",
    location: "Chennai",
    reportee: "-",
    status: "Active",
  },
  {
    id: "5",
    name: "Charumathi k",
    role: "employee",
    position: "SDE",
    location: "Bangalore",
    reportee: "-",
    status: "Active",
  },
  {
    id: "6",
    name: "Padmanabhan N",
    role: "employee",
    position: "SDE 2",
    location: "Chennai",
    reportee: "-",
    status: "Active",
  },
];

const projects = [
  {
    id: "1",
    name: "E-Commerce Platform Redesign",
    code: "PRJ-001",
    owner: "Sarah Chen",
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    status: "Active",
    priority: "High",
    team: 8,
  },
  {
    id: "2",
    name: "Mobile App Development",
    code: "PRJ-002",
    owner: "Marcus Johnson",
    startDate: "2026-02-01",
    endDate: "2026-08-31",
    status: "Active",
    priority: "High",
    team: 12,
  },
  {
    id: "3",
    name: "API Gateway Migration",
    code: "PRJ-003",
    owner: "Elena Rodriguez",
    startDate: "2025-12-01",
    endDate: "2026-03-31",
    status: "Active",
    priority: "Medium",
    team: 6,
  },
  {
    id: "4",
    name: "Customer Portal v2",
    code: "PRJ-004",
    owner: "David Park",
    startDate: "2026-03-01",
    endDate: "2026-09-30",
    status: "Planning",
    priority: "Medium",
    team: 5,
  },
];

export function Projects() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("employee");

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employees and Projects</h1>
          <p className="text-sm text-gray-600 mt-1">
            View all employee's personal information, manage projects and allocation.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E53E3E] text-white rounded-lg hover:bg-[#C53030] transition-colors font-medium text-sm"
        >
          Add Employee
        </button>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-8 border-b border-gray-200">
          <Tabs.Trigger
            value="employee"
            className="pb-3 text-sm font-semibold text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 uppercase tracking-wide"
          >
            Employee
          </Tabs.Trigger>
          <Tabs.Trigger
            value="project"
            className="pb-3 text-sm font-semibold text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 uppercase tracking-wide"
          >
            Project
          </Tabs.Trigger>
        </Tabs.List>

        {/* Employee Tab */}
        <Tabs.Content value="employee" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <select className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer">
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <span className="absolute -top-2 left-3 px-1 bg-[#FAF9F7] text-xs text-gray-600">
                Status
              </span>
            </div>
            <div className="relative">
              <select className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer">
                <option>All</option>
                <option>Engineering</option>
                <option>Design</option>
                <option>Sales</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <span className="absolute -top-2 left-3 px-1 bg-[#FAF9F7] text-xs text-gray-600">
                Department
              </span>
            </div>
            <div className="relative">
              <select className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer">
                <option>All</option>
                <option>Admin</option>
                <option>Employee</option>
                <option>Manager</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <span className="absolute -top-2 left-3 px-1 bg-[#FAF9F7] text-xs text-gray-600">
                Role
              </span>
            </div>
          </div>

          {/* Employee Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Position
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Reportee
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          to={`/employees/${employee.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {employee.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.position}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.location}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{employee.reportee}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-sm font-medium text-green-600">
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>

        {/* Project Tab */}
        <Tabs.Content value="project" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <select className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer">
                <option>All</option>
                <option>Active</option>
                <option>Planning</option>
                <option>Completed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <span className="absolute -top-2 left-3 px-1 bg-[#FAF9F7] text-xs text-gray-600">
                Status
              </span>
            </div>
            <div className="relative">
              <select className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer">
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <span className="absolute -top-2 left-3 px-1 bg-[#FAF9F7] text-xs text-gray-600">
                Priority
              </span>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Project
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Owner
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Timeline
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Team
                    </th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          to={`/projects/${project.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 font-mono">{project.code}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{project.owner}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          <div>{new Date(project.startDate).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            to {new Date(project.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center text-sm font-medium ${
                            project.status === "Active" ? "text-green-600" : "text-blue-600"
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            project.priority === "High"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {project.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{project.team}</td>
                      <td className="px-6 py-4">
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Create Project Modal */}
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}