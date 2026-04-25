import React, { useState } from "react";
import { logActivity } from "@/lib/audit-logger";
import styles from "./UserManagement.module.css";

export interface User {
  username: string; // This is the Email/ID
  fullName: string;
  password: string;
  role: "admin" | "seller" | "manager";
  storeId?: string;
  storeName?: string;
}

export const DEFAULT_USERS: User[] = [
  { username: "admin@ariana.com", fullName: "Nazif", password: "Ariana$", role: "admin", storeId: '', storeName: 'Ariana Oriental Rugs' },
  { username: "manager@ariana.com", fullName: "Farid", password: "manager", role: "manager", storeId: '', storeName: 'Ariana Oriental Rugs' },
];


import { saveUser, deleteUser } from "@/lib/user-storage";

export interface UserManagementProps {
  users: User[];
  setUsers: (u: User[]) => void;
  currentUser?: { username: string; role: string } | null;
  onClose?: () => void;
}

export default function UserManagement({ users, setUsers, currentUser, onClose }: UserManagementProps) {
  // Form State
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("seller");
  const [storeId, setStoreId] = useState("");
  const [storeName, setStoreName] = useState("");

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [originalUsername, setOriginalUsername] = useState(""); // Key to identify user during edit
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");



  // Handler for form submission (Add or Update)
  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!username || !fullName || !password) {
      setError("All fields required");
      return;
    }

    // Check strictness for email format
    if (!username.includes('@')) {
      setError("Username must be a valid email");
      return;
    }

    if (isEditing) {
      // Update existing user
      // Check if new username conflicts with OTHER users
      if (username !== originalUsername && users.some(u => u.username === username)) {
        setError("Username (email) already exists");
        return;
      }

      // Inherit the store ID/Name from the current user constructing them if not super admin
      const storeToSaveId = (currentUser as any)?.storeId || storeId || '';
      const storeToSaveName = (currentUser as any)?.storeName || storeName || 'Ariana Oriental Rugs';

      const updatedUser: User = { username, fullName, password, role, storeId: storeToSaveId, storeName: storeToSaveName };

      // If username changed, we should delete the old one from storage?
      // saveUser uses username as key.
      if (originalUsername !== username) {
        await deleteUser(originalUsername);
      }

      await saveUser(updatedUser);

      setUsers(users.map(u => {
        if (u.username === originalUsername) {
          return updatedUser;
        }
        return u;
      }));
      logActivity('User Updated', `User ${fullName} (${username}) updated.`);
      setSuccessMsg("User updated successfully");
      resetForm();
    } else {
      // Add new user
      if (users.some(u => u.username === username)) {
        setError("User already exists");
        return;
      }
      const storeToSaveId = (currentUser as any)?.storeId || storeId || '';
      const storeToSaveName = (currentUser as any)?.storeName || storeName || 'Ariana Oriental Rugs';
      const newUser: User = { username, fullName, password, role, storeId: storeToSaveId, storeName: storeToSaveName };
      await saveUser(newUser);

      setUsers([...users, newUser]);
      logActivity('User Created', `User ${fullName} (${username}) created as ${role}.`);
      setSuccessMsg("User added successfully");
      resetForm();
    }
  }

  function resetForm() {
    setUsername("");
    setFullName("");
    setPassword("");
    setRole("seller");
    setIsEditing(false);
    setOriginalUsername("");
    setStoreId("");
    setStoreName("");
  }

  function handleEditClick(u: User) {
    setUsername(u.username);
    setFullName(u.fullName);
    setPassword(u.password);
    setRole(u.role);
    setStoreId(u.storeId || "");
    setStoreName(u.storeName || "");
    setIsEditing(true);
    setOriginalUsername(u.username);
    setError("");
    setSuccessMsg("");
  }

  async function handleDeleteUser(u: User) {
    if (u.role === "admin" && users.filter(user => user.role === 'admin').length <= 1) {
      setError("Cannot delete the only admin");
      return;
    }
    if (confirm(`Delete user ${u.fullName}?`)) {
      await deleteUser(u.username);
      setUsers(users.filter(user => user.username !== u.username));
      logActivity('User Deleted', `User ${u.fullName} (${u.username}) removed.`);
      if (isEditing && originalUsername === u.username) {
        resetForm();
      }
    }
  }

  return (
    <div className={styles.userMgmtContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <h3>User Management</h3>
        {onClose && <button type="button" onClick={onClose} style={{ padding: '4px 8px', cursor: 'pointer' }}>Close</button>}
      </div>

      <div style={{ marginBottom: 20, padding: 15, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>{isEditing ? 'Edit User' : 'Add New User'}</h4>
        <form className={styles.userForm} onSubmit={handleSaveUser}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Username (Email)</label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Full Name (Served By)</label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ width: '100%', padding: '8px 32px 8px 8px', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#666'
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as User["role"])}
                style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
                disabled={isEditing && originalUsername === currentUser?.username && role === 'admin'}
              >
                <option value="seller">Seller</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Super Admin Store Assignment */}
          {(!currentUser || !(currentUser as any).storeId || (currentUser as any).storeId === '') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10, borderLeft: '3px solid #f59e0b', paddingLeft: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>System Identifier (e.g. mns_rugs)</label>
                <input
                  type="text"
                  placeholder="Leave blank for root"
                  value={storeId}
                  onChange={e => setStoreId(e.target.value)}
                  style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: 10, color: '#666' }}>Used for strict database separation</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Store Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ariana Oriental Rugs"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
            <button type="submit" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              {isEditing ? 'Update User' : 'Add User'}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} style={{ padding: '8px 16px', background: '#ccc', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Cancel Edit
              </button>
            )}
          </div>
          {error && <div className={styles.error} style={{ marginTop: 10, color: '#dc2626' }}>{error}</div>}
          {successMsg && <div style={{ marginTop: 10, color: 'green' }}>{successMsg}</div>}
        </form>
      </div>

      <ul className={styles.userList}>
        {Array.isArray(users) && users.map(u => (
          <li key={u.username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>{u.fullName}</span>
              <span style={{ color: '#666', fontSize: '0.9em', marginLeft: 8 }}>({u.username})</span>
              <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.8em', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>{u.role}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleEditClick(u)}
                style={{ padding: '4px 8px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Edit
              </button>
              {u.username !== currentUser?.username && (
                <button
                  onClick={() => handleDeleteUser(u)}
                  className={styles.deleteBtn}
                  style={{ padding: '4px 8px' }}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
