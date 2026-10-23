'use client';

import React from 'react';
import { useStore } from '@/context/StoreContext';
import { X, MessageSquare, Calculator, Brush, ShoppingBag, Star } from 'lucide-react';
import Link from 'next/link';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { 
    chatMessages,
    estimates,
    cleaningBookings,
    orders,
    reviews
  } = useStore();

  if (!isOpen) return null;

  // Active Chats
  const unreadChats = Object.values(
    (chatMessages || []).reduce((acc, msg) => {
      if (!acc[msg.sessionId || 'default'] || new Date(msg.timestamp) > new Date(acc[msg.sessionId || 'default'].timestamp)) {
        acc[msg.sessionId || 'default'] = msg;
      }
      return acc;
    }, {} as Record<string, any>)
  ).filter((msg: any) => msg.sender === 'customer' && (Date.now() - new Date(msg.timestamp).getTime()) < 24 * 60 * 60 * 1000);

  // New Estimates
  const newEstimates = (estimates || []).filter(e => e.status === 'New');

  // Pending Cleanings
  const pendingCleanings = (cleaningBookings || []).filter(b => b.status === 'Pending');

  // Pending Orders
  const pendingOrders = (orders || []).filter(o => o.status === 'Pending Confirmation');

  // Pending Reviews
  const pendingReviews = (reviews || []).filter(r => !r.isApproved);

  const totalNotifications = unreadChats.length + newEstimates.length + pendingCleanings.length + pendingOrders.length + pendingReviews.length;

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900">Notifications Center</h2>
            <p className="text-sm text-gray-500 mt-1">{totalNotifications} items require your attention</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-2">
          {totalNotifications === 0 && (
            <div className="p-8 text-center text-gray-400 font-medium">
              You're all caught up!
            </div>
          )}

          {unreadChats.map((msg: any) => (
            <Link key={msg.id} href="/?view=admin&adminTab=messages" onClick={onClose}>
              <div className="p-4 hover:bg-gray-50 transition border-b border-gray-50 flex items-start gap-4">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><MessageSquare size={18} /></div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">New Message</h4>
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                    From {msg.customerName}: {msg.content}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {pendingOrders.map(o => (
            <Link key={o.id} href="/?view=admin&adminTab=orders" onClick={onClose}>
              <div className="p-4 hover:bg-gray-50 transition border-b border-gray-50 flex items-start gap-4">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ShoppingBag size={18} /></div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">New Order</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Order #{o.id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
            </Link>
          ))}

          {newEstimates.map(e => (
            <Link key={e.id} href="/?view=admin&adminTab=estimates" onClick={onClose}>
              <div className="p-4 hover:bg-gray-50 transition border-b border-gray-50 flex items-start gap-4">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Calculator size={18} /></div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">New Estimate Request</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{e.name} - {e.service}</p>
                </div>
              </div>
            </Link>
          ))}

          {pendingCleanings.map(b => (
            <Link key={b.id} href="/?view=admin&adminTab=cleaning" onClick={onClose}>
              <div className="p-4 hover:bg-gray-50 transition border-b border-gray-50 flex items-start gap-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Brush size={18} /></div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Specialty Care Booking</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{b.fullName} - {b.serviceOption}</p>
                </div>
              </div>
            </Link>
          ))}

          {pendingReviews.map(r => (
            <Link key={r.id} href="/?view=admin&adminTab=reviews" onClick={onClose}>
              <div className="p-4 hover:bg-gray-50 transition border-b border-gray-50 flex items-start gap-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Star size={18} /></div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">New Review</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{r.rating} Stars by {r.reviewerName}</p>
                </div>
              </div>
            </Link>
          ))}

        </div>
      </div>
    </div>
  );
};
