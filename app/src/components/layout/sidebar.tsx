import { NavLink } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    Clock,
    FileBarChart,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Employees & Projects", icon: FolderKanban, path: "/projects" },
    { label: "Resource Allocation", icon: Users, path: "/allocation" },
    { label: "Time Entry", icon: Clock, path: "/time-entry" },
    { label: "Reports", icon: FileBarChart, path: "/reports" },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className, ...props }: SidebarProps) {
    const { user, switchRole } = useAuth()

    // Define role permissions for nav items
    const allowedRoles: Record<string, string[]> = {
        "/dashboard": ["Admin", "ProjectManager", "Employee", "Leadership"],
        "/projects": ["Admin", "ProjectManager", "Employee", "Leadership"],
        "/allocation": ["Admin", "ProjectManager", "Leadership"],
        "/time-entry": ["Admin", "ProjectManager", "Employee"],
        "/reports": ["Admin", "ProjectManager", "Leadership"]
    }

    const filteredItems = navItems.filter(item => {
        if (!user) return false
        const roles = allowedRoles[item.path]
        return roles ? roles.includes(user.role) : true
    })

    return (
        <aside className={cn("w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0", className)} {...props}>
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">R</span>
                    </div>
                    <span className="font-bold text-gray-900 text-lg">R360</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }: { isActive: boolean }) =>
                            cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive
                                    ? "bg-brand-50 text-brand-600"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Role Switcher for Demo */}
            <div className="p-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Role (Demo)</p>
                <select
                    className="w-full text-xs p-2 border rounded bg-gray-50 mb-4 cursor-pointer"
                    value={user?.role}
                    onChange={(e) => switchRole(e.target.value as any)}
                >
                    <option value="Admin">Admin</option>
                    <option value="ProjectManager">Project Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="Leadership">Leadership</option>
                </select>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                        {user?.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
