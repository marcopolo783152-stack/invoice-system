'use client';
import StaffUsers from './StaffUsers';
export interface User {
  username: string; // This is the Email/ID
  fullName: string;
  password: string;
  role: "admin" | "seller" | "manager";
  storeId?: string;
  storeName?: string;
}


export const DEFAULT_USERS: User[] = [];
export interface UserManagementProps {
  users: User[];
  setUsers: (u: User[]) => void;
  currentUser?: { username: string; role: string } | null;
  onClose?: () => void;
}


export default function UserManagement({onClose}:UserManagementProps) {
 return <div><button onClick={onClose}>Close staff management</button><StaffUsers /></div>;
}
