import { useState } from "react"
import { NavLink } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    Clock,
    Target,
    FileBarChart,
    List,
    Sparkles,
    ClipboardCheck,
    Shield,
    CalendarRange,
    Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Employees & Projects", icon: FolderKanban, path: "/projects" },
    { label: "Resource Allocation", icon: Users, path: "/allocation" },
    { label: "Weekly Planner", icon: CalendarRange, path: "/weekly-planner" },
    { label: "Time Entry", icon: Clock, path: "/time-entry" },
    { label: "PM Approvals", icon: ClipboardCheck, path: "/pm-approvals" },
    { label: "OKRs", icon: Target, path: "/okrs" },
    { label: "Insights Center", icon: Sparkles, path: "/insights" },
    { label: "Reports", icon: FileBarChart, path: "/reports" },
    { label: "Skill Master", icon: List, path: "/skills" },
    { label: "Inputs", icon: Upload, path: "/inputs" },
    { label: "User Control", icon: Shield, path: "/user-control" },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className, ...props }: SidebarProps) {
    const { user } = useAuth()
    const [collapsed, setCollapsed] = useState(false)

    const allowedRoles: Record<string, string[]> = {
        "/dashboard": ["Admin", "Project Manager"],
        "/projects": ["Admin", "Project Manager"],
        "/allocation": ["Admin", "Project Manager"],
        "/weekly-planner": ["Admin", "Project Manager"],
        "/time-entry": ["*"],
        "/pm-approvals": ["Admin", "Project Manager"],
        "/okrs": ["*"],
        "/reports": ["Admin", "Project Manager"],
        "/insights": ["Admin", "Project Manager"],
        "/skills": ["Admin"],
        "/inputs": ["Admin"],
        "/user-control": ["Admin"],
    }

    const filteredItems = navItems.filter(item => {
        if (!user) return false
        if (user.role === "Admin") return true
        const roles = allowedRoles[item.path]
        if (!roles) return true
        if (roles.includes("*")) return true
        return roles.includes(user.role)
    })

    const toggleCollapsed = () => setCollapsed((prev) => !prev)

    return (
        <aside
            className={cn(
                "bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0",
                "transition-[width] duration-300 ease-in-out overflow-hidden",
                collapsed ? "w-[4.5rem]" : "w-64",
                className
            )}
            aria-expanded={!collapsed}
            {...props}
        >
            <div className={cn("border-b border-gray-100", collapsed ? "p-3" : "p-4")}>
                <div
                    className={cn(
                        "flex items-center min-w-0",
                        collapsed ? "justify-center" : "gap-3"
                    )}
                >
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        className="rounded-lg shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-expanded={!collapsed}
                    >
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">R</span>
                        </div>
                    </button>
                    <span
                        className={cn(
                            "font-bold text-gray-900 text-lg whitespace-nowrap transition-all duration-300 ease-in-out",
                            collapsed
                                ? "opacity-0 max-w-0 overflow-hidden"
                                : "opacity-100 max-w-[8rem]"
                        )}
                        aria-hidden={collapsed}
                    >
                        R360
                    </span>
                </div>
            </div>

            <nav
                className={cn(
                    "sidebar-nav-scroll flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-3",
                    collapsed ? "px-2" : "px-3"
                )}
            >
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }: { isActive: boolean }) =>
                            cn(
                                "flex items-center rounded-lg transition-colors duration-200",
                                collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3",
                                isActive
                                    ? "bg-brand-50 text-brand-600"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span
                            className={cn(
                                "font-medium text-sm whitespace-nowrap transition-all duration-300 ease-in-out",
                                collapsed
                                    ? "opacity-0 max-w-0 overflow-hidden"
                                    : "opacity-100 max-w-[12rem]"
                            )}
                        >
                            {item.label}
                        </span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}
