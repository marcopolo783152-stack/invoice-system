'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Settings, LogOut, Package, Users, FileDown, Trash2, History, X, Menu, ChevronLeft, ChevronRight, TrendingUp, BarChart, HelpCircle, AlertTriangle, DatabaseBackup, RefreshCw, Clock, DollarSign, Truck, Wrench } from 'lucide-react';
import styles from './Sidebar.module.css';
import { exportAddressBook, getAllInvoices, getOutstandingBalances, getUnbackedData, confirmSmartBackupComplete } from '@/lib/invoice-storage';
import AddressBookModal from './AddressBookModal';
import { BackupModal } from './BackupModal';
import ExportPreviewModal from './ExportPreviewModal';
import { formatCurrency } from '@/lib/calculations';

export default function Sidebar({
    user,
    onLogout,
    onClose,
    isCollapsed,
    onToggleCollapse,
    onShowAddressBook,
    onShowExportPreview,
    onShowHelp,
    onShowNotifications
}: {
    user: any,
    onLogout: () => void,
    onClose?: () => void,
    isCollapsed?: boolean,
    onToggleCollapse?: () => void,
    onShowAddressBook?: () => void,
    onShowExportPreview?: () => void,
    onShowHelp?: () => void,
    onShowNotifications?: () => void
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Helper to check active state safely
    const isActive = (path: string, exact = false) => {
        if (!pathname) return false;
        if (exact) return pathname === path;
        return pathname.startsWith(path);
    };

    const isRecycleBin = pathname === '/invoices' && searchParams?.get('view') === 'bin';



    const [showBackupModal, setShowBackupModal] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [outstandingBalances, setOutstandingBalances] = useState<{ name: string; balance: number; phone: string }[]>([]);

    React.useEffect(() => {
        const loadCounts = async () => {
            const data = await getAllInvoices();
            const count = data.filter(inv => {
                if (inv.data.status === 'picked_up') return false;
                if (!inv.data.pickupDate) return false;
                const pickup = new Date(inv.data.pickupDate);
                const now = new Date();
                const diffTime = pickup.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 2;
            }).length;
            setNotificationCount(count);

            // Load outstanding balances
            const balances = await getOutstandingBalances();
            setOutstandingBalances(balances);
        };
        loadCounts();
        const interval = setInterval(loadCounts, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const [isBackingUp, setIsBackingUp] = useState(false);

    const handleBackupClick = async () => {
        const isWeb = typeof window !== 'undefined' && !(window as any).electron;
        if (isWeb) {
            try {
                if (!(window as any).showDirectoryPicker) {
                    alert('Your browser does not support direct folder access. Please use Chrome, Edge, or Opera.');
                    return;
                }

                const unbackedData = await getUnbackedData();
                const mode = unbackedData.totalCount > 0 ? 'incremental' : 'full';
                const message = mode === 'incremental'
                    ? `Found ${unbackedData.totalCount} new/changed items across the system. Sync changes?`
                    : "No new changes found. Start a full backup of all data?";

                if (confirm(message)) {
                    setIsBackingUp(true);
                    
                    const invoicesToBackup = mode === 'incremental' ? unbackedData.invoices : await getAllInvoices();
                    const { exportToDirectory } = await import('@/lib/bulk-export');

                    if (invoicesToBackup.length > 0) {
                        await exportToDirectory(
                            invoicesToBackup, 
                            mode === 'incremental' ? unbackedData.appraisals : [], 
                            mode === 'incremental' ? unbackedData.inventory : []
                        );
                    } else {
                        // If no invoices but there are other changes, still export JSONs
                        const { getAllInvoicesSync } = await import('@/lib/invoice-storage');
                        const allInv = getAllInvoicesSync();
                        if (allInv.length > 0) {
                            await exportToDirectory([allInv[0]], [], []);
                        } else {
                            alert("System is completely empty.");
                            setIsBackingUp(false);
                            return;
                        }
                    }

                    if (mode === 'incremental') {
                        confirmSmartBackupComplete();
                    }

                    alert("Backup Completed Successfully!");
                }
            } catch (error: any) {
                console.error(error);
                if (error.name !== 'AbortError') {
                    alert("Backup Failed: " + error.message);
                }
            } finally {
                setIsBackingUp(false);
            }
        } else {
            setShowBackupModal(true);
        }
    };

    const navItems = [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard, exact: true },
        { label: 'Invoices', href: '/invoices', icon: FileText, activeCondition: pathname === '/invoices' && !isRecycleBin },
        { label: 'New Invoice', href: '/invoices/new', icon: PlusCircle },
        { label: 'Inventory DB', href: '/inventory', icon: Package },
        { label: 'Address Book', icon: Users, type: 'button' as const, onClick: onShowAddressBook },
        { label: 'Backup', icon: isBackingUp ? RefreshCw : DatabaseBackup, type: 'button' as const, onClick: handleBackupClick, className: isBackingUp ? styles.spin : '' },
        { label: 'Export PDFs', icon: FileDown, type: 'button' as const, onClick: onShowExportPreview },
        { label: 'Notifications', icon: AlertTriangle, type: 'button' as const, onClick: onShowNotifications, badge: notificationCount },
        { label: 'Outstanding', href: '/outstanding', icon: DollarSign, badge: outstandingBalances.length > 0 ? outstandingBalances.length : undefined },
        { label: 'Reports', href: '/reports', icon: BarChart },
        { label: 'HR Management', href: '/employees', icon: Clock },
        { label: 'Recycle Bin', href: '/invoices?view=bin', icon: Trash2, activeCondition: isRecycleBin },
        { label: 'Service Tracking', href: '/service-tracking', icon: Truck },
        { label: 'Service Vendors', href: '/service-vendors', icon: Wrench },
        { label: 'Settings', href: '/settings', icon: Settings },
        { label: 'Audit Log', href: '/audit-log', icon: History }
    ];

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.logo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative', width: 40, height: 40 }}>
                        <Image
                            src="/LOGO.png"
                            alt="Logo"
                            fill
                            style={{ objectFit: 'contain' }}
                            priority
                        />
                    </div>
                    <span className={styles.label}>{user?.storeName || 'Store System'}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {onToggleCollapse && (
                        <button
                            onClick={onToggleCollapse}
                            className={styles.collapseToggle}
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className={styles.mobileClose}
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const itemIsActive = item.activeCondition !== undefined
                        ? item.activeCondition
                        : isActive(item.href || '', item.exact);

                    if (item.type === 'button') {
                        return (
                            <button
                                key={item.label}
                                onClick={item.onClick}
                                className={styles.navItem}
                                style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', fontSize: 15, fontFamily: 'inherit' }}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon size={isCollapsed ? 28 : 22} />
                                <span className={styles.label}>{item.label}</span>
                                {(item as any).badge && (
                                    <span style={{
                                        marginLeft: 'auto',
                                        background: 'rgba(30, 80, 255, 0.1)',
                                        color: 'var(--primary)',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: 10
                                    }}>
                                        {(item as any).badge}
                                    </span>
                                )}
                            </button>
                        );
                    }
                    return (
                        <Link
                            key={item.href}
                            href={item.href || ''}
                            className={`${styles.navItem} ${itemIsActive ? styles.active : ''}`}
                            onClick={onClose}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon size={22} />
                            <span className={styles.label}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                {user && (
                    <div className={styles.user}>
                        <div className={styles.avatar}>
                            {user.fullName?.[0] || user.username?.[0] || 'U'}
                        </div>
                        <div className={`${styles.userInfo} ${styles.label}`}>
                            <span className={styles.userName}>{user.fullName}</span>
                            <span className={styles.userRole}>{user.role}</span>
                        </div>
                    </div>
                )}

                {onShowHelp && (
                    <button
                        onClick={onShowHelp}
                        className={styles.navItem}
                        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', marginTop: 8 }}
                        title="Help & Support"
                    >
                        <HelpCircle size={isCollapsed ? 28 : 22} />
                        <span className={styles.label}>Help & Support</span>
                    </button>
                )}

                <button
                    onClick={onLogout}
                    className={styles.logoutBtn}
                    title="Logout"
                >
                    <LogOut size={isCollapsed ? 28 : 22} />
                    <span className={styles.label}>Logout</span>
                </button>
            </div>

            {showBackupModal && (
                <BackupModal
                    onClose={() => setShowBackupModal(false)}
                    isWeb={typeof window !== 'undefined' && !(window as any).electron}
                />
            )}
        </div>
    );
}


