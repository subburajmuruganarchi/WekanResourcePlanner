import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import { ProtectedRoute } from "./components/protected-route";
import { Layout } from "./components/layout/layout";
import { Login } from "./pages/login";
import { Dashboard } from "./pages/dashboard";
import { Projects } from "./pages/projects";
import { ProjectDetail } from "./pages/project-detail";
import { Skills } from "./pages/skills";
import { ResourceAllocation } from "./pages/resource-allocation";
import { TimeEntry } from "./pages/time-entry";
import { Reports } from "./pages/reports";

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="projects"
          element={
            <ProtectedRoute allowedRoles={["project-manager", "admin"]}>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="projects/:id"
          element={
            <ProtectedRoute allowedRoles={["project-manager", "admin"]}>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="skills"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Skills />
            </ProtectedRoute>
          }
        />
        <Route
          path="allocation"
          element={
            <ProtectedRoute allowedRoles={["project-manager", "admin"]}>
              <ResourceAllocation />
            </ProtectedRoute>
          }
        />
        <Route path="time-entry" element={<TimeEntry />} />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={["project-manager", "admin"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}