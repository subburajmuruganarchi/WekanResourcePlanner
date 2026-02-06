import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, Filter } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";

const utilizationData = [
  { employee: "Alice J.", utilization: 95, projectHours: 152, availableHours: 160 },
  { employee: "Bob S.", utilization: 92, projectHours: 147, availableHours: 160 },
  { employee: "Carol W.", utilization: 78, projectHours: 125, availableHours: 160 },
  { employee: "David L.", utilization: 65, projectHours: 104, availableHours: 160 },
  { employee: "Emily C.", utilization: 45, projectHours: 72, availableHours: 160 },
];

const projectCapacityData = [
  {
    project: "PRJ-001",
    projected: 2400,
    forecasted: 2200,
    actual: 1560,
    variance: -640,
  },
  {
    project: "PRJ-002",
    projected: 3200,
    forecasted: 3000,
    actual: 1440,
    variance: -1560,
  },
  {
    project: "PRJ-003",
    projected: 1600,
    forecasted: 1600,
    actual: 1360,
    variance: -240,
  },
];

const roleEffortData = [
  { role: "Backend", planned: 3200, forecasted: 3000, actual: 2800 },
  { role: "Frontend", planned: 2800, forecasted: 2600, actual: 2400 },
  { role: "DevOps", planned: 1600, forecasted: 1500, actual: 1350 },
  { role: "Design", planned: 1200, forecasted: 1100, actual: 950 },
  { role: "QA", planned: 1000, forecasted: 900, actual: 800 },
];

const allocationDistribution = [
  { name: "Fully Allocated (100%)", value: 45, color: "#ef4444" },
  { name: "High Allocation (75-99%)", value: 30, color: "#f59e0b" },
  { name: "Moderate (50-74%)", value: 15, color: "#3b82f6" },
  { name: "Available (<50%)", value: 10, color: "#10b981" },
];

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];

export function Reports() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track utilization, capacity, and project performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Utilization Formula */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Utilization Formula</h4>
        <p className="text-sm text-gray-700 font-mono bg-white border border-gray-200 rounded px-3 py-2 inline-block">
          Utilization % = Project Hours ÷ Available Hours
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Leave & Holiday hours are excluded from available hours.
        </p>
      </div>

      {/* Tabs for Different Reports */}
      <Tabs.Root defaultValue="utilization" className="bg-white border border-gray-200 rounded-lg">
        <Tabs.List className="flex border-b border-gray-200 overflow-x-auto">
          <Tabs.Trigger
            value="utilization"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 whitespace-nowrap"
          >
            Employee Utilization
          </Tabs.Trigger>
          <Tabs.Trigger
            value="capacity"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 whitespace-nowrap"
          >
            Project Capacity
          </Tabs.Trigger>
          <Tabs.Trigger
            value="role-effort"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 whitespace-nowrap"
          >
            Role-wise Effort
          </Tabs.Trigger>
          <Tabs.Trigger
            value="allocation"
            className="px-6 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 whitespace-nowrap"
          >
            Allocation Distribution
          </Tabs.Trigger>
        </Tabs.List>

        {/* Employee Utilization Tab */}
        <Tabs.Content value="utilization" className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Utilization Report</h3>
            <p className="text-sm text-gray-600 mb-4">
              View utilization rates across all employees
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="employee" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Project Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Available Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Utilization %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {utilizationData.map((emp, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.employee}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{emp.projectHours}h</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{emp.availableHours}h</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full rounded-full ${
                              emp.utilization >= 90
                                ? "bg-green-500"
                                : emp.utilization >= 70
                                ? "bg-blue-500"
                                : "bg-yellow-500"
                            }`}
                            style={{ width: `${emp.utilization}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-gray-900">{emp.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* Project Capacity Tab */}
        <Tabs.Content value="capacity" className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Project Capacity vs Actual
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Compare projected, forecasted, and actual hours for each project
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectCapacityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="project" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="projected" fill="#3b82f6" name="Projected" radius={[4, 4, 0, 0]} />
                <Bar dataKey="forecasted" fill="#8b5cf6" name="Forecasted" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Projected
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Forecasted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Actual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projectCapacityData.map((project, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {project.project}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{project.projected}h</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{project.forecasted}h</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{project.actual}h</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`font-semibold ${
                          project.variance < 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {project.variance}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* Role-wise Effort Tab */}
        <Tabs.Content value="role-effort" className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Role-wise Effort Analysis</h3>
            <p className="text-sm text-gray-600 mb-4">
              Track planned vs forecasted vs actual hours by role
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleEffortData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="role" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="planned" fill="#3b82f6" name="Planned" radius={[4, 4, 0, 0]} />
                <Bar dataKey="forecasted" fill="#8b5cf6" name="Forecasted" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Planned
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Forecasted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Actual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roleEffortData.map((role, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{role.role}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{role.planned}h</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{role.forecasted}h</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{role.actual}h</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`font-semibold ${
                          role.actual < role.planned ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {role.actual - role.planned}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* Allocation Distribution Tab */}
        <Tabs.Content value="allocation" className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resource Allocation Distribution
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Breakdown of employee allocation across the organization
            </p>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={allocationDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allocationDistribution.map((item, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 flex items-center gap-4"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-600">{item.value}% of employees</p>
                </div>
                <div className="text-2xl font-semibold text-gray-900">{item.value}%</div>
              </div>
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
