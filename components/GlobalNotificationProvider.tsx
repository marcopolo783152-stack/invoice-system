'use client';
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { SHOWROOM_ORDERS, SHOWROOM_REVIEWS, SHOWROOM_CHAT, SHOWROOM_CLEANING, SHOWROOM_ESTIMATES, SHOWROOM_APPOINTMENTS } from '@/lib/showroom-firebase';
import { db as firestoreDb } from '@/lib/firebase';
import { AlertCircle, CheckCircle, Bell, MessageCircle, Calendar, FileText, ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';

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
    
    // Auto-remove toasts
    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts(prev => prev.slice(1));
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    const addToast = (toast: Omit<Toast, 'id' | 'time'>) => {
        const newToast: Toast = {
            ...toast,
            id: Math.random().toString(36).substr(2, 9),
            time: new Date()
        };
        setToasts(prev => [...prev, newToast]);
        
        // Play notification sound
        try {
            const audio = new Audio('/notification-ding.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => {}); // Ignore error if sound not enabled/found
        } catch (e) {}
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
                                link: '/admin/invoices/invoices'
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
                        const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
                        if (createdAt > now - 10000 && data.sender !== 'Marco Polo') {
                            addToast({
                                title: 'New Customer Message',
                                message: data.text?.substring(0, 50) + '...',
                                type: 'chat',
                                link: '/admin/invoices/crm' // Assume CRM or messages view
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
                                link: '/admin/invoices/crm'
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
                                link: '/admin/invoices/crm'
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
                                <Link href={toast.link} className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 mt-2 inline-block hover:underline">
                                    View Details &rarr;
                                </Link>
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
        </>
    );
};
