import * as React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { Dashboard } from "@/app/dashboard/page"
import { Projects } from "@/app/projects/page"
import { ProjectDetail } from "@/app/projects/project-detail"
import { Allocation } from "@/app/allocation/page"
import { TimeEntry } from "@/app/time-entry/page"
// import { Login } from "@/app/auth/login" // Placeholder

import { AuthProvider } from "@/lib/auth-context"

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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
