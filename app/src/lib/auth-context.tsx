import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api } from "./api"

export type Role = "Admin" | "ProjectManager" | "Employee" | "Leadership" | "User" | "Frontend Developer" | "Backend Developer" | "Full Stack Engineer" | string

export interface User {
    id: string
    name: string
    role: Role
    email: string
    avatar?: string
}

interface AuthContextType {
    user: User | null
    login: (email: string, passwordString: string) => Promise<void>
    logout: () => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "r360_auth_user"
const TOKEN_KEY = "r360_auth_token"

function loadUserFromStorage(): User | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored) as User
        }
    } catch {
        // Ignore parse errors
    }
    return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => loadUserFromStorage())
    const [isLoading, setIsLoading] = useState(false)

    // Persist user to localStorage whenever it changes
    useEffect(() => {
        if (user) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
        } else {
            localStorage.removeItem(STORAGE_KEY)
            localStorage.removeItem(TOKEN_KEY)
        }
    }, [user])

    const login = async (email: string, passwordString: string) => {
        setIsLoading(true)
        try {
            const response = await api.post('/auth/login', { email, password: passwordString })
            
            if (response.data?.status === 'success') {
                const { token, user: userData } = response.data.data
                
                // Save the token securely in local storage
                localStorage.setItem(TOKEN_KEY, token)
                
                // Map backend user to frontend User interface
                const mappedUser: User = {
                    id: userData.id,
                    name: `${userData.firstName} ${userData.lastName}`.trim(),
                    email: userData.email,
                    role: userData.role as Role,
                }
                
                setUser(mappedUser)
            } else {
                throw new Error(response.data?.message || 'Login failed')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
