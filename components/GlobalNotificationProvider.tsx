'use client';
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { SHOWROOM_ORDERS, SHOWROOM_REVIEWS, SHOWROOM_CHAT, SHOWROOM_CLEANING, SHOWROOM_ESTIMATES, SHOWROOM_APPOINTMENTS } from '@/lib/showroom-firebase';
import { db as firestoreDb } from '@/lib/firebase';
import { AlertCircle, CheckCircle, Bell, MessageCircle, Calendar, FileText, ShoppingBag, X } from 'lucide-react';
import { AdminChatBox } from './public/AdminChatBox';

// Using a custom global event or context for toasts
interface Toast {
    id: string;
    title: string;
    message: string;
    type: 'order' | 'review' | 'chat' | 'booking' | 'estimate' | 'appointment' | 'system';
    time: Date;
    link?: string;
}

export const GlobalNotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [activeAdminChatSession, setActiveAdminChatSession] = useState<string | null>(null);
    
    // Auto-remove toasts
    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts(prev => prev.slice(1));
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    const playNotificationSound = async (type: string) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            
            if (type === 'chat') {
                // High double blip for chat
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.15);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'booking' || type === 'estimate') {
                // Pleasant chime for bookings/estimates
                const playNote = (freq: number, start: number, dur: number) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, start);
                    gain.gain.linearRampToValueAtTime(0.5, start + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
                    osc.start(start);
                    osc.stop(start + dur);
                };
                playNote(523.25, ctx.currentTime, 0.5); // C5
                playNote(659.25, ctx.currentTime + 0.2, 0.8); // E5
            } else {
                // Default ding for orders/reviews
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = 600;
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1);
            }
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const addToast = (toast: Omit<Toast, 'id' | 'time'>) => {
        const newToast: Toast = {
            ...toast,
            id: Math.random().toString(36).substr(2, 9),
            time: new Date()
        };
        setToasts(prev => [...prev, newToast]);
        playNotificationSound(toast.type);
    };

    useEffect(() => {
        // Only run if authenticated
        const isAuth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
        const activeView = localStorage.getItem('marcopolo_active_view');
        if (!isAuth && activeView !== 'admin') return;

        const now = Date.now();
        
        const subscriptions = [
            // Orders
            onSnapshot(collection(firestoreDb, SHOWROOM_ORDERS), (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
                        if (createdAt > now - 10000) { // Only recent (last 10 seconds)
                            addToast({
                                title: `New Order: ${data.id}`,
                                message: `${data.shippingAddress?.name || 'Customer'} placed an order for $${data.total?.toLocaleString()}`,
                                type: 'order',
                                link: '/?view=admin&adminTab=orders'
                            });
                        }
                    }
                });
            }),

            // Reviews
            onSnapshot(collection(firestoreDb, SHOWROOM_REVIEWS), (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
                        if (createdAt > now - 10000) {
                            addToast({
                                title: 'New Review Submitted',
                                message: `${data.authorName} left a ${data.rating}-star review.`,
                                type: 'review'
                            });
                        }
                    }
                });
            }),

            // Chat Messages / Help Requests
            onSnapshot(collection(firestoreDb, SHOWROOM_CHAT), (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const createdAt = data.timestamp ? new Date(data.timestamp).getTime() : 0;
                        if (createdAt > now - 10000 && data.sender === 'customer') {
                            addToast({
                                title: 'New Customer Message',
                                message: data.text?.substring(0, 50) + '...',
                                type: 'chat',
                                link: undefined
                            });
                            setActiveAdminChatSession(data.sessionId || 'default');
                        }
                    }
                });
            }),

            // Estimates
            onSnapshot(collection(firestoreDb, SHOWROOM_ESTIMATES), (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
                        if (createdAt > now - 10000) {
                            addToast({
                                title: 'New Service Estimate',
                                message: `${data.firstName} ${data.lastName} requested an estimate for ${data.serviceType}.`,
                                type: 'estimate',
                                link: '/?view=admin&adminTab=estimates'
                            });
                        }
                    }
                });
            }),

            // Appointments / Cleanings / Repairs
            onSnapshot(collection(firestoreDb, SHOWROOM_CLEANING), (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
                        if (createdAt > now - 10000) {
                            addToast({
                                title: 'New Service Request',
                                message: `${data.customerName} requested a ${data.serviceType || 'wash'} service.`,
                                type: 'booking',
                                link: '/?view=admin&adminTab=cleaning'
                            });
                        }
                    }
                });
            }),
            
            // General Appointments (if separate from cleaning)
            onSnapshot(collection(firestoreDb, SHOWROOM_APPOINTMENTS || 'showroom_appointments'), (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
                        if (createdAt > now - 10000) {
                            addToast({
                                title: 'New Appointment Scheduled',
                                message: `${data.name || 'A customer'} scheduled a showroom visit.`,
                                type: 'appointment',
                                link: '/?view=admin&adminTab=appointments'
                            });
                        }
                    }
                });
            }),
        ];

        return () => subscriptions.forEach(unsub => unsub());
    }, []);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'order': return <ShoppingBag className="text-emerald-500" size={24} />;
            case 'review': return <CheckCircle className="text-blue-500" size={24} />;
            case 'chat': return <MessageCircle className="text-purple-500" size={24} />;
            case 'booking': return <AlertCircle className="text-amber-500" size={24} />;
            case 'appointment': return <Calendar className="text-indigo-500" size={24} />;
            default: return <Bell className="text-gray-500" size={24} />;
        }
    };

    return (
        <>
            {children}
            {/* Toast Container */}
            <div className="fixed top-20 right-4 md:right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div 
                        key={toast.id}
                        className="pointer-events-auto bg-white border border-editorial-border shadow-2xl p-4 flex items-start gap-4 transform transition-all duration-300 translate-x-0"
                        style={{ width: '320px', animation: 'slideInRight 0.3s ease-out' }}
                    >
                        <div className="flex-shrink-0 mt-1">
                            {getIconForType(toast.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-editorial-text uppercase tracking-wider">{toast.title}</h4>
                            <p className="text-xs text-gray-500 mt-1 truncate">{toast.message}</p>
                            {toast.link && (
                                <a href={toast.link} className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 mt-2 inline-block hover:underline">
                                    View Details &rarr;
                                </a>
                            )}
                        </div>
                        <button 
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                            className="text-gray-400 hover:text-gray-800 transition"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
            
            <style jsx global>{`
                @keyframes slideInRight {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>

            <AdminChatBox 
                activeSessionId={activeAdminChatSession} 
                onClose={() => setActiveAdminChatSession(null)} 
            />
        </>
    );
};
