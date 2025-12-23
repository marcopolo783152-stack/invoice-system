'use client';

import React, { useState, useEffect } from 'react';
import UserManagement from '@/components/UserManagement';

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        // Basic auth check
        const storedUser = localStorage.getItem('mp-invoice-user');
        const storedUsers = localStorage.getItem('mp-invoice-users');

        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch { }
        }
        if (storedUsers) {
            try { setUsers(JSON.parse(storedUsers)); } catch { }
        } else {
            // Default default
            setUsers([{ username: "admin@marcopolo.com", fullName: "Admin", password: "Marcopolo$", role: "admin" }]);
        }
    }, []);

    // Sync users to local storage when changed
    useEffect(() => {
        if (users.length > 0) {
            localStorage.setItem('mp-invoice-users', JSON.stringify(users));
        }
    }, [users]);


    return (
        <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
            <header style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>Settings</h1>
                <p style={{ color: '#666' }}>Manage your account and system preferences</p>
            </header>

            <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c', marginBottom: 24 }}>My Profile</h2>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold', color: '#1a1f3c' }}>
                        {user?.name?.[0] || user?.username?.[0] || 'U'}
                    </div>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1f3c' }}>{user?.fullName || 'User'}</div>
                        <div style={{ color: '#666' }}>{user?.username}</div>
                        <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', color: '#4b5563', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                            {user?.role || 'Staff'}
                        </div>
                    </div>
                </div>
            </div>

            {user?.role === 'admin' && (
                <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c', marginBottom: 24 }}>User Management</h2>
                    <UserManagement users={users} setUsers={setUsers} />
                </div>
            )}
        </div>
    );
}
