
"use client";
import { useState, useEffect } from "react";
import { logActivity } from "@/lib/audit-logger";
import styles from "./Login.module.css";
import { getUsers } from "@/lib/user-storage";
import { DEFAULT_USERS } from "./UserManagement";

export interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState(DEFAULT_USERS);

  useEffect(() => {
    // Load users from Cloud/Local via Storage Service
    async function loadUsers() {
      const loadedUsers = await getUsers();
      if (loadedUsers && loadedUsers.length > 0) {
        setUsers(loadedUsers);
      }
    }
    loadUsers();
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

        // Trigger RootLayout reactive check immediately
        window.dispatchEvent(new Event('storage'));

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
      <img src="/LOGO.png" alt="" className={styles.watermark} aria-hidden="true" />

      <form className={styles.loginForm} onSubmit={handleSubmit}>
        <div className={styles.logoWrapper}>
          <img src="/LOGO.png" alt="Platform Logo" className={styles.logo} />
        </div>

        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Global Store System</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>Sign in to manage your store</p>

        <input
          type="email"
          placeholder="Email Address"
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
          {loading ? "Authenticating..." : "Login to Dashboard"}
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </form>
    </div>
  );
};

export default Login;
