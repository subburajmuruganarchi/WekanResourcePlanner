import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api } from "./api"
import { normalizeRoleName } from "./role-utils"

export type Role = "Admin" | "Project Manager" | "Employee" | "User" | "CEO" | "Delivery Manager" | string

export interface User {
    id: string
    name: string
    role: Role
    email: string
    avatar?: string
    /** Job role from Resource sheet (e.g. SDE II (Full Stack)). */
    jobRole?: string
    /** Fallback title when job role is not set. */
    position?: string
}

interface BackendAuthUser {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    jobRole?: string
    position?: string
}

function mapBackendUser(userData: BackendAuthUser): User {
    return {
        id: userData.id,
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email,
        role: normalizeRoleName(userData.role) as Role,
        jobRole: userData.jobRole?.trim() || undefined,
        position: userData.position?.trim() || undefined,
    }
}

interface AuthContextType {
    user: User | null
    login: (email: string, passwordString: string) => Promise<User>
    googleLogin: (idToken: string) => Promise<User>
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
            const parsed = JSON.parse(stored) as User
            return { ...parsed, role: normalizeRoleName(parsed.role) }
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

    // Refresh profile (job role from Resource sheet) for existing sessions
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY)
        if (!token) return

        let cancelled = false
        api.get('/auth/me')
            .then((response) => {
                if (cancelled || response.data?.status !== 'success') return
                const userData = response.data.data?.user as BackendAuthUser | undefined
                if (!userData) return
                setUser(mapBackendUser(userData))
            })
            .catch(() => {
                // 401 handled globally by api interceptor
            })

        return () => {
            cancelled = true
        }
    }, [])

    const login = async (email: string, passwordString: string) => {
        setIsLoading(true)
        try {
            const response = await api.post('/auth/login', { email, password: passwordString })
            
            if (response.data?.status === 'success') {
                const { token, user: userData } = response.data.data
                
                // Save the token securely in local storage
                localStorage.setItem(TOKEN_KEY, token)
                
                const mappedUser = mapBackendUser(userData as BackendAuthUser)

                setUser(mappedUser)
                return mappedUser
            } else {
                throw new Error(response.data?.message || 'Login failed')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const googleLogin = async (idToken: string) => {
        setIsLoading(true)
        try {
            const response = await api.post('/auth/google-login', { idToken })
            
            if (response.data?.status === 'success') {
                const { token, user: userData } = response.data.data
                localStorage.setItem(TOKEN_KEY, token)
                
                const mappedUser = mapBackendUser(userData as BackendAuthUser)

                setUser(mappedUser)
                return mappedUser
            } else {
                throw new Error(response.data?.message || 'Google login failed')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, login, googleLogin, logout, isLoading }}>
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
