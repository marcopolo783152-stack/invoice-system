'use client';

import React, { useEffect, useState } from 'react';
import { StoreProvider } from '@/context/StoreContext';
import { GlobalNotificationProvider } from '@/components/GlobalNotificationProvider';
import NotificationModal from '@/components/NotificationModal';

export default function PublicAdminWrapper() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
      const activeView = localStorage.getItem('marcopolo_active_view');
      setIsAdmin(auth === '1' || activeView === 'admin');
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    
    const handleOpenNotifications = () => setShowNotifications(true);
    window.addEventListener('open-notifications', handleOpenNotifications);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('open-notifications', handleOpenNotifications);
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <StoreProvider>
      <GlobalNotificationProvider>
        <NotificationModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      </GlobalNotificationProvider>
    </StoreProvider>
  );
}
