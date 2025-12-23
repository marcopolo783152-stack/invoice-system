
"use client";
import { useState, useEffect } from "react";
import { logActivity } from "@/lib/audit-logger";
import styles from "./Login.module.css";

export interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([
    { username: "admin@marcopolo.com", fullName: "Nazif", password: "Marcopolo$", role: "admin" },
    { username: "manager@marcopolo.com", fullName: "Farid", password: "manager", role: "manager" }
  ]);

  useEffect(() => {
    // Load users from localStorage if present
    const stored = localStorage.getItem("mp-invoice-users");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setUsers(parsed);
      } catch { }
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const user = users.find(
        u => u.username.trim().toLowerCase() === username.trim().toLowerCase() && u.password === password
      );
      if (user) {
        sessionStorage.setItem("mp-invoice-auth", "1");
        sessionStorage.setItem("mp-invoice-user", JSON.stringify(user));
        logActivity('Login', `User ${user.fullName} logged in successfully`);
        // Also clear local storage just in case old session exists
        localStorage.removeItem("mp-invoice-auth");
        localStorage.removeItem("mp-invoice-user");
        onLogin();
      } else {
        setError("Invalid username or password");
      }
      setLoading(false);
    }, 500);
  }

  return (
    <div className={styles.loginContainer}>
      <form className={styles.loginForm} onSubmit={handleSubmit}>
        <h2>Login</h2>
        <input
          type="email"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </form>
    </div>
  );
};

export default Login;
