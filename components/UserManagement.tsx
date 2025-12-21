import { useState } from "react";
import styles from "./UserManagement.module.css";

export interface User {
  username: string;
  password: string;
  role: "admin" | "seller" | "manager";
}

const DEFAULT_USERS: User[] = [
  { username: "admin@marcopolo.com", password: "Marcopolo$", role: "admin" },
];

export default function UserManagement({ users, setUsers }: { users: User[]; setUsers: (u: User[]) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("seller");
  const [error, setError] = useState("");

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Username and password required");
      return;
    }
    if (users.some(u => u.username === username)) {
      setError("User already exists");
      return;
    }
    setUsers([...users, { username, password, role }]);
    setUsername("");
    setPassword("");
    setRole("seller");
  }

  function handleDeleteUser(u: User) {
    if (u.role === "admin") return;
    setUsers(users.filter(user => user.username !== u.username));
  }

  return (
    <div className={styles.userMgmtContainer}>
      <h3>User Management</h3>
      <form className={styles.userForm} onSubmit={handleAddUser}>
        <input
          type="email"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <select value={role} onChange={e => setRole(e.target.value as User["role"]) }>
          <option value="seller">Seller</option>
          <option value="manager">Manager</option>
        </select>
        <button type="submit">Add User</button>
        {error && <div className={styles.error}>{error}</div>}
      </form>
      <ul className={styles.userList}>
        {users.map(u => (
          <li key={u.username}>
            {u.username} ({u.role})
            {u.role !== "admin" && (
              <button onClick={() => handleDeleteUser(u)} className={styles.deleteBtn}>Delete</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
