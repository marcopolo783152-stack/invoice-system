'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Settings, LogOut, Package, Users, FileDown, Trash2, History, X, Menu, ChevronLeft, ChevronRight, TrendingUp, BarChart } from 'lucide-react';
import styles from './Sidebar.module.css';
import { exportAddressBook, getAllInvoices } from '@/lib/invoice-storage';
import AddressBookModal from './AddressBookModal';
import ExportPreviewModal from './ExportPreviewModal';

export default function Sidebar({
    user,
    onLogout,
    onClose,
    isCollapsed,
    onToggleCollapse,
    onShowAddressBook,
    onShowExportPreview
}: {
    user: any,
    onLogout: () => void,
    onClose?: () => void,
    isCollapsed?: boolean,
    onToggleCollapse?: () => void,
    onShowAddressBook?: () => void,
    onShowExportPreview?: () => void
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

    const navItems = [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard, exact: true },
        { label: 'Invoices', href: '/invoices', icon: FileText, activeCondition: pathname === '/invoices' && !isRecycleBin },
        { label: 'New Invoice', href: '/invoices/new', icon: PlusCircle },
        { label: 'Inventory DB', href: '/inventory', icon: Package },
        { label: 'Address Book', icon: Users, type: 'button' as const, onClick: onShowAddressBook },
        { label: 'Export PDFs', icon: FileDown, type: 'button' as const, onClick: onShowExportPreview },
        { label: 'Reports', href: '/reports', icon: BarChart },
        { label: 'Recycle Bin', href: '/invoices?view=bin', icon: Trash2, activeCondition: isRecycleBin },
        { label: 'Settings', href: '/settings', icon: Settings },
        { label: 'Audit Log', href: '/audit-log', icon: History }
    ];

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.logo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <TrendingUp className={styles.logoIcon} size={28} />
                    <span className={styles.label}>Marco Polo</span>
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
                                <item.icon size={22} />
                                <span className={styles.label}>{item.label}</span>
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
                <button
                    onClick={onLogout}
                    className={styles.navItem}
                    style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', marginTop: 8 }}
                    title="Logout"
                >
                    <LogOut size={20} />
                    <span className={styles.label}>Logout</span>
                </button>
            </div>
        </div>
    );
}
