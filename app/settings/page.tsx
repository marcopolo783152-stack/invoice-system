'use client';

import React, { useState, useEffect } from 'react';
import UserManagement from '@/components/UserManagement';
import Login from '@/components/Login';

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Basic auth check
        const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
        const storedUser = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');
        const storedUsers = localStorage.getItem('mp-invoice-users');

        if (auth === '1' && storedUser) {
            setIsAuthenticated(true);
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed && typeof parsed === 'object') setUser(parsed);
                else setIsAuthenticated(false);
            } catch {
                setIsAuthenticated(false);
            }

            if (storedUsers) {
                try {
                    const parsed = JSON.parse(storedUsers);
                    if (Array.isArray(parsed)) setUsers(parsed);
                    else setUsers([{ username: "admin@marcopolo.com", fullName: "Admin", password: "Marcopolo$", role: "admin" }]);
                } catch {
                    setUsers([{ username: "admin@marcopolo.com", fullName: "Admin", password: "Marcopolo$", role: "admin" }]);
                }
            } else {
                setUsers([{ username: "admin@marcopolo.com", fullName: "Admin", password: "Marcopolo$", role: "admin" }]);
            }
            setLoading(false);
        } else {
            setIsAuthenticated(false);
            setLoading(false);
        }
    }, []);

    const onLogin = () => {
        setIsAuthenticated(true);
        // Current user should be available now
        const storedUser = sessionStorage.getItem('mp-invoice-user');
        if (storedUser) try { setUser(JSON.parse(storedUser)); } catch { }
    };

    if (loading) return <div style={{ padding: 40, color: '#666' }}>Loading settings...</div>;
    if (!isAuthenticated) return <Login onLogin={onLogin} />;

    return (
        <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
            <header style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1f3c', marginBottom: 8 }}>Settings</h1>
                <p style={{ color: '#666' }}>Manage your account and system preferences</p>
            </header>

            {user && (
                <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c', marginBottom: 24 }}>My Profile</h2>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold', color: '#1a1f3c' }}>
                            {(user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1f3c' }}>{user?.fullName || 'User'}</div>
                            <div style={{ color: '#666' }}>{user?.username || 'No email provided'}</div>
                            <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', color: '#4b5563', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                                {user?.role || 'Staff'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {user?.role === 'admin' && Array.isArray(users) && (
                <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c', marginBottom: 24 }}>User Management</h2>
                    <UserManagement users={users} setUsers={setUsers} currentUser={user} />
                </div>
            )}
        </div>
    );
}
