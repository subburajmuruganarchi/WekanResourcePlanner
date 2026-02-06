import { useState } from "react";
import { Plus, Search } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";

const skillsMaster = [
  { id: 1, name: "React", category: "Frontend", status: "Active" },
  { id: 2, name: "Node.js", category: "Backend", status: "Active" },
  { id: 3, name: "Python", category: "Backend", status: "Active" },
  { id: 4, name: "UI/UX Design", category: "Design", status: "Active" },
  { id: 5, name: "AWS", category: "DevOps", status: "Active" },
  { id: 6, name: "Docker", category: "DevOps", status: "Active" },
  { id: 7, name: "Angular", category: "Frontend", status: "Deprecated" },
  { id: 8, name: "PostgreSQL", category: "Backend", status: "Active" },
];

const employeeSkills = [
  {
    employee: "Alice Johnson",
    skill: "React",
    type: "Primary",
    level: "Expert",
    experience: 5,
  },
  {
    employee: "Alice Johnson",
    skill: "Node.js",
    type: "Secondary",
    level: "Intermediate",
    experience: 3,
  },
  {
    employee: "Bob Smith",
    skill: "React",
    type: "Primary",
    level: "Expert",
    experience: 6,
  },
  {
    employee: "Carol White",
    skill: "Node.js",
    type: "Primary",
    level: "Expert",
    experience: 7,
  },
  {
    employee: "Carol White",
    skill: "Python",
    type: "Secondary",
    level: "Intermediate",
    experience: 4,
  },
  {
    employee: "David Lee",
    skill: "UI/UX Design",
    type: "Primary",
    level: "Expert",
    experience: 8,
  },
  {
    employee: "Emily Chen",
    skill: "AWS",
    type: "Primary",
    level: "Intermediate",
    experience: 3,
  },
  {
    employee: "Emily Chen",
    skill: "Docker",
    type: "Secondary",
    level: "Beginner",
    experience: 1,
  },
];

export function Skills() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSkills = skillsMaster.filter((skill) =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Skills Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage organizational skills and employee competencies
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="skills-master" className="bg-white border border-gray-200 rounded-lg">
        <Tabs.List className="flex border-b border-gray-200">
          <Tabs.Trigger
            value="skills-master"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Skills Master
          </Tabs.Trigger>
          <Tabs.Trigger
            value="employee-skills"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Employee Skills
          </Tabs.Trigger>
        </Tabs.List>

        {/* Skills Master Tab */}
        <Tabs.Content value="skills-master" className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Skill Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSkills.map((skill) => (
                  <tr key={skill.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{skill.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {skill.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          skill.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {skill.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <button className="text-blue-600 hover:text-blue-700 font-medium">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* Employee Skills Tab */}
        <Tabs.Content value="employee-skills" className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Skill Classification</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                • <span className="font-semibold">Primary Skill:</span> Core expertise, prioritized
                during allocation
              </li>
              <li>
                • <span className="font-semibold">Secondary Skill:</span> Supporting competency
              </li>
            </ul>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Skill
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Experience (Years)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeeSkills.map((skill, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {skill.employee}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{skill.skill}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          skill.type === "Primary"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {skill.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          skill.level === "Expert"
                            ? "bg-green-100 text-green-700"
                            : skill.level === "Intermediate"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {skill.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{skill.experience}</td>
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
