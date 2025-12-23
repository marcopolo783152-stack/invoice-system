'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Settings, LogOut, Package, Users, FileDown, Trash2 } from 'lucide-react';
import styles from './Sidebar.module.css';
import { exportAddressBook, getAllInvoices } from '@/lib/invoice-storage';
import AddressBookModal from './AddressBookModal';
import ExportPreviewModal from './ExportPreviewModal';

export default function Sidebar({ user, onLogout }: { user: any, onLogout: () => void }) {
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
        <div className={styles.sidebar}>
            <div className={styles.logo}>
                <Package className={styles.logoIcon} size={28} />
                <span>Marco Polo</span>
            </div>

            <nav className={styles.nav}>
                <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </Link>

                <Link href="/invoices" className={`${styles.navItem} ${pathname === '/invoices' && !isRecycleBin ? styles.active : ''}`}>
                    <FileText size={20} />
                    <span>Invoices</span>
                </Link>

                <Link href="/invoices/new" className={`${styles.navItem} ${pathname === '/invoices/new' ? styles.active : ''}`}>
                    <PlusCircle size={20} />
                    <span>New Invoice</span>
                </Link>

                <button
                    onClick={() => setShowAddressBook(true)}
                    className={styles.navItem}
                    style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', fontSize: 15, fontFamily: 'inherit' }}
                >
                    <Users size={20} />
                    <span>Address Book</span>
                </button>

                <button
                    onClick={() => setShowExportPreview(true)}
                    className={styles.navItem}
                    style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', fontSize: 15, fontFamily: 'inherit' }}
                >
                    <FileDown size={20} />
                    <span>Export PDFs</span>
                </button>

                <Link href="/invoices?view=bin" className={`${styles.navItem} ${isRecycleBin ? styles.active : ''}`}>
                    <Trash2 size={20} />
                    <span>Recycle Bin</span>
                </Link>

                <Link href="/settings" className={`${styles.navItem} ${pathname.startsWith('/settings') ? styles.active : ''}`}>
                    <Settings size={20} />
                    <span>Settings</span>
                </Link>
            </nav>

            <div className={styles.footer}>
                <div className={styles.user}>
                    <div className={styles.avatar}>
                        {user?.name?.[0] || user?.username?.[0] || 'U'}
                    </div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{user?.fullName || 'User'}</span>
                        <span className={styles.userRole}>{user?.role || 'Staff'}</span>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className={styles.navItem}
                    style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', marginTop: 8 }}
                >
                    <LogOut size={20} />
                    <span>Logout</span>
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
