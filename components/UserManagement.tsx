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

interface UserManagementProps {
  users: {
    username: string;
    password: string;
    role: "admin" | "seller" | "manager";
  }[];
  setUsers: (u: {
    username: string;
    password: string;
    role: "admin" | "seller" | "manager";
  }[]) => void;
}

export default function UserManagement({ users, setUsers }: UserManagementProps) {
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


  // Change password state
  const [changePwUser, setChangePwUser] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [pwMsg, setPwMsg] = useState<string>("");

  function handleDeleteUser(u: User) {
    if (u.role === "admin") return;
    setUsers(users.filter(user => user.username !== u.username));
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!changePwUser || !newPassword) {
      setPwMsg("Select user and enter new password");
      return;
    }
    setUsers(users.map(u => u.username === changePwUser ? { ...u, password: newPassword } : u));
    setPwMsg("Password updated for " + changePwUser);
    setChangePwUser("");
    setNewPassword("");
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
      <form className={styles.userForm} onSubmit={handleChangePassword} style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
        <label style={{ fontWeight: 500 }}>Change Password:</label>
        <select value={changePwUser} onChange={e => setChangePwUser(e.target.value)} required style={{ marginLeft: 8 }}>
          <option value="">Select user</option>
          {users.map(u => (
            <option key={u.username} value={u.username}>{u.username} ({u.role})</option>
          ))}
        </select>
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
          style={{ marginLeft: 8 }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>Change</button>
        {pwMsg && <span style={{ marginLeft: 12, color: 'green' }}>{pwMsg}</span>}
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
