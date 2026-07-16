import * as React from "react"
import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { LoginPage } from "@/app/login/page"
import { PageSkeleton } from "@/components/patterns"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { ThemeProvider } from "@/lib/theme-context"
import { ToastProvider } from "@/lib/toast-context"
import { loadMvpFeatures } from "@/lib/mvp-config"
import { getHomeRoute } from "@/lib/home-route"
import { RoleRoute } from "@/components/shared/role-route"

const Dashboard = lazy(() => import("@/app/dashboard/page"))
const Projects = lazy(() => import("@/app/projects/page").then((m) => ({ default: m.Projects })))
const ProjectDetail = lazy(() => import("@/app/projects/project-detail").then((m) => ({ default: m.ProjectDetail })))
const Allocation = lazy(() => import("@/app/allocation/page").then((m) => ({ default: m.Allocation })))
const TimeEntry = lazy(() => import("@/app/time-entry/page").then((m) => ({ default: m.TimeEntry })))
const PmApprovalsPage = lazy(() => import("@/app/pm-approvals/page").then((m) => ({ default: m.PmApprovalsPage })))
const ApprovalsPage = lazy(() => import("@/app/approvals/page"))
const BenchPage = lazy(() => import("@/app/bench/page"))
const SkillsPage = lazy(() => import("@/app/skills/page"))
const SkillsMatrixPage = lazy(() => import("@/app/skills-matrix/page"))
const AuditCenterPage = lazy(() => import("@/app/audit-center/page"))
const ResourceRequestsPage = lazy(() => import("@/app/resource-requests/page"))
const OkrsPage = lazy(() => import("@/app/okrs/page"))
const InsightsCenterPage = lazy(() => import("@/app/insights/page"))
const ReportsPage = lazy(() => import("@/app/reports/page"))
const UserControlPage = lazy(() => import("@/app/user-control/page"))
const InputsPage = lazy(() => import("@/app/inputs/page"))
const SystemHealthPage = lazy(() => import("@/app/system-health/page"))
const PortfoliosPage = lazy(() => import("@/app/portfolios/page"))
const ExecutiveDashboardPage = lazy(() => import("@/app/executive/page"))
const RiskRadarPage = lazy(() => import("@/app/executive/risk-radar/page"))
const DeliveryCommandPage = lazy(() => import("@/app/delivery/page"))
const DeliveryCapacityPage = lazy(() => import("@/app/delivery/capacity/page"))
const DeliveryWeeklyPlannerPage = lazy(() => import("@/app/weekly-planner/page"))
const DeliveryRecommendationsPage = lazy(() => import("@/app/delivery/recommendations/page"))
const PmDashboardPage = lazy(() => import("@/app/pm-workspace/page"))
const PmTimelinePage = lazy(() => import("@/app/pm-workspace/timeline/page"))
const PmTeamPage = lazy(() => import("@/app/pm-workspace/team/page"))
const PmStatusReportPage = lazy(() => import("@/app/pm-workspace/status-report/page"))
const PmRisksPage = lazy(() => import("@/app/pm-workspace/risks/page"))
const PmDecisionsPage = lazy(() => import("@/app/pm-workspace/decisions/page"))
const PmCommunicationPage = lazy(() => import("@/app/pm-workspace/communication/page"))
const EmployeeWorkspacePage = lazy(() => import("@/app/workspace/page"))
const AccountSettingsPage = lazy(() => import("@/app/account/page"))

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

function ErrorPage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-critical-bg p-10">
      <h1 className="text-2xl font-bold text-critical mb-4">Application Error</h1>
      <pre className="bg-card p-4 border border-critical-border rounded text-sm overflow-auto max-w-full text-card-foreground">
        {message}
      </pre>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 bg-brand-600 text-white rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Reload Page
      </button>
    </div>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: unknown }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error }
  }
  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error("ErrorBoundary caught an error", error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} />
    }
    return this.props.children
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

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
      <Route path="/login" element={
        <PublicOnlyRoute>
          <LoginPage />
        </PublicOnlyRoute>
      } />

      <Route element={
        <ProtectedRoute>
          <RoleRoute>
            <AppShell />
          </RoleRoute>
        </ProtectedRoute>
      }>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/workspace" element={<LazyPage><EmployeeWorkspacePage /></LazyPage>} />
        <Route path="/executive" element={<LazyPage><ExecutiveDashboardPage /></LazyPage>} />
        <Route path="/executive/portfolio-health" element={<Navigate to="/executive" replace />} />
        <Route path="/executive/customer-delivery" element={<Navigate to="/executive" replace />} />
        <Route path="/executive/capacity" element={<Navigate to="/executive" replace />} />
        <Route path="/executive/risk-radar" element={<LazyPage><RiskRadarPage /></LazyPage>} />
        <Route path="/executive/brief" element={<Navigate to="/executive" replace />} />
        <Route path="/delivery" element={<LazyPage><DeliveryCommandPage /></LazyPage>} />
        <Route path="/delivery/milestones" element={<Navigate to="/delivery" replace />} />
        <Route path="/delivery/capacity" element={<LazyPage><DeliveryCapacityPage /></LazyPage>} />
        <Route path="/delivery/weekly-planner" element={<LazyPage><DeliveryWeeklyPlannerPage /></LazyPage>} />
        <Route path="/delivery/raid" element={<Navigate to="/delivery" replace />} />
        <Route path="/delivery/recommendations" element={<LazyPage><DeliveryRecommendationsPage /></LazyPage>} />
        <Route path="/pm" element={<LazyPage><PmDashboardPage /></LazyPage>} />
        <Route path="/pm/timeline" element={<LazyPage><PmTimelinePage /></LazyPage>} />
        <Route path="/pm/team" element={<LazyPage><PmTeamPage /></LazyPage>} />
        <Route path="/pm/status-report" element={<LazyPage><PmStatusReportPage /></LazyPage>} />
        <Route path="/pm/risks" element={<LazyPage><PmRisksPage /></LazyPage>} />
        <Route path="/pm/decisions" element={<LazyPage><PmDecisionsPage /></LazyPage>} />
        <Route path="/pm/communication" element={<LazyPage><PmCommunicationPage /></LazyPage>} />
        <Route path="/dashboard" element={<LazyPage><Dashboard /></LazyPage>} />
        <Route path="/projects" element={<LazyPage><Projects /></LazyPage>} />
        <Route path="/projects/:id" element={<LazyPage><ProjectDetail /></LazyPage>} />
        <Route path="/allocation" element={<LazyPage><Allocation /></LazyPage>} />
        <Route path="/weekly-planner" element={<LazyPage><DeliveryWeeklyPlannerPage /></LazyPage>} />
        <Route path="/time-entry" element={<LazyPage><TimeEntry /></LazyPage>} />
        <Route path="/pm-approvals" element={<LazyPage><PmApprovalsPage /></LazyPage>} />
        <Route path="/approvals" element={<LazyPage><ApprovalsPage /></LazyPage>} />
        <Route path="/bench" element={<LazyPage><BenchPage /></LazyPage>} />
        <Route path="/skills" element={<LazyPage><SkillsPage /></LazyPage>} />
        <Route path="/skills-matrix" element={<LazyPage><SkillsMatrixPage /></LazyPage>} />
        <Route path="/audit-center" element={<LazyPage><AuditCenterPage /></LazyPage>} />
        <Route path="/resource-requests" element={<LazyPage><ResourceRequestsPage /></LazyPage>} />
        <Route path="/okrs" element={<LazyPage><OkrsPage /></LazyPage>} />
        <Route path="/insights" element={<LazyPage><InsightsCenterPage /></LazyPage>} />
        <Route path="/ai-analytics" element={<Navigate to="/insights" replace />} />
        <Route path="/reports" element={<LazyPage><ReportsPage /></LazyPage>} />
        <Route path="/user-control" element={<LazyPage><UserControlPage /></LazyPage>} />
        <Route path="/portfolios" element={<LazyPage><PortfoliosPage /></LazyPage>} />
        <Route path="/inputs" element={<LazyPage><InputsPage /></LazyPage>} />
        <Route path="/system-health" element={<LazyPage><SystemHealthPage /></LazyPage>} />
        <Route path="/account" element={<LazyPage><AccountSettingsPage /></LazyPage>} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

function App() {
  React.useEffect(() => {
    void loadMvpFeatures();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
