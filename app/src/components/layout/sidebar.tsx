import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    Clock,
    Target,
    FileBarChart,
    List,
    LogOut,
    Sparkles,
    ClipboardCheck,
    Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Employees & Projects", icon: FolderKanban, path: "/projects" },
    { label: "Resource Allocation", icon: Users, path: "/allocation" },
    { label: "Time Entry", icon: Clock, path: "/time-entry" },
    { label: "PM Approvals", icon: ClipboardCheck, path: "/pm-approvals" },
    { label: "OKRs", icon: Target, path: "/okrs" },
    { label: "AI Analytics", icon: Sparkles, path: "/ai-analytics" },
    { label: "Reports", icon: FileBarChart, path: "/reports" },
    { label: "Skill Master", icon: List, path: "/skills" },
    { label: "User Control", icon: Shield, path: "/user-control" },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className, ...props }: SidebarProps) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    // Define role permissions for nav items
    const allowedRoles: Record<string, string[]> = {
        "/dashboard": ["Admin", "Project Manager"],
        "/projects": ["Admin", "Project Manager"],
        "/allocation": ["Admin"],
        "/time-entry": ["*"],
        "/pm-approvals": ["Admin", "Project Manager"],
        "/okrs": ["*"],
        "/reports": ["Admin", "Project Manager"],
        "/ai-analytics": ["Admin", "Project Manager"],
        "/skills": ["Admin"],
        "/user-control": ["Admin"],
    }

    const filteredItems = navItems.filter(item => {
        if (!user) return false
        
        // Admins see everything
        if (user.role === "Admin") return true

        const roles = allowedRoles[item.path]
        if (!roles) return true
        if (roles.includes("*")) return true
        return roles.includes(user.role)
    })

    const handleSignOut = () => {
        logout()
        navigate("/login", { replace: true })
    }

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

        {/* Bottom section */}
            <div className="p-4 border-t border-gray-200">
                {/* User info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                        {user?.name?.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                    </div>
                </div>

                {/* Sign Out */}
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </aside>
    )
}
