'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
    if (auth === '1') {
      // Logged in: Force activeView to admin and redirect to showroom dashboard
      localStorage.setItem('marcopolo_active_view', 'admin');
      window.location.href = '/';
    } else {
      // Not logged in: Send them to the old invoice system login screen
      window.location.href = '/admin/invoices';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F5]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A68B67]"></div>
    </div>
  );
}
