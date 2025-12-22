
"use client";
import { useState, useEffect } from "react";
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
    { username: "admin@marcopolo.com", fullName: "Admin", password: "Marcopolo$", role: "admin" }
  ]);

  useEffect(() => {
    // Load users from localStorage if present
    const stored = localStorage.getItem("mp-invoice-users");
    if (stored) {
      try {
        setUsers(JSON.parse(stored));
      } catch {}
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
        localStorage.setItem("mp-invoice-auth", "1");
        localStorage.setItem("mp-invoice-user", JSON.stringify(user));
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
