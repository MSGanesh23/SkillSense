import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setFormError("Please enter your name.");
          setSubmitting(false);
          return;
        }
        const user = await register(name, email, password, role);
        redirectUser(user);
      } else {
        const user = await login(email, password);
        redirectUser(user);
      }
    } catch (err) {
      setFormError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  function redirectUser(user) {
    if (from) {
      navigate(from, { replace: true });
    } else if (user.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-badge">AUTHENTICATION</div>
          <h1>SkillSense Access</h1>
          <p>Sign in to manage curriculum or access your personalized learning dashboard.</p>
        </div>

        {/* Main Card */}
        <div className="login-card">
          {/* Tab Selector */}
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${!isRegister ? "active" : ""}`}
              onClick={() => {
                setIsRegister(false);
                setFormError("");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login-tab ${isRegister ? "active" : ""}`}
              onClick={() => {
                setIsRegister(true);
                setFormError("");
              }}
            >
              Create Account
            </button>
          </div>

          {formError && (
            <div className="login-error-banner">
              <span>⚠️</span> {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {isRegister && (
              <div className="form-group">
                <label htmlFor="reg-name">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isRegister && (
              <div className="form-group">
                <label htmlFor="reg-role">Role Selection</label>
                <select
                  id="reg-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="role-select"
                >
                  <option value="user">Learner / Student (Assessment & Remediation)</option>
                  <option value="admin">Administrator (CRUD Updates & Analytics)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="login-submit-button"
              disabled={submitting}
            >
              {submitting
                ? "Processing..."
                : isRegister
                ? "Create Account & Sign In"
                : "Sign In to SkillSense"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default Login;
