import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "G";
  const roleName = isAdmin ? "Administrator" : "Learner";
  const isLoginPage = location.pathname === "/login";

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand" style={{ textDecoration: "none", color: "inherit" }}>
        SkillSense
      </Link>

      <div className="navbar-actions">
        {isAuthenticated && isAdmin && (
          <Link to="/admin" className="admin-nav-badge">
            👑 Admin Portal
          </Link>
        )}

        {isAuthenticated && (
          <button className="icon-button" aria-label="Notifications">
            🔔
          </button>
        )}

        {isAuthenticated ? (
          <div className="profile-container">
            <div className="profile">
              <div className="profile-avatar">
                {initial}
              </div>

              <div className="profile-info">
                <span className="profile-name">{user?.name || "User"}</span>
                <span className="profile-role">{roleName}</span>
              </div>
            </div>

            <button
              type="button"
              className="navbar-logout-btn"
              onClick={handleLogout}
              title="Sign out"
            >
              Sign Out
            </button>
          </div>
        ) : (
          !isLoginPage && (
            <Link to="/login" className="navbar-login-btn">
              Sign In
            </Link>
          )
        )}
      </div>
    </header>
  );
}

export default Navbar;