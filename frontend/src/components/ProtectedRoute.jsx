import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "75vh",
          color: "#94a3b8",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            border: "3px solid rgba(0, 229, 255, 0.2)",
            borderTopColor: "#00e5ff",
            borderRadius: "50%",
            animation: "authSpin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: "0.95rem", margin: 0 }}>Verifying credentials...</p>
        <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
