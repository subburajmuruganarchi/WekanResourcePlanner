import { Users, FolderKanban, Clock, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "../contexts/auth-context";

const stats = [
  {
    label: "Active Projects",
    value: "24",
    change: "+3 this month",
    icon: FolderKanban,
    color: "blue",
  },
  {
    label: "Total Employees",
    value: "156",
    change: "8 available",
    icon: Users,
    color: "green",
  },
  {
    label: "Avg Utilization",
    value: "82%",
    change: "+5% from last month",
    icon: TrendingUp,
    color: "purple",
  },
  {
    label: "Hours This Week",
    value: "6,248",
    change: "Across all projects",
    icon: Clock,
    color: "orange",
  },
];

const utilizationData = [
  { month: "Jan", utilization: 75 },
  { month: "Feb", utilization: 78 },
  { month: "Mar", utilization: 82 },
  { month: "Apr", utilization: 80 },
  { month: "May", utilization: 85 },
  { month: "Jun", utilization: 82 },
];

const projectData = [
  { name: "Backend", hours: 1850 },
  { name: "Frontend", hours: 1620 },
  { name: "DevOps", hours: 980 },
  { name: "QA", hours: 1150 },
  { name: "Design", hours: 650 },
];

const recentProjects = [
  {
    name: "E-Commerce Platform Redesign",
    code: "PRJ-001",
    status: "Active",
    progress: 65,
    team: 8,
  },
  {
    name: "Mobile App Development",
    code: "PRJ-002",
    status: "Active",
    progress: 45,
    team: 12,
  },
  {
    name: "API Gateway Migration",
    code: "PRJ-003",
    status: "Active",
    progress: 85,
    team: 6,
  },
  {
    name: "Customer Portal v2",
    code: "PRJ-004",
    status: "Planning",
    progress: 20,
    team: 5,
  },
];

export function Dashboard() {
  const { user } = useAuth();

  // Filter stats based on user role
  const getVisibleStats = () => {
    if (user?.role === "employee") {
      return [
        stats[3], // Utilization Rate for employee
      ];
    }
    return stats; // Admin and PM see all stats
  };

  const visibleStats = getVisibleStats();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          {user?.role === "employee" 
            ? "Welcome back! Here's your activity overview."
            : "Welcome back! Here's what's happening."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${user?.role === "employee" ? "lg:grid-cols-2" : "lg:grid-cols-4"} gap-6`}>
        {visibleStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                  <p className="text-3xl font-semibold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
                </div>
                <div
                  className={`w-12 h-12 bg-${stat.color}-50 rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilization Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="utilization"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Hours by Role */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours by Role</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Team Size
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentProjects.map((project) => (
                <tr key={project.code} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 font-mono">{project.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        project.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-10">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{project.team} members</span>
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