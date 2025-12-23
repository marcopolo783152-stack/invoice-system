'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import './print.css';
import Sidebar from '@/components/Sidebar';
import AddressBookModal from '@/components/AddressBookModal';
import ExportPreviewModal from '@/components/ExportPreviewModal';
import { useState, useEffect, Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);

  useEffect(() => {
    // Basic auth check for sidebar user info
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
        const storedUser = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');

        if (auth === '1' && storedUser) {
          setIsAuthenticated(true);
          try { setUser(JSON.parse(storedUser)); } catch { }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    };

    checkAuth();

    // Regular interval fallback for edge cases
    const interval = setInterval(checkAuth, 1000);

    // Also listen for storage changes for cross-tab or logout sync
    window.addEventListener('storage', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      // Clear ALL possible session/auth tokens
      sessionStorage.removeItem('mp-invoice-auth');
      sessionStorage.removeItem('mp-invoice-user');
      localStorage.removeItem('mp-invoice-auth');
      localStorage.removeItem('mp-invoice-user');

      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/';
      // Force refresh on logout to clear all states
      setTimeout(() => window.location.reload(), 100);
    }
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
          {/* Global Modals - Only render if authenticated */}
          {isAuthenticated && (
            <>
              <AddressBookModal
                isOpen={showAddressBook}
                onClose={() => setShowAddressBook(false)}
              />
              <ExportPreviewModal
                isOpen={showExportPreview}
                onClose={() => setShowExportPreview(false)}
              />
            </>
          )}

          {/* Mobile Overlay */}
          {isAuthenticated && isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              onTouchStart={() => setIsSidebarOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 90,
                backdropFilter: 'blur(4px)'
              }}
            />
          )}

          <Suspense fallback={<div style={{ width: isAuthenticated ? (isCollapsed ? 80 : 280) : 0, background: '#1e293b' }} />}>
            {isAuthenticated && (
              <>
                <div style={{
                  position: 'fixed',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  zIndex: 100,
                  transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out',
                  visibility: 'visible',
                  width: isCollapsed ? 80 : 280
                }} className={`sidebar-container ${isSidebarOpen ? 'mobile-open' : ''}`}>
                  <Sidebar
                    user={user}
                    onLogout={handleLogout}
                    onClose={() => setIsSidebarOpen(false)}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    onShowAddressBook={() => setShowAddressBook(true)}
                    onShowExportPreview={() => setShowExportPreview(true)}
                  />
                </div>

                {/* Desktop Sidebar Placeholder */}
                <div style={{ width: isCollapsed ? 80 : 280, flexShrink: 0, transition: 'width 0.3s ease-in-out' }} className="desktop-sidebar-space" />
              </>
            )}
          </Suspense>

          <div className="main-content" style={{
            flex: 1,
            minHeight: '100vh',
            background: '#f8fafc',
            width: '100%',
            transition: 'margin-left 0.3s ease-in-out'
          }}>
            {/* Mobile Header - Only if authenticated */}
            {isAuthenticated && (
              <header className="mobile-only-header" style={{
                display: 'none', // Overridden by media query in globals.css
                padding: '16px',
                background: 'white',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  onTouchStart={() => setIsSidebarOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e293b',
                    cursor: 'pointer',
                    padding: '12px',
                    margin: '-12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                  aria-label="Open menu"
                >
                  <div style={{ width: 24, height: 2, background: 'currentColor', marginBottom: 5 }} />
                  <div style={{ width: 24, height: 2, background: 'currentColor', marginBottom: 5 }} />
                  <div style={{ width: 24, height: 2, background: 'currentColor' }} />
                </button>
                <div style={{ fontWeight: 800, color: '#1a1f3c', fontSize: '1.2rem' }}>Marco Polo</div>
                <div style={{ width: 40 }} /> {/* Spacer */}
              </header>
            )}

            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
