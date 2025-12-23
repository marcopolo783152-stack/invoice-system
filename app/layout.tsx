'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import './print.css';
import Sidebar from '@/components/Sidebar';
import { useState, useEffect, Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Basic auth check for sidebar user info
    // Access localStorage only on client side
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('mp-invoice-user');
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } catch { }
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mp-invoice-auth');
      localStorage.removeItem('mp-invoice-user');
      window.location.href = '/';
      window.location.reload();
    }
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ display: 'flex' }}>
          <Suspense fallback={<div style={{ width: 280, background: '#1e293b', minHeight: '100vh' }} />}>
            <Sidebar user={user} onLogout={handleLogout} />
          </Suspense>
          <div style={{ flex: 1, marginLeft: 280, minHeight: '100vh', background: '#f8fafc' }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
