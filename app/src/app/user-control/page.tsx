import { useState, useEffect, useCallback } from "react"
import { Shield, Search, Check, X, Loader2 } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { api } from "@/lib/api"
import { UserControlCards, type UserEntry, type SystemRole } from "./components/user-control-cards"

const SYSTEM_ROLE_NAMES = ["Employee", "Project Manager", "Admin"]

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
                isActive: typeof e.is_active === 'boolean' ? e.is_active : e.status === 'Active',
                status: e.status ?? 'Active',
            }))

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

    const filtered = users.filter(u => {
        const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
        const matchRole = filterRole === "all" || (u.role ?? "No Role") === filterRole
        return matchSearch && matchRole
    })

    const adminCount = users.filter(u => u.role === "Admin").length
    const pmCount = users.filter(u => u.role === "Project Manager").length
    const activeCount = users.filter(u => u.isActive !== false && u.status === 'Active').length

    return (
        <PageContainer className="space-y-6">
            {toastMsg && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toastType === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {toastType === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {toastMsg}
                </div>
            )}

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

            {loading ? (
                <div className="flex items-center justify-center py-16 bg-white border border-gray-100 rounded-xl">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                    <span className="ml-2 text-gray-500 text-sm">Loading users…</span>
                </div>
            ) : (
                <UserControlCards
                    users={filtered}
                    systemRoles={systemRoles}
                    onRoleChange={handleRoleChange}
                    onToggleActive={handleToggleActive}
                />
            )}
        </PageContainer>
    )
}
