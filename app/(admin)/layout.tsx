'use client';

import { Inter, Cinzel, Cinzel_Decorative } from 'next/font/google';
import { usePathname } from 'next/navigation';
import '../globals.css';
import '../print.css';
import Sidebar from '@/components/Sidebar';
import TopAdminBar from '@/components/TopAdminBar';
import AddressBookModal from '@/components/AddressBookModal';
import ExportPreviewModal from '@/components/ExportPreviewModal';
import HelpModal from '@/components/HelpModal';
import NotificationModal from '@/components/NotificationModal';
import { useState, useEffect, Suspense } from 'react';
import { checkAutoClockOut } from '@/lib/employee-storage';
import { StoreProvider } from '@/context/StoreContext';

const inter = Inter({ subsets: ['latin'] });
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });
const cinzelDecorative = Cinzel_Decorative({ subsets: ['latin'], weight: ['400', '700'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    const interval = setInterval(checkAuth, 1000);
    window.addEventListener('storage', checkAuth);

    const handleOpenNotifications = () => setShowNotifications(true);
    window.addEventListener('open-notifications', handleOpenNotifications);

    // Global background interval to auto-clock out employees exactly at 6:00 PM
    const clockOutInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() >= 18) {
        const lastAuto = localStorage.getItem('last_auto_clock_out');
        const todayStr = now.toDateString();
        if (lastAuto !== todayStr) {
            checkAutoClockOut();
            localStorage.setItem('last_auto_clock_out', todayStr);
        }
      }
    }, 30000); 

    // --- INACTIVITY TIMEOUT ---
    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Auto-logout after 15 minutes
        sessionStorage.removeItem('mp-invoice-auth');
        sessionStorage.removeItem('mp-invoice-user');
        localStorage.removeItem('mp-invoice-auth');
        localStorage.removeItem('mp-invoice-user');
        sessionStorage.removeItem('marcopolo_current_user');
        sessionStorage.removeItem('marcopolo_active_view');
        window.location.href = '/';
      }, INACTIVITY_LIMIT);
    };

    // Attach listeners
    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keypress', resetInactivity);
    window.addEventListener('click', resetInactivity);
    window.addEventListener('scroll', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);
    
    // Start initial timer
    resetInactivity();

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('open-notifications', handleOpenNotifications);
      clearInterval(interval);
      clearInterval(clockOutInterval);
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keypress', resetInactivity);
      window.removeEventListener('click', resetInactivity);
      window.removeEventListener('scroll', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
    };
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mp-invoice-auth');
      sessionStorage.removeItem('mp-invoice-user');
      localStorage.removeItem('mp-invoice-auth');
      localStorage.removeItem('mp-invoice-user');
        sessionStorage.removeItem('marcopolo_current_user');
        sessionStorage.removeItem('marcopolo_active_view');
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/';
      setTimeout(() => window.location.reload(), 100);
    }
  };

  const isPrintPage = pathname?.includes('/print');
  const isPublicPage = pathname?.startsWith('/public');

  if (isPrintPage) {
    return (
      <html lang="en">
        <body className={inter.className} style={{ background: 'white', width: '100%', minWidth: 'auto' }}>
          <StoreProvider>
            {children}
          </StoreProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <TopAdminBar />
        <div className="admin-layout-wrapper" style={{ display: 'flex', minHeight: '100vh', position: 'relative', width: '100%' }}>
          {/* Global Modals */}
          {isAuthenticated && !isPublicPage && pathname !== '/admin/invoices/clock' && (
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

          {isAuthenticated && !isPublicPage && pathname !== '/admin/invoices/clock' && (
            <div
              style={{
                width: isCollapsed ? 80 : 260,
                flexShrink: 0,
                height: '100vh',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                transition: 'width 0.3s ease-in-out'
              }}
            >
              <Sidebar
                user={user}
                onLogout={handleLogout}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                onShowAddressBook={() => setShowAddressBook(true)}
                onShowExportPreview={() => setShowExportPreview(true)}
                onShowHelp={() => setShowHelpModal(true)}
                onShowNotifications={() => setShowNotifications(true)}
              />
            </div>
          )}

          <div className="main-content" style={{
            flex: 1,
            minHeight: '100vh',
            background: isPublicPage ? '#fff' : 'var(--bg-void)',
            width: '100%'
          }}>
            <StoreProvider>
              {children}
            </StoreProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
