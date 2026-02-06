import type { ReactNode } from "react"
import { useAuth, type Role } from "@/lib/auth-context"

interface RoleGuardProps {
    children: ReactNode
    allowedRoles: Role[]
    fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
    const { user } = useAuth()

    if (!user) return null

    if (allowedRoles.includes(user.role)) {
        return <>{children}</>
    }

    return <>{fallback}</>
}
