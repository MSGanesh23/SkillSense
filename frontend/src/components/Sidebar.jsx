import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            style={({ isActive }) =>
              isActive
                ? { borderColor: "#eab308", color: "#fde047" }
                : { color: "#fef08a" }
            }
          >
            <span>👑</span>
            Admin Portal
          </NavLink>
        )}

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <span>⌂</span>
          Dashboard
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <span>◈</span>
          My Skills
        </NavLink>

        <NavLink
          to="/progress"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <span>✓</span>
          Your Progress
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <NavLink to="/dashboard" className="sidebar-link">
          <span>⚙</span>
          Settings
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;