'use client';

import { Inter, Cinzel, Cinzel_Decorative } from 'next/font/google';
import { usePathname } from 'next/navigation';
import '../globals.css';
import '../print.css';
import StaffGate from '@/components/StaffGate';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import { canAccess } from '@/lib/access-policy';
import { logout } from '@/lib/auth';
import { syncLegacyStaffSession } from '@/lib/staff-session';
import Sidebar from '@/components/Sidebar';
import TopAdminBar from '@/components/TopAdminBar';
import AddressBookModal from '@/components/AddressBookModal';
import ExportPreviewModal from '@/components/ExportPreviewModal';
import HelpModal from '@/components/HelpModal';
import { NotificationsModal } from '@/components/NotificationsModal';
import { GlobalNotificationProvider } from '@/components/GlobalNotificationProvider';
import { useState, useEffect, Suspense } from 'react';
import { Menu, X } from 'lucide-react';
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
  const {staff}=useStaffAccess();
  const isAuthenticated=!!staff;
  const user=staff?{id:staff.uid,fullName:staff.name,name:staff.name,email:staff.email,role:staff.role==='admin'||staff.role==='general_manager'?'admin':'employee',storeName:'Marco Polo Oriental Rugs'}:null;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(()=>{
    const open=()=>setShowNotifications(true);
    window.addEventListener('open-notifications',open);
    return ()=>window.removeEventListener('open-notifications',open);
  },[]);
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout=async()=>{await logout();syncLegacyStaffSession(null);window.location.assign('/staff-login');};

  const isPrintPage = pathname?.includes('/print');
  const isPublicPage = pathname?.startsWith('/public');

  if (isPrintPage) {
    return (
      <html lang="en">
        <body className={inter.className} style={{ background: 'white', width: '100%', minWidth: 'auto' }}>
          <StaffGate><StoreProvider>{children}</StoreProvider></StaffGate>
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
        {isPublicPage ? children : <StaffGate><>
        <TopAdminBar />
        {/* Mobile Hamburger Button */}
        {isAuthenticated && !isPublicPage && pathname !== '/admin/invoices/clock' && (
          <button 
            className="invoice-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        <div className={`admin-layout-wrapper flex min-h-screen relative w-full overflow-x-hidden`}>
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="invoice-menu-overlay"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar */}
          {isAuthenticated && !isPublicPage && pathname !== '/admin/invoices/clock' && (
            <div
              className={`invoice-sidebar-shell ${isMobileMenuOpen ? "is-open" : ""}`}
              style={{
                width: isCollapsed ? 96 : 260,
                flexShrink: 0,
                height: 'calc(100vh - 40px)'
              }}
            >
              <Suspense fallback={null}><Sidebar
                user={user}
                onLogout={handleLogout}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                onShowAddressBook={() => setShowAddressBook(true)}
                onShowExportPreview={() => setShowExportPreview(true)}
                onShowHelp={() => setShowHelpModal(true)}
                onShowNotifications={() => setShowNotifications(true)}
              /></Suspense>
            </div>
          )}

          {/* Main Content */}
          <div className="main-content" style={{
            flex: 1,
            minWidth: 0,
            minHeight: '100vh',
            background: isPublicPage ? '#fff' : 'var(--bg-void)',
            width: '100%',
            display: 'block'
          }}>
            <StoreProvider>
                {children}
                {/* Global Modals */}
                {isAuthenticated && !isPublicPage && pathname !== '/admin/invoices/clock' && (
                  <>
                    {canAccess(staff,'customers') && <AddressBookModal isOpen={showAddressBook} onClose={() => setShowAddressBook(false)} />}
                    {canAccess(staff,'invoices') && <ExportPreviewModal isOpen={showExportPreview} onClose={() => setShowExportPreview(false)} />}
                    <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
                    <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
                  </>
                )}
            </StoreProvider>
          </div>
        </div>
        </></StaffGate>}
      </body>
    </html>
  );
}
