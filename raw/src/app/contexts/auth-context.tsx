import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "employee" | "project-manager" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: Record<string, { password: string; user: User }> = {
  "admin@wekan.com": {
    password: "admin123",
    user: {
      id: "1",
      name: "Kevin Jose",
      email: "admin@wekan.com",
      role: "admin",
    },
  },
  "pm@wekan.com": {
    password: "pm123",
    user: {
      id: "2",
      name: "Sarah Chen",
      email: "pm@wekan.com",
      role: "project-manager",
    },
  },
  "employee@wekan.com": {
    password: "emp123",
    user: {
      id: "3",
      name: "Alice Johnson",
      email: "employee@wekan.com",
      role: "employee",
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem("wekan_user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        localStorage.removeItem("wekan_user");
        return null;
      }
    }
    return null;
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    const userRecord = mockUsers[email.toLowerCase()];
    if (userRecord && userRecord.password === password) {
      setUser(userRecord.user);
      localStorage.setItem("wekan_user", JSON.stringify(userRecord.user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("wekan_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}