import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

function Sidebar() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Exactly one item is active depending on current URL & section
  const isSkillsActive =
    location.hash === "#skills" ||
    location.pathname.startsWith("/skills");

  const isDashboardActive =
    location.pathname === "/dashboard" && !isSkillsActive;

  const isProgressActive =
    location.pathname === "/progress" ||
    location.pathname.startsWith("/assessments");

  const isAdminActive = location.pathname.startsWith("/admin");

  // Smooth scroll to skills section if #skills hash is in URL
  useEffect(() => {
    if (location.pathname === "/dashboard" && location.hash === "#skills") {
      const skillsSection = document.querySelector(".skills-section");
      if (skillsSection) {
        skillsSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location.pathname, location.hash]);

  const handleDashboardClick = (e) => {
    if (location.pathname === "/dashboard") {
      e.preventDefault();
      if (location.hash) {
        navigate("/dashboard", { replace: true });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleMySkillsClick = (e) => {
    e.preventDefault();
    if (location.pathname === "/dashboard") {
      const skillsSection = document.querySelector(".skills-section");
      if (skillsSection) {
        skillsSection.scrollIntoView({ behavior: "smooth" });
      }
      navigate("/dashboard#skills", { replace: true });
    } else {
      navigate("/dashboard#skills");
    }
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {isAdmin && (
          <Link
            to="/admin"
            className={`sidebar-link admin-link ${isAdminActive ? "active" : ""}`}
          >
            <span className="sidebar-icon">👑</span>
            <span className="sidebar-text">Admin Portal</span>
          </Link>
        )}

        <Link
          to="/dashboard"
          onClick={handleDashboardClick}
          className={`sidebar-link ${isDashboardActive ? "active" : ""}`}
        >
          <span className="sidebar-icon">⌂</span>
          <span className="sidebar-text">Dashboard</span>
        </Link>

        <Link
          to="/dashboard#skills"
          onClick={handleMySkillsClick}
          className={`sidebar-link ${isSkillsActive ? "active" : ""}`}
        >
          <span className="sidebar-icon">◈</span>
          <span className="sidebar-text">My Skills</span>
        </Link>

        <Link
          to="/progress"
          className={`sidebar-link ${isProgressActive ? "active" : ""}`}
        >
          <span className="sidebar-icon">✓</span>
          <span className="sidebar-text">Your Progress</span>
        </Link>
      </nav>

      <div className="sidebar-bottom">
        <Link to="/dashboard" className="sidebar-link">
          <span className="sidebar-icon">⚙</span>
          <span className="sidebar-text">Settings</span>
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;