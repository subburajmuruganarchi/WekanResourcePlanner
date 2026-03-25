import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Shield, Search, ChevronDown, Check, X, ToggleLeft, ToggleRight, Loader2 } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { api } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────
interface SystemRole {
    id: string
    name: string
}

interface UserEntry {
    id: string
    name: string
    email: string
    department?: string
    position?: string
    role?: string
    roleId?: string
    isActive?: boolean
    status: string
}

// Only these 3 roles are allowed as system access roles
const SYSTEM_ROLE_NAMES = ["Employee", "Project Manager", "Admin"]

// Role badge colors
function getRoleBadge(role: string | undefined): { bg: string; text: string; border: string } {
    switch (role) {
        case "Admin":
            return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" }
        case "Project Manager":
            return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" }
        case "Employee":
            return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" }
        default:
            return { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" }
    }
}

// ── Role Selector Dropdown (Portal-based) ─────────────────────
interface RoleSelectorProps {
    userId: string
    currentRoleId: string | undefined
    systemRoles: SystemRole[]
    onRoleChange: (userId: string, roleId: string) => Promise<void>
}

function RoleSelector({ userId, currentRoleId, systemRoles, onRoleChange }: RoleSelectorProps) {
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
    const currentRole = systemRoles.find(r => r.id === currentRoleId)

    // Calculate position when opening
    useEffect(() => {
        if (open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPos({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 220),
            })
        }
    }, [open])

    // Close on scroll
    useEffect(() => {
        if (!open) return
        const handleScroll = () => setOpen(false)
        window.addEventListener("scroll", handleScroll, true)
        return () => window.removeEventListener("scroll", handleScroll, true)
    }, [open])

    const handleSelect = async (roleId: string) => {
        if (roleId === currentRoleId) { setOpen(false); return }
        setSaving(true)
        setOpen(false)
        try {
            await onRoleChange(userId, roleId)
        } finally {
            setSaving(false)
        }
    }

    if (saving) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
            </div>
        )
    }

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setOpen(p => !p)}
                className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 w-full max-w-[200px]"
            >
                <span className="flex-1 text-left text-gray-700 truncate">{currentRole?.name ?? "No Role"}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && createPortal(
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
                    {/* Dropdown */}
                    <div
                        className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                        style={{
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            maxHeight: 300,
                            overflowY: "auto",
                        }}
                    >
                        {systemRoles.map(role => {
                            const badge = getRoleBadge(role.name)
                            const isSelected = role.id === currentRoleId
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => handleSelect(role.id)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${isSelected ? "bg-brand-50 text-brand-700" : "text-gray-700"}`}
                                >
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border truncate ${badge.bg} ${badge.text} ${badge.border}`}>
                                        {role.name}
                                    </span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 ml-2" />}
                                </button>
                            )
                        })}
                    </div>
                </>,
                document.body
            )}
        </>
    )
}

// ── Main Page ────────────────────────────────────────────────
export default function UserControlPage() {
    const [users, setUsers] = useState<UserEntry[]>([])
    const [systemRoles, setSystemRoles] = useState<SystemRole[]>([])
    const [search, setSearch] = useState("")
    const [filterRole, setFilterRole] = useState<string>("all")
    const [loading, setLoading] = useState(true)
    const [toastMsg, setToastMsg] = useState<string | null>(null)
    const [toastType, setToastType] = useState<"success" | "error">("success")

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToastMsg(msg)
        setToastType(type)
        setTimeout(() => setToastMsg(null), 3000)
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [empRes, roleRes] = await Promise.all([
                api.get('/employees'),
                api.get('/roles'),
            ])

            // Axios wraps response in `.data`; our backend sends `{ status, data: [...] }`
            const empData: any[] = (empRes as any).data?.data ?? (empRes as any).data ?? []
            const roleData: any[] = (roleRes as any).data?.data ?? (roleRes as any).data ?? []

            const mappedUsers: UserEntry[] = empData.map((e: any) => ({
                id: e.id ?? e._id,
                name: e.name,
                email: e.email,
                department: e.department,
                position: e.position,
                role: e.role,
                roleId: e.roleId ?? e.role_id,
                // Prefer explicit is_active, fall back to status check
                isActive: typeof e.is_active === 'boolean' ? e.is_active : e.status === 'Active',
                status: e.status ?? 'Active',
            }))

            // Map roles and filter to only the 3 system access roles
            const mappedRoles: SystemRole[] = roleData
                .map((r: any) => ({
                    id: r.id ?? r._id,
                    name: r.name ?? r.role_name,
                }))
                .filter((r: SystemRole) => SYSTEM_ROLE_NAMES.includes(r.name))

            setUsers(mappedUsers)
            setSystemRoles(mappedRoles)
        } catch (err) {
            console.error('Failed to load user control data:', err)
            showToast('Failed to load data', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handleRoleChange = async (userId: string, roleId: string) => {
        try {
            await api.patch(`/employees/${userId}/role`, { role_id: roleId })
            const roleObj = systemRoles.find(r => r.id === roleId)
            setUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, roleId, role: roleObj?.name }
                    : u
            ))
            showToast(`Role updated to "${roleObj?.name}"`, 'success')
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Failed to update role'
            showToast(msg, 'error')
            throw err
        }
    }

    const handleToggleActive = async (user: UserEntry) => {
        const newActive = !user.isActive
        try {
            // Use dedicated /access endpoint — does NOT require role_id
            await api.patch(`/employees/${user.id}/access`, { is_active: newActive })
            setUsers(prev => prev.map(u =>
                u.id === user.id
                    ? { ...u, isActive: newActive, status: newActive ? 'Active' : 'Inactive' }
                    : u
            ))
            showToast(`${user.name} is now ${newActive ? 'Active' : 'Inactive'}`, 'success')
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Failed to update access'
            showToast(msg, 'error')
        }
    }

    // Filter
    const filtered = users.filter(u => {
        const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
        const matchRole = filterRole === "all" || (u.role ?? "No Role") === filterRole
        return matchSearch && matchRole
    })

    // Stat summary
    const adminCount = users.filter(u => u.role === "Admin").length
    const pmCount = users.filter(u => u.role === "Project Manager").length
    const activeCount = users.filter(u => u.isActive !== false && u.status === 'Active').length

    return (
        <PageContainer className="space-y-6">
            {/* Toast */}
            {toastMsg && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toastType === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {toastType === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {toastMsg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">User Control</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Manage user roles and system access</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Users", value: users.length, color: "text-gray-900" },
                    { label: "Active", value: activeCount, color: "text-green-600" },
                    { label: "Admins", value: adminCount, color: "text-purple-600" },
                    { label: "Project Managers", value: pmCount, color: "text-blue-600" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    />
                </div>
                <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                >
                    <option value="all">All Roles</option>
                    {systemRoles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                </select>
            </div>

            {/* User Table */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 bg-gray-50 rounded-t-xl border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>User</span>
                    <span className="w-52 text-center">System Role</span>
                    <span className="w-20 text-center">Access</span>
                    <span className="w-8" />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        <span className="ml-2 text-gray-500 text-sm">Loading users...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 text-sm">No users found.</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(user => {
                            const badge = getRoleBadge(user.role)
                            const isInactive = user.isActive === false || user.status === 'Inactive'

                            return (
                                <div
                                    key={user.id}
                                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-gray-50/50 transition-colors ${isInactive ? "opacity-60" : ""}`}
                                >
                                    {/* User info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-sm font-semibold text-brand-700">
                                            {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            {user.department && (
                                                <p className="text-xs text-gray-400 truncate">{user.department}{user.position ? ` · ${user.position}` : ''}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Role selector */}
                                    <div className="w-52">
                                        <RoleSelector
                                            userId={user.id}
                                            currentRoleId={user.roleId}
                                            systemRoles={systemRoles}
                                            onRoleChange={handleRoleChange}
                                        />
                                    </div>

                                    {/* Active toggle */}
                                    <div className="w-20 flex justify-center">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                                            title={isInactive ? "Enable access" : "Disable access"}
                                        >
                                            {isInactive ? (
                                                <>
                                                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                                                    <span className="text-gray-400">Off</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleRight className="w-5 h-5 text-green-500" />
                                                    <span className="text-green-600">On</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Current role badge */}
                                    <div className="w-8 flex justify-end">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border hidden sm:inline-flex ${badge.bg} ${badge.text} ${badge.border}`}>
                                            {user.role?.charAt(0) ?? "?"}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </PageContainer>
    )
}
