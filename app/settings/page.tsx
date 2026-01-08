'use client';

import React, { useState, useEffect } from 'react';
import UserManagement from '@/components/UserManagement';
import Login from '@/components/Login';
import { getEmailConfig, saveEmailConfig, EmailConfig } from '@/lib/email-service';
import { saveSettingsToCloud, getSettingsFromCloud } from '@/lib/settings-storage';
import { importInvoices } from '@/lib/invoice-storage';
import { Database, UploadCloud } from 'lucide-react';

function EmailSettingsForm() {
    const [config, setConfig] = useState<EmailConfig>({
        serviceId: '',
        templateIdInvoice: '',
        templateIdConfirm: '',
        publicKey: '',
        privateKey: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load from local
        const local = getEmailConfig();
        if (local.serviceId) setConfig(local);

        // Try fetch from cloud to be sure
        getSettingsFromCloud().then(cloudSettings => {
            if (cloudSettings?.emailConfig) {
                setConfig(cloudSettings.emailConfig);
            }
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Save Local
            saveEmailConfig(config);
            // Save Cloud
            await saveSettingsToCloud({ emailConfig: config });
            alert('Settings saved and synced to cloud!');
        } catch (err) {
            console.error(err);
            alert('Saved locally, but failed to sync to cloud.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Service ID</label>
                    <input name="serviceId" value={config.serviceId} onChange={handleChange} placeholder="gmail" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Template ID (Invoice)</label>
                    <input name="templateIdInvoice" value={config.templateIdInvoice} onChange={handleChange} placeholder="template_..." style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Public Key</label>
                    <input name="publicKey" value={config.publicKey} onChange={handleChange} placeholder="User ID" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Private Key (Optional)</label>
                    <input name="privateKey" value={config.privateKey || ''} onChange={handleChange} placeholder="For secure sending" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={loading} style={{ background: '#0f172a', color: 'white', padding: '10px 24px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Syncing...' : 'Save Configuration'}
                </button>
            </div>
        </form>
    );
}

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

    // Persistence for users list
    useEffect(() => {
        if (users.length > 0 && isAuthenticated) {
            localStorage.setItem('mp-invoice-users', JSON.stringify(users));
        }
    }, [users, isAuthenticated]);

    // Persistence for current user session
    useEffect(() => {
        if (user && isAuthenticated) {
            sessionStorage.setItem('mp-invoice-user', JSON.stringify(user));
            // Also update in the main users list if it exists there
            if (users.length > 0) {
                const updatedUsers = users.map(u => u.username === user.username ? user : u);
                // Only update if actually different to avoid loop
                if (JSON.stringify(updatedUsers) !== JSON.stringify(users)) {
                    setUsers(updatedUsers);
                }
            }
        }
    }, [user, isAuthenticated]);

    const onLogin = () => {
        setIsAuthenticated(true);
        // Current user should be available now
        const storedUser = sessionStorage.getItem('mp-invoice-user');
        if (storedUser) try { setUser(JSON.parse(storedUser)); } catch { }
    };

    const handlePasswordChange = (newPassword: string) => {
        if (!user) return;
        const updatedUser = { ...user, password: newPassword };
        setUser(updatedUser);

        // Update in the main list as well
        setUsers(prevUsers => prevUsers.map(u =>
            u.username === user.username ? updatedUser : u
        ));

        alert("Password updated successfully!");
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
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold', color: '#1a1f3c', flexShrink: 0 }}>
                            {(user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1f3c' }}>{user?.fullName || 'User'}</div>
                            <div style={{ color: '#666' }}>{user?.username || 'No email provided'}</div>
                            <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', color: '#4b5563', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                                {user?.role || 'Staff'}
                            </div>

                            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #eee' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Change Password</h3>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const newPass = (form.elements.namedItem('newPass') as HTMLInputElement).value;
                                    const confirmPass = (form.elements.namedItem('confirmPass') as HTMLInputElement).value;

                                    if (newPass !== confirmPass) {
                                        alert("Passwords do not match");
                                        return;
                                    }
                                    if (newPass.length < 4) {
                                        alert("Password must be at least 4 characters");
                                        return;
                                    }

                                    handlePasswordChange(newPass);
                                    form.reset();
                                }} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#666' }}>New Password</label>
                                        <input type="password" name="newPass" required style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#666' }}>Confirm</label>
                                        <input type="password" name="confirmPass" required style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }} />
                                    </div>
                                    <button type="submit" style={{ padding: '8px 16px', background: '#1a1f3c', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', height: 35 }}>Update</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Configuration Section */}
            {user?.role === 'admin' && (
                <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c', marginBottom: 24 }}>Email Configuration (Syncs to Cloud)</h2>
                    <EmailSettingsForm />
                </div>
            )}




            {/* Data Management Section */}
            {user?.role === 'admin' && (
                <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f3c', marginBottom: 24 }}>Data Management</h2>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Restore from Backup</h3>
                            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Import a Master Backup file (.json) to restore lost data.</p>
                        </div>
                        <button
                            onClick={async () => {
                                if (typeof window === 'undefined' || !(window as any).electron) {
                                    alert('Restore is only available in the Desktop App.');
                                    return;
                                }
                                if (!confirm('Are you sure you want to restore data from backup? This will merge/update existing invoices.')) return;

                                try {
                                    const result = await (window as any).electron.importBackup();
                                    if (result && result.success) {
                                        const success = importInvoices(result.data);
                                        if (success) {
                                            alert('Restore Complete! Database updated.');
                                            window.location.reload();
                                        } else {
                                            alert('Failed to parse backup file.');
                                        }
                                    } else if (result && result.error) {
                                        alert('Import failed: ' + result.error);
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert('Error during import.');
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: '#f59e0b', color: 'white',
                                padding: '10px 20px', borderRadius: 8,
                                fontWeight: 600, border: 'none', cursor: 'pointer'
                            }}
                        >
                            <Database size={16} />
                            Restore Data
                        </button>
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
