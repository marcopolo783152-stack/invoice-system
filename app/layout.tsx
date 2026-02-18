'use client';

import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import './globals.css';
import './print.css';
import Sidebar from '@/components/Sidebar';
import AddressBookModal from '@/components/AddressBookModal';
import ExportPreviewModal from '@/components/ExportPreviewModal';
import HelpModal from '@/components/HelpModal';
import NotificationModal from '@/components/NotificationModal';
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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Basic auth check for sidebar user info
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
        const storedUser = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');

        if (auth === '1' && storedUser) {
          setIsAuthenticated(true);
          try {
            const parsedUser = JSON.parse(storedUser);
            // Only update if data actually changed to prevent re-render loops
            setUser((prev: any) => {
              if (JSON.stringify(prev) !== JSON.stringify(parsedUser)) return parsedUser;
              return prev;
            });
          } catch { }
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

    const handleOpenNotifications = () => setShowNotifications(true);
    window.addEventListener('open-notifications', handleOpenNotifications);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('open-notifications', handleOpenNotifications);
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

  // Check for ANY print page (Invoices or Inventory)
  const isPrintPage = pathname?.includes('/print');
  const isPublicPage = pathname?.startsWith('/public');

  // For print pages, we want a completely clean layout without sidebars, modals, or flex wrappers
  if (isPrintPage) {
    return (
      <html lang="en">
        <body className={inter.className} style={{ background: 'white' }}>
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
          {/* Global Modals - Only render if authenticated AND not public */}
          {isAuthenticated && !isPublicPage && (
            <>
              <AddressBookModal
                isOpen={showAddressBook}
                onClose={() => setShowAddressBook(false)}
              />
              <ExportPreviewModal
                isOpen={showExportPreview}
                onClose={() => setShowExportPreview(false)}
              />
              <HelpModal
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
              />
              <NotificationModal
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </>
          )}

          {/* Mobile Overlay */}
          {isAuthenticated && isSidebarOpen && !isPublicPage && (
            <div
              onClick={() => setIsSidebarOpen(false)}
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

          <Suspense fallback={<div style={{ width: isAuthenticated && !isPublicPage ? (isCollapsed ? 80 : 280) : 0, background: '#1e293b' }} />}>
            {isAuthenticated && !isPublicPage && (
              <>
                <div
                  className={`sidebar-container ${isSidebarOpen ? 'mobile-open' : ''}`}
                  style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 100,
                    transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out',
                    visibility: 'visible',
                    // On mobile we don't want the inline width to override the CSS width
                    width: 'var(--sidebar-width, auto)'
                  }}
                >
                  <style jsx>{`
                      .sidebar-container {
                        --sidebar-width: ${isCollapsed ? '80px' : '280px'};
                      }
                      @media (max-width: 1024px) {
                        .sidebar-container {
                          --sidebar-width: 300px;
                        }
                      }
                    `}</style>
                  <Sidebar
                    user={user}
                    onLogout={handleLogout}
                    onClose={() => setIsSidebarOpen(false)}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    onShowAddressBook={() => setShowAddressBook(true)}
                    onShowExportPreview={() => setShowExportPreview(true)}
                    onShowHelp={() => setShowHelpModal(true)}
                    onShowNotifications={() => setShowNotifications(true)}
                  />
                </div>

                {/* Desktop Sidebar Placeholder */}
                {!isSidebarOpen && (
                  <div style={{ width: isCollapsed ? 80 : 260, flexShrink: 0, transition: 'width 0.3s ease-in-out' }} className="desktop-sidebar-space" />
                )}
              </>
            )}
          </Suspense>

          <div className="main-content" style={{
            flex: 1,
            minHeight: '100vh',
            background: isPublicPage ? '#fff' : 'var(--bg-void)',
            width: '100%',
            transition: 'margin-left 0.3s ease-in-out'
          }}>
            {/* Mobile Header - Only if authenticated AND not public */}
            {isAuthenticated && !isPublicPage && (
              <header className="mobile-only-header" style={{
                display: 'none', // Overridden by media query in globals.css
                padding: '16px 24px',
                background: '#ffffff',
                borderBottom: '1px solid var(--surface-border)',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-main)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/LOGO.png" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Marco Polo</div>
                </div>
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
