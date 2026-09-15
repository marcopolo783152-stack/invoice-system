import { useStaffAccess } from '@/hooks/useStaffAccess';
import { canAccess } from '@/lib/access-policy';
import React, { useMemo, useEffect, useState } from 'react';
import { X, ShoppingBag, CheckCircle, MessageCircle, AlertCircle, Calendar, Clock, Bell, User } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

import { subscribeToCollection, SHOWROOM_APPOINTMENTS } from '@/lib/showroom-firebase';

export default function NotificationModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const {staff}=useStaffAccess();
    const { orders, reviews, chatMessages, cleaningBookings, estimates } = useStore();

    const [appointments, setAppointments] = useState<Array<{ id: string; name?: string; createdAt?: string }>>([]);
    useEffect(()=>{
      setAppointments([]);
      if(canAccess(staff,'appointments')) return subscribeToCollection<{id:string;name?:string;createdAt?:string}>(SHOWROOM_APPOINTMENTS,setAppointments);
    },[staff]);

    const activityFeed = useMemo(() => {
        const feed: Array<{ id: string, type: string, title: string, subtitle: string, date: Date, link: string, icon: React.ReactNode, bgColor: string, color: string }> = [];

        // 1. Orders
        (canAccess(staff,'orders')?orders:[]).forEach(order => {
            if (!order.createdAt) return;
            feed.push({
                id: `order-${order.id}`,
                type: 'order',
                title: `Order $${order.total?.toLocaleString()}`,
                subtitle: `${order.customerInfo?.name || 'Customer'} placed an order.`,
                date: new Date(order.createdAt),
                link: '/?view=admin&adminTab=orders',
                icon: <ShoppingBag size={20} />,
                bgColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981' // emerald-500
            });
        });

        // 2. Reviews
        (canAccess(staff,'reviews')?reviews:[]).forEach(review => {
            if (!review.createdAt) return;
            feed.push({
                id: `review-${review.id}`,
                type: 'review',
                title: `${review.rating} Star Review`,
                subtitle: `From ${review.reviewerName}`,
                date: new Date(review.createdAt),
                link: '/?view=admin&adminTab=reviews',
                icon: <CheckCircle size={20} />,
                bgColor: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6' // blue-500
            });
        });

        // 3. Customer Messages
        (canAccess(staff,'messages')?chatMessages:[]).forEach(msg => {
            if (!msg.timestamp || msg.sender !== 'customer') return;
            feed.push({
                id: `msg-${msg.id}`,
                type: 'chat',
                title: 'New Customer Message',
                subtitle: msg.text?.substring(0, 40) + '...',
                date: new Date(msg.timestamp),
                link: '/?view=admin&adminTab=messages',
                icon: <MessageCircle size={20} />,
                bgColor: 'rgba(168, 85, 247, 0.1)',
                color: '#a855f7' // purple-500
            });
        });

        // 4. Wash / Repair Bookings
        (canAccess(staff,'services')?cleaningBookings:[]).forEach(booking => {
            if (!booking.createdAt) return;
            feed.push({
                id: `booking-${booking.id}`,
                type: 'booking',
                title: `Service: ${booking.serviceOption || 'Cleaning'}`,
                subtitle: `${booking.fullName} requested service.`,
                date: new Date(booking.createdAt),
                link: '/?view=admin&adminTab=cleaning',
                icon: <AlertCircle size={20} />,
                bgColor: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b' // amber-500
            });
        });

        (canAccess(staff,'appointments')?appointments:[]).forEach(appointment => {
            if (!appointment.createdAt) return;
            feed.push({
                id: 'appointment-' + appointment.id, type: 'appointment',
                title: 'Appointment request', subtitle: appointment.name || 'Customer',
                date: new Date(appointment.createdAt),
                link: '/?view=admin&adminTab=appointments',
                icon: <Calendar size={20} />, bgColor: 'rgba(99,102,241,0.1)', color: '#6366f1'
            });
        });
        (canAccess(staff,'services')?estimates:[]).forEach(estimate => {
            if (!estimate.createdAt) return;
            feed.push({
                id: 'estimate-' + estimate.id, type: 'estimate',
                title: 'Service estimate request',
                subtitle: estimate.name || [estimate.firstName, estimate.lastName].filter(Boolean).join(' ') || 'Customer',
                date: new Date(estimate.createdAt),
                link: '/?view=admin&adminTab=estimates',
                icon: <AlertCircle size={20} />, bgColor: 'rgba(59,130,246,0.1)', color: '#3b82f6'
            });
        });

        // Sort descending
        return feed.sort((a, b) => b.date.getTime() - a.date.getTime()); // Keep all available activity visible.
    }, [orders, reviews, chatMessages, cleaningBookings, appointments, estimates]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(4px)', fontFamily: 'Outfit, sans-serif'
        }}>
            <div style={{
                background: 'white', width: '90%', maxWidth: 600, maxHeight: '80vh',
                borderRadius: 24, boxShadow: 'var(--glass-shadow)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                animation: 'modalEnter 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px', borderBottom: '1px solid var(--surface-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Bell size={20} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>System Activity Inbox</h2>
                            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0 0', fontSize: 13 }}>Chronological timeline of all system events</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'var(--bg-slate)', border: 'none', borderRadius: '50%',
                        width: 36, height: 36, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)'
                    }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                    {activityFeed.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Bell size={48} className="mx-auto mb-4 opacity-20" />
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Inbox is clear</div>
                            <div>No recent system activity found.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {activityFeed.map((item, index) => (
                                <a
                                    href={item.link}
                                    key={item.id}
                                    onClick={onClose}
                                    style={{
                                        padding: '20px 32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16,
                                        borderBottom: index === activityFeed.length - 1 ? 'none' : '1px solid var(--surface-border)',
                                        textDecoration: 'none',
                                        transition: 'background 0.2s',
                                    }}
                                    className="hover:bg-neutral-50"
                                >
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        background: item.bgColor, color: item.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {item.icon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>{item.title}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                            <span>{item.subtitle}</span>
                                            <span>•</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={12} />
                                                {item.date.toLocaleDateString()} {item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
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
