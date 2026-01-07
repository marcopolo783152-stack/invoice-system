'use client';

import React, { useEffect, useState } from 'react';
import { X, Calendar, User, Eye, AlertTriangle } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { formatDateMMDDYYYY } from '@/lib/date-utils';
import Link from 'next/link';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
    const [notifications, setNotifications] = useState<SavedInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        }
    }, [isOpen]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await getAllInvoices();
            const upcoming = data.filter(inv => {
                if (inv.data.status === 'picked_up') return false;
                if (!inv.data.pickupDate) return false;

                const pickup = new Date(inv.data.pickupDate);
                const now = new Date();
                const diffTime = pickup.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return diffDays <= 2;
            }).sort((a, b) => new Date(a.data.pickupDate!).getTime() - new Date(b.data.pickupDate!).getTime());

            setNotifications(upcoming);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(4px)',
            fontFamily: 'Outfit, sans-serif'
        }}>
            <div style={{
                background: 'white',
                width: '90%',
                maxWidth: 600,
                maxHeight: '80vh',
                borderRadius: 24,
                boxShadow: 'var(--glass-shadow)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'modalEnter 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid var(--surface-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Notifications</h2>
                            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0 0', fontSize: 13 }}>Upcoming customer pickups</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--bg-slate)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-muted)'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px 32px'
                }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Checking schedule...</div>
                    ) : notifications.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>All caught up!</div>
                            <div>No upcoming pickups for the next 48 hours.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {notifications.map((inv) => (
                                <div key={inv.id} style={{
                                    padding: 20,
                                    borderRadius: 16,
                                    background: 'var(--bg-void)',
                                    border: '1px solid var(--surface-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: '#fff', border: '1px solid var(--surface-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--primary)'
                                        }}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>{inv.data.soldTo.name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                <Calendar size={14} /> Due: {formatDateMMDDYYYY(inv.data.pickupDate)}
                                            </div>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/invoices/view?id=${inv.id}`}
                                        onClick={onClose}
                                        style={{
                                            padding: '10px 16px',
                                            background: '#fff',
                                            border: '1px solid var(--surface-border)',
                                            borderRadius: 10,
                                            color: 'var(--text-main)',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <Eye size={16} /> View
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 32px',
                    background: 'var(--bg-void)',
                    borderTop: '1px solid var(--surface-border)',
                    textAlign: 'center'
                }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                        Daily reminders are synchronized automatically.
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes modalEnter {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
