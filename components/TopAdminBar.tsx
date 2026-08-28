'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function TopAdminBar() {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  const handleLogout = () => {
    sessionStorage.removeItem('mp-invoice-auth');
    sessionStorage.removeItem('mp-invoice-user');
    localStorage.removeItem('mp-invoice-auth');
    localStorage.removeItem('mp-invoice-user');
    localStorage.removeItem('marcopolo_active_view');
    sessionStorage.removeItem('marcopolo_active_view');
    sessionStorage.removeItem('marcopolo_current_user');
    window.location.href = '/';
  };

  useEffect(() => {
    const checkAuth = () => {
      if (pathname === '/admin/invoices/clock') {
        setIsAdmin(false);
        return;
      }
      
      const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
      const activeView = localStorage.getItem('marcopolo_active_view');
      
      if (auth === '1' && (pathname?.startsWith('/admin') || activeView === 'admin')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, [pathname]);

  // Inactivity auto-logout
  useEffect(() => {
    if (!isAdmin) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      // 15 minutes of inactivity logs out
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 15 * 60 * 1000);
    };

    resetTimeout();
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimeout));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => document.removeEventListener(e, resetTimeout));
    };
  }, [isAdmin]);

  if (!isAdmin) return null;


  const linkStyle = (isActive: boolean) => ({
    fontWeight: 'bold',
    textDecoration: 'none',
    color: isActive ? 'white' : '#9ca3af',
    borderBottom: isActive ? '1px solid white' : 'none',
    paddingBottom: isActive ? '2px' : '0',
    transition: 'color 0.2s',
    cursor: 'pointer'
  });

  return (
    <>
      <style>{`
        @media print {
          .print-hide { display: none !important; }
        }
      `}</style>
      <div className="print-hide" style={{
        backgroundColor: '#1A1A1A',
        color: 'white',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        borderBottom: '1px solid #E5E1DA',
        width: '100%',
        zIndex: 1000,
        position: 'sticky',
        top: 0
      }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A68B67' }}>
          Admin Mode
        </span>
        <div style={{ height: '16px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}></div>
        <a 
          href="/admin" 
          style={linkStyle(pathname === '/' || pathname === '/admin')}
          onMouseOver={(e) => (e.currentTarget.style.color = 'white')}
          onMouseOut={(e) => { if (!(pathname === '/' || pathname === '/admin')) e.currentTarget.style.color = '#9ca3af' }}
        >
          Admin Main Page
        </a>
        <a 
          href="/admin/invoices" 
          style={linkStyle(pathname?.startsWith('/admin/invoices') || false)}
          onMouseOver={(e) => (e.currentTarget.style.color = 'white')}
          onMouseOut={(e) => { if (!pathname?.startsWith('/admin/invoices')) e.currentTarget.style.color = '#9ca3af' }}
        >
          Invoice System
        </a>

      </div>
      <div>
        <button 
          onClick={handleLogout} 
          style={{
            color: '#9ca3af',
            transition: 'color 0.2s',
            cursor: 'pointer',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontSize: '10px',
            background: 'none',
            border: 'none',
            padding: 0
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#f87171')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#9ca3af')}
        >
          Logout
        </button>
      </div>
    </div>
    </>
  );
}
