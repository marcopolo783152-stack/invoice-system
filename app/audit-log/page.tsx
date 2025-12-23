'use client';

import React, { useEffect, useState } from 'react';
import { getAuditLogs, AuditEntry } from '@/lib/audit-logger';
import { History, Search, Filter } from 'lucide-react';
import Login from '@/components/Login';

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        // Authenticate
        const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
        const user = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');

        if (auth === '1' && user) {
            setIsAuthenticated(true);
            try { setCurrentUser(JSON.parse(user)); } catch { }
            setLogs(getAuditLogs());
            setLoading(false);
        } else {
            setIsAuthenticated(false);
            setLoading(false);
        }
    }, []);

    const onLogin = () => {
        setIsAuthenticated(true);
        setLogs(getAuditLogs());
    };

    const filteredLogs = logs.filter(log =>
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleString();
    };

    if (loading) return <div style={{ padding: 40, color: '#666' }}>Loading logs...</div>;
    if (!isAuthenticated) return <Login onLogin={onLogin} />;

    return (
        <div style={{ padding: 'var(--dashboard-padding, 40px)', maxWidth: 1000, margin: '0 auto' }}>
            <header style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ padding: 10, background: '#e0e7ff', borderRadius: 12, color: '#4f46e5' }}>
                        <History size={24} />
                    </div>
                    <h1 style={{ fontSize: 'var(--h1-size, 28px)', fontWeight: 800, color: '#1a1f3c', margin: 0 }}>Audit Log</h1>
                </div>
                <p style={{ color: '#666', fontSize: 'var(--p-size, 16px)' }}>Track activity and changes across the system.</p>
            </header>

            <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: 24 }}>
                <div style={{ position: 'relative', marginBottom: 20 }}>
                    <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search logs by user, action or details..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 40px',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            fontSize: 14,
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                                <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>Timestamp</th>
                                <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>User</th>
                                <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>Action</th>
                                <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', verticalAlign: 'top' }}>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {formatDate(log.timestamp)}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                        {log.user}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: 6,
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            fontWeight: 500
                                        }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>
                                        {log.details}
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                        No logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
