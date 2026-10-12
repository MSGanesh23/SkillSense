import { createContext, useContext, useEffect, useState } from "react";
import {
  getAuthToken,
  setAuthToken,
  getMe,
  loginUser,
  registerUser,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Restore authenticated session on startup
  useEffect(() => {
    async function restoreSession() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getMe();
        setUser(userData);
        setToken(storedToken);
      } catch (err) {
        console.warn("Session restore failed, clearing token:", err);
        setAuthToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(email, password) {
    setError("");
    try {
      const result = await loginUser(email, password);
      setAuthToken(result.access_token);
      setToken(result.access_token);
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err.message || "Failed to log in.");
      throw err;
    }
  }

  async function register(name, email, password, role = "user") {
    setError("");
    try {
      const result = await registerUser(name, email, password, role);
      setAuthToken(result.access_token);
      setToken(result.access_token);
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err.message || "Failed to register.");
      throw err;
    }
  }

  function logout() {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setError("");
  }

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
