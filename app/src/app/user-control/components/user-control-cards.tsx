import { ToggleLeft, ToggleRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MasonryGrid, MasonryItem } from '@/components/shared/masonry-grid'
import { RoleSelector, type SystemRole } from './role-selector'

export interface UserEntry {
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

export type { SystemRole }

function getRoleBadge(role: string | undefined): { bg: string; text: string; border: string } {
    switch (role) {
        case 'Admin':
            return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
        case 'Project Manager':
            return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
        case 'Employee':
            return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
        default:
            return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
    }
}

interface UserControlCardsProps {
    users: UserEntry[]
    systemRoles: SystemRole[]
    onRoleChange: (userId: string, roleId: string) => Promise<void>
    onToggleActive: (user: UserEntry) => void
}

export function UserControlCards({
    users,
    systemRoles,
    onRoleChange,
    onToggleActive,
}: UserControlCardsProps) {
    if (users.length === 0) {
        return (
            <p className="text-center text-gray-500 py-12 bg-white border border-gray-200 rounded-xl">
                No users match your search.
            </p>
        )
    }

    return (
        <MasonryGrid>
            {users.map((user) => {
                const badge = getRoleBadge(user.role)
                const isInactive = user.isActive === false || user.status === 'Inactive'
                const initials = user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)

                return (
                    <MasonryItem key={user.id}>
                        <Card
                            className={`p-4 border-gray-200 shadow-sm hover:border-gray-300 transition-colors ${
                                isInactive ? 'opacity-75' : ''
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-sm font-semibold text-brand-700">
                                    {initials}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-gray-900 truncate">{user.name}</h4>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-3">
                                <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                                >
                                    {user.role ?? 'No role'}
                                </span>
                                <Badge
                                    variant={isInactive ? 'outline' : 'success'}
                                    className="text-[10px]"
                                >
                                    {isInactive ? 'Inactive' : 'Active'}
                                </Badge>
                            </div>

                            {(user.department || user.position) && (
                                <p className="text-xs text-gray-600 mt-2 leading-snug">
                                    {[user.position, user.department].filter(Boolean).join(' · ')}
                                </p>
                            )}

                            <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                        System role
                                    </p>
                                    <RoleSelector
                                        userId={user.id}
                                        currentRoleId={user.roleId}
                                        systemRoles={systemRoles}
                                        onRoleChange={onRoleChange}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        System access
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => onToggleActive(user)}
                                        className="flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2 py-1 hover:bg-gray-50"
                                        title={isInactive ? 'Enable access' : 'Disable access'}
                                    >
                                        {isInactive ? (
                                            <>
                                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                                                <span className="text-gray-500">Off</span>
                                            </>
                                        ) : (
                                            <>
                                                <ToggleRight className="w-5 h-5 text-green-500" />
                                                <span className="text-green-600">On</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </MasonryItem>
                )
            })}
        </MasonryGrid>
    )
}
