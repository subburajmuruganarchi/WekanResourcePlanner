import { useState } from "react";
import { Search, UserPlus } from "lucide-react";

const projects = [
  { id: 1, name: "E-Commerce Platform Redesign", code: "PRJ-001" },
  { id: 2, name: "Mobile App Development", code: "PRJ-002" },
  { id: 3, name: "API Gateway Migration", code: "PRJ-003" },
];

const employees = [
  {
    id: 1,
    name: "Alice Johnson",
    role: "Frontend",
    primarySkill: "React",
    skillLevel: "Expert",
    availability: 0,
    experience: 5,
    currentAllocations: [{ project: "PRJ-001", allocation: 100 }],
  },
  {
    id: 2,
    name: "Bob Smith",
    role: "Frontend",
    primarySkill: "React",
    skillLevel: "Expert",
    availability: 0,
    experience: 6,
    currentAllocations: [{ project: "PRJ-001", allocation: 100 }],
  },
  {
    id: 3,
    name: "Carol White",
    role: "Backend",
    primarySkill: "Node.js",
    skillLevel: "Expert",
    availability: 25,
    experience: 7,
    currentAllocations: [{ project: "PRJ-001", allocation: 75 }],
  },
  {
    id: 4,
    name: "David Lee",
    role: "Designer",
    primarySkill: "UI/UX Design",
    skillLevel: "Expert",
    availability: 50,
    experience: 8,
    currentAllocations: [{ project: "PRJ-001", allocation: 50 }],
  },
  {
    id: 5,
    name: "Emily Chen",
    role: "DevOps",
    primarySkill: "AWS",
    skillLevel: "Intermediate",
    availability: 100,
    experience: 3,
    currentAllocations: [],
  },
  {
    id: 6,
    name: "Frank Wilson",
    role: "Backend",
    primarySkill: "Python",
    skillLevel: "Expert",
    availability: 100,
    experience: 9,
    currentAllocations: [],
  },
];

export function ResourceAllocation() {
  const [selectedProject, setSelectedProject] = useState(projects[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [requiredSkill, setRequiredSkill] = useState("React");

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  // Filter and rank employees
  const rankedEmployees = employees
    .filter((emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.primarySkill.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Primary skill match
      const aSkillMatch = a.primarySkill === requiredSkill ? 1 : 0;
      const bSkillMatch = b.primarySkill === requiredSkill ? 1 : 0;
      if (aSkillMatch !== bSkillMatch) return bSkillMatch - aSkillMatch;

      // Availability
      if (a.availability !== b.availability) return b.availability - a.availability;

      // Experience
      return b.experience - a.experience;
    });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Resource Allocation</h1>
        <p className="text-sm text-gray-600 mt-1">
          Allocate resources to projects based on skills and availability
        </p>
      </div>

      {/* Project Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Project</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className={`text-left p-4 border-2 rounded-lg transition-all ${
                selectedProject === project.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{project.name}</p>
              <p className="text-xs text-gray-600 mt-1 font-mono">{project.code}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Matching Logic Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Employee Ranking Logic
        </h4>
        <ol className="text-sm text-gray-700 space-y-1">
          <li>1. Primary Skill Match (first priority)</li>
          <li>2. Skill Level match</li>
          <li>3. Role Label match</li>
          <li>4. Availability % (descending)</li>
          <li>5. Experience (tie-breaker)</li>
        </ol>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Search & Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={requiredSkill}
              onChange={(e) => setRequiredSkill(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="React">React</option>
              <option value="Node.js">Node.js</option>
              <option value="Python">Python</option>
              <option value="UI/UX Design">UI/UX Design</option>
              <option value="AWS">AWS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Available Employees */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Available Employees</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {rankedEmployees.length} employees ranked by matching criteria
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Primary Skill
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Availability
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Current Allocations
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rankedEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                        {employee.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <span
                      className={`${
                        employee.primarySkill === requiredSkill
                          ? "font-semibold text-blue-600"
                          : ""
                      }`}
                    >
                      {employee.primarySkill}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        employee.skillLevel === "Expert"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {employee.skillLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-20">
                        <div
                          className={`h-full rounded-full ${
                            employee.availability === 100
                              ? "bg-green-500"
                              : employee.availability > 0
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${employee.availability}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900 w-10">{employee.availability}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{employee.experience} yrs</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {employee.currentAllocations.length > 0 ? (
                      <div className="space-y-1">
                        {employee.currentAllocations.map((alloc, idx) => (
                          <div key={idx} className="text-xs">
                            {alloc.project} ({alloc.allocation}%)
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={employee.availability === 0}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        employee.availability === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      <UserPlus className="w-3 h-3" />
                      Allocate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
