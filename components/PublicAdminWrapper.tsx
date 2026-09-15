'use client';

import React, { useEffect, useState } from 'react';
import { StoreProvider } from '@/context/StoreContext';
import { GlobalNotificationProvider } from '@/components/GlobalNotificationProvider';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import NotificationModal from '@/components/NotificationModal';

export default function PublicAdminWrapper() {
  const {staff}=useStaffAccess();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const handleOpenNotifications = () => setShowNotifications(true);
    window.addEventListener('open-notifications', handleOpenNotifications);

    return () => {
      window.removeEventListener('open-notifications', handleOpenNotifications);
    };
  }, []);

  if (!staff) return null;

  return (
    <StoreProvider>
      <GlobalNotificationProvider>
        <NotificationModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      </GlobalNotificationProvider>
    </StoreProvider>
  );
}
