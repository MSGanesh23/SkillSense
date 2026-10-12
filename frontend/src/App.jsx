import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import SkillDetails from "./pages/SkillDetails";
import Assessment from "./pages/Assessment";
import AssessmentResults from "./pages/AssessmentResults";
import SkillGapAnalysis from "./pages/SkillGapAnalysis";
import AssessmentProgress from "./pages/AssessmentProgress";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";

function RootRoute() {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "75vh",
          color: "#94a3b8",
        }}
      >
        Loading SkillSense...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
}

function LoginRoute() {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  return <Login />;
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <div className="app">
      <Navbar />

      <div className={`app-body ${!isAuthenticated || isLoginPage ? "no-sidebar" : ""}`}>
        {isAuthenticated && !isLoginPage && <Sidebar />}

        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginRoute />} />

          {/* Root Route — Redirects to Login if unauthenticated, or to appropriate Dashboard */}
          <Route path="/" element={<RootRoute />} />

          {/* Protected Learner & Common Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/skills/:skillId"
            element={
              <ProtectedRoute>
                <SkillDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/skills/:skillId/assessment"
            element={
              <ProtectedRoute>
                <Assessment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assessments/:assessmentId/retest"
            element={
              <ProtectedRoute>
                <Assessment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assessments/:assessmentId/results"
            element={
              <ProtectedRoute>
                <AssessmentResults />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assessment-results"
            element={
              <ProtectedRoute>
                <AssessmentResults />
              </ProtectedRoute>
            }
          />

          <Route
            path="/skills/:skillId/gaps"
            element={
              <ProtectedRoute>
                <SkillGapAnalysis />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assessments/:assessmentId/gaps"
            element={
              <ProtectedRoute>
                <SkillGapAnalysis />
              </ProtectedRoute>
            }
          />

          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <AssessmentProgress />
              </ProtectedRoute>
            }
          />

          {/* Protected Administrator-Only Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;