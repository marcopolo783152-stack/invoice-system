'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Settings, LogOut, Package, Users, FileDown, Trash2, History, X, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Sidebar.module.css';
import { exportAddressBook, getAllInvoices } from '@/lib/invoice-storage';
import AddressBookModal from './AddressBookModal';
import ExportPreviewModal from './ExportPreviewModal';

export default function Sidebar({
    user,
    onLogout,
    onClose,
    isCollapsed,
    onToggleCollapse
}: {
    user: any,
    onLogout: () => void,
    onClose?: () => void,
    isCollapsed?: boolean,
    onToggleCollapse?: () => void
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [showAddressBook, setShowAddressBook] = useState(false);
    const [showExportPreview, setShowExportPreview] = useState(false);

    // Helper to check active state safely
    const isActive = (path: string, exact = false) => {
        if (exact) return pathname === path;
        return pathname.startsWith(path);
    };

    const isRecycleBin = pathname === '/invoices' && searchParams?.get('view') === 'bin';

    // If we are in recycle bin, "Invoices" link shouldn't be active? 
    // Usually "Invoices" is parent. But let's separate them visually if the user wants them as separate items.
    // If view=bin, Invoices is technically active too properly. But maybe we want to highlight Bin.



    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.logo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Package className={styles.logoIcon} size={28} />
                    {!isCollapsed && <span>Marco Polo</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {onToggleCollapse && (
                        <button
                            onClick={onToggleCollapse}
                            className={styles.collapseToggle}
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
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
                <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`} title="Dashboard">
                    <LayoutDashboard size={20} />
                    {!isCollapsed && <span>Dashboard</span>}
                </Link>

                <Link href="/invoices" className={`${styles.navItem} ${pathname === '/invoices' && !isRecycleBin ? styles.active : ''}`} title="Invoices">
                    <FileText size={20} />
                    {!isCollapsed && <span>Invoices</span>}
                </Link>

                <Link href="/invoices/new" className={`${styles.navItem} ${pathname === '/invoices/new' ? styles.active : ''}`} title="New Invoice">
                    <PlusCircle size={20} />
                    {!isCollapsed && <span>New Invoice</span>}
                </Link>

                <Link href="/inventory" className={`${styles.navItem} ${pathname.startsWith('/inventory') ? styles.active : ''}`} title="Inventory DB">
                    <Package size={20} />
                    {!isCollapsed && <span>Inventory DB</span>}
                </Link>

                <button
                    onClick={() => setShowAddressBook(true)}
                    className={styles.navItem}
                    style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', fontSize: 15, fontFamily: 'inherit' }}
                    title="Address Book"
                >
                    <Users size={20} />
                    {!isCollapsed && <span>Address Book</span>}
                </button>

                <button
                    onClick={() => setShowExportPreview(true)}
                    className={styles.navItem}
                    style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', fontSize: 15, fontFamily: 'inherit' }}
                    title="Export PDFs"
                >
                    <FileDown size={20} />
                    {!isCollapsed && <span>Export PDFs</span>}
                </button>

                <Link href="/invoices?view=bin" className={`${styles.navItem} ${isRecycleBin ? styles.active : ''}`} title="Recycle Bin">
                    <Trash2 size={20} />
                    {!isCollapsed && <span>Recycle Bin</span>}
                </Link>

                <Link href="/settings" className={`${styles.navItem} ${pathname.startsWith('/settings') ? styles.active : ''}`} title="Settings">
                    <Settings size={20} />
                    {!isCollapsed && <span>Settings</span>}
                </Link>

                <Link href="/audit-log" className={`${styles.navItem} ${pathname.startsWith('/audit-log') ? styles.active : ''}`} title="Audit Log">
                    <History size={20} />
                    {!isCollapsed && <span>Audit Log</span>}
                </Link>
            </nav>

            <div className={styles.footer}>
                <div className={styles.user}>
                    <div className={styles.avatar}>
                        {user?.name?.[0] || user?.username?.[0] || 'U'}
                    </div>
                    {!isCollapsed && (
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{user?.fullName || 'User'}</span>
                            <span className={styles.userRole}>{user?.role || 'Staff'}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={onLogout}
                    className={styles.navItem}
                    style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', marginTop: 8 }}
                    title="Logout"
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
            <AddressBookModal
                isOpen={showAddressBook}
                onClose={() => setShowAddressBook(false)}
            />
            <ExportPreviewModal
                isOpen={showExportPreview}
                onClose={() => setShowExportPreview(false)}
            />
        </div>
    );
}
