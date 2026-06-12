import * as React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import Dashboard from "@/app/dashboard/page"
import { Projects } from "@/app/projects/page"
import { ProjectDetail } from "@/app/projects/project-detail"
import { Allocation } from "@/app/allocation/page"
import { TimeEntry } from "@/app/time-entry/page"
import { PmApprovalsPage } from "@/app/pm-approvals/page"
import SkillsPage from "@/app/skills/page"
import OkrsPage from "@/app/okrs/page"
import { LoginPage } from "@/app/login/page"
import InsightsCenterPage from "@/app/insights/page"
import ReportsPage from "@/app/reports/page"
import UserControlPage from "@/app/user-control/page"
import InputsPage from "@/app/inputs/page"
import SystemHealthPage from "@/app/system-health/page"
import WeeklyPlannerPage from "@/app/weekly-planner/page"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { getHomeRoute } from "@/lib/home-route"
import { RoleRoute } from "@/components/shared/role-route"
import { GoogleOAuthProvider } from "@react-oauth/google"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE"

function ErrorPage({ error }: { error: any }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-10">
      <h1 className="text-2xl font-bold text-red-700 mb-4">Application Crash</h1>
      <pre className="bg-white p-4 border border-red-200 rounded text-sm overflow-auto max-w-full">
        {error?.message || String(error)}
      </pre>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Reload Page
      </button>
    </div>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} />
    }
    return this.props.children
  }
}

/** Redirects to /login if no user is authenticated */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

/** Redirects to role home if user is already logged in */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) {
    return <Navigate to={getHomeRoute(user.role)} replace />
  }
  return <>{children}</>
}

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={getHomeRoute(user?.role)} replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicOnlyRoute>
          <LoginPage />
        </PublicOnlyRoute>
      } />

      {/* Protected Routes (Wrapped in AppShell) */}
      <Route element={
        <ProtectedRoute>
          <RoleRoute>
            <AppShell />
          </RoleRoute>
        </ProtectedRoute>
      }>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/allocation" element={<Allocation />} />
        <Route path="/weekly-planner" element={<WeeklyPlannerPage />} />
        <Route path="/time-entry" element={<TimeEntry />} />
        <Route path="/pm-approvals" element={<PmApprovalsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/okrs" element={<OkrsPage />} />
        <Route path="/insights" element={<InsightsCenterPage />} />
        <Route path="/ai-analytics" element={<Navigate to="/insights" replace />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/user-control" element={<UserControlPage />} />
        <Route path="/inputs" element={<InputsPage />} />
        <Route path="/system-health" element={<SystemHealthPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App
