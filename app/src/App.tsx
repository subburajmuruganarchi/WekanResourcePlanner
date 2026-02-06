import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { Dashboard } from "@/app/dashboard/page"
import { Projects } from "@/app/projects/page"
import { ProjectDetail } from "@/app/projects/project-detail"
import { Allocation } from "@/app/allocation/page"
import { TimeEntry } from "@/app/time-entry/page"
// import { Login } from "@/app/auth/login" // Placeholder

import { AuthProvider } from "@/lib/auth-context"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<div>Login Page</div>} />

          {/* Protected Routes (Wrapped in AppShell) */}
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/allocation" element={<Allocation />} />
            <Route path="/time-entry" element={<TimeEntry />} />
            <Route path="/reports" element={<div>Reports Page</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
