'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Settings, LogOut, Package } from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar({ user, onLogout }: { user: any, onLogout: () => void }) {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className={styles.sidebar}>
            <div className={styles.logo}>
                <Package className={styles.logoIcon} size={28} />
                <span>Marco Polo</span>
            </div>

            <nav className={styles.nav}>
                <Link href="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </Link>

                <Link href="/invoices" className={`${styles.navItem} ${isActive('/invoices') && pathname !== '/invoices/new' ? styles.active : ''}`}>
                    <FileText size={20} />
                    <span>Invoices</span>
                </Link>

                <Link href="/invoices/new" className={`${styles.navItem} ${isActive('/invoices/new') ? styles.active : ''}`}>
                    <PlusCircle size={20} />
                    <span>New Invoice</span>
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
        </div>
    );
}
