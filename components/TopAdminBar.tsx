'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import { canAccess } from '@/lib/access-policy';
import { logout } from '@/lib/auth';
import { syncLegacyStaffSession } from '@/lib/staff-session';
import { Bell } from 'lucide-react';

export default function TopAdminBar() {
  const {staff}=useStaffAccess();
  const isAdmin=!!staff;
  const pathname=usePathname();
  const handleLogout=async()=>{
    sessionStorage.setItem('showroom-logout','1');
    try{await logout();syncLegacyStaffSession(null);window.location.replace('/');}
    catch{sessionStorage.removeItem('showroom-logout');window.alert('Sign out failed. Please try again.');}
  };

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
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
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
        {canAccess(staff,'invoices') && <a 
          href={canAccess(staff,'reports')?'/admin/invoices':'/admin/invoices/invoices'} 
          style={linkStyle(pathname?.startsWith('/admin/invoices') || false)}
          onMouseOver={(e) => (e.currentTarget.style.color = 'white')}
          onMouseOut={(e) => { if (!pathname?.startsWith('/admin/invoices')) e.currentTarget.style.color = '#9ca3af' }}
        >
          Invoice System
        </a>}
        {canAccess(staff,'users') && <a href="/admin/users" style={linkStyle(pathname==='/admin/users')}>Users & Permissions</a>}
        <a href="/staff-account" style={linkStyle(pathname==='/staff-account')}>My account</a>

      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {!pathname?.startsWith('/admin/invoices') && (
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-notifications'))}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#9ca3af'
            }}
            title="Notifications"
            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            <Bell size={18} />
          </button>
        )}

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
