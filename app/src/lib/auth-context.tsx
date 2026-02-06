import { createContext, useContext, useState, type ReactNode } from "react"

export type Role = "Admin" | "ProjectManager" | "Employee" | "Leadership"

export interface User {
    id: string
    name: string
    role: Role
    avatar?: string
}

interface AuthContextType {
    user: User | null
    login: (role: Role) => void
    logout: () => void
    switchRole: (role: Role) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_USERS: Record<Role, User> = {
    Admin: { id: "1", name: "Alice Admin", role: "Admin" },
    ProjectManager: { id: "2", name: "Bob Manager", role: "ProjectManager" },
    Employee: { id: "3", name: "Charlie Dev", role: "Employee" },
    Leadership: { id: "4", name: "Diana Lead", role: "Leadership" }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(MOCK_USERS["Admin"]) // Default to Admin for dev

    const login = (role: Role) => {
        setUser(MOCK_USERS[role])
    }

    const logout = () => {
        setUser(null)
    }

    const switchRole = (role: Role) => {
        setUser(MOCK_USERS[role])
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, switchRole }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
