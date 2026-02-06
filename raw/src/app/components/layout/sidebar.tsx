import { NavLink } from "react-router";
import {
  LayoutDashboard,
  FolderKanban,
  Award,
  Users,
  Clock,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/auth-context";

const allNavItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["employee", "project-manager", "admin"] },
  { path: "/projects", icon: FolderKanban, label: "Employee & Projects", roles: ["project-manager", "admin"] },
  { path: "/skills", icon: Award, label: "Skills & Competency", roles: ["admin"] },
  { path: "/allocation", icon: Users, label: "Resource Allocation", roles: ["project-manager", "admin"] },
  { path: "/time-entry", icon: Clock, label: "Time Entry", roles: ["employee", "project-manager", "admin"] },
  { path: "/reports", icon: BarChart3, label: "Reports", roles: ["project-manager", "admin"] },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  // Filter navigation items based on user role
  const navItems = allNavItems.filter((item) => 
    user && item.roles.includes(user.role)
  );

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin View";
      case "project-manager":
        return "Project Manager";
      case "employee":
        return "Employee";
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-lg">WeKan R360</div>
            <div className="text-xs text-gray-500">Enterprise Solutions</div>
          </div>
        </div>
      </div>

      {/* Menu Label */}
      <div className="px-6 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Menu</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-red-50 text-red-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg mb-2">
          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-sm font-semibold text-white">
            {user ? getInitials(user.name) : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name || "User"}</p>
            <p className="text-xs text-gray-500">{user ? getRoleLabel(user.role) : ""}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}