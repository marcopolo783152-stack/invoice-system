/**
 * MAIN INVOICE PAGE
 * 
 * Entry point for the invoice system
 * Combines form, template, and actions
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import InvoiceForm from '@/components/InvoiceForm';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import InvoiceSearch from '@/components/InvoiceSearch';
const Login = dynamic(() => import('@/components/Login').then(mod => mod.default), { ssr: false });
const UserManagement = dynamic(() => import('@/components/UserManagement'), { ssr: false });
import { InvoiceData, calculateInvoice, validateInvoiceData } from '@/lib/calculations';
import { printInvoice, generatePDF } from '@/lib/pdf-utils';
import { saveInvoice, getInvoicesCount, getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { sendInvoiceEmail, prepareInvoiceForEmail, isEmailConfigured } from '@/lib/email-service';
import { businessConfig } from '@/config/business';
import styles from './page.module.css';

export default function Home() {
    // Settings dropdown state
    const [showSettings, setShowSettings] = useState(false);

    // Logout function
    const logout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem('mp-invoice-auth');
      localStorage.removeItem('mp-invoice-user');
    };

    // Helper to detect if page is being closed (not reloaded)
    function isWindowClosing(event: BeforeUnloadEvent) {
      // If event.persisted is true, it's a reload (bfcache)
      // If event.type is 'pagehide' and event.persisted, it's a reload
      // If event.type is 'beforeunload', check if navigation type is reload
      // Use performance.navigation for legacy, navigation API for modern
      if (window.performance) {
        const navs = window.performance.getEntriesByType && window.performance.getEntriesByType('navigation');
        const nav = navs && navs.length > 0 ? navs[0] as PerformanceNavigationTiming : undefined;
        if (nav && 'type' in nav) {
          if (nav.type === 'reload') return false;
          if (nav.type === 'navigate') return false;
        }
        // fallback for legacy
        if ((window.performance as any).navigation && (window.performance as any).navigation.type === 1) return false;
      }
      return true;
    }
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<{
    username: string;
    fullName: string;
    password: string;
    role: "admin" | "seller" | "manager";
  }[]>([
    { username: "admin@marcopolo.com", fullName: "Admin", password: "Marcopolo$", role: "admin" }
  ]);
  const [currentUser, setCurrentUser] = useState<{ username: string; fullName: string; role: string } | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check auth and users on mount
    if (typeof window !== 'undefined') {
      setIsAuthenticated(localStorage.getItem('mp-invoice-auth') === '1');
      const storedUsers = localStorage.getItem('mp-invoice-users');
      if (storedUsers) {
        try { setUsers(JSON.parse(storedUsers)); } catch {}
      }
      const storedUser = localStorage.getItem('mp-invoice-user');
      if (storedUser) {
        try { setCurrentUser(JSON.parse(storedUser)); } catch {}
      }

      // --- Logout on window/tab close only (not reload) ---
      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        // Only logout if not a reload
        if (isWindowClosing(event)) {
          logout();
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      // --- Logout after 2 hours of inactivity ---
      let inactivityTimeout: ReturnType<typeof setTimeout> | undefined;
      const resetInactivityTimer = () => {
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
          logout();
        }, 2 * 60 * 60 * 1000); // 2 hours
      };
      // Reset timer on user activity
      ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, resetInactivityTimer);
      });
      resetInactivityTimer();

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(evt => {
          window.removeEventListener(evt, resetInactivityTimer);
        });
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
      };
    }
  }, []);

  useEffect(() => {
    // Save users to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('mp-invoice-users', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    // Update count from Firebase/localStorage
    const updateCount = async () => {
      const invoices = await getAllInvoices();
      setInvoiceCount(invoices.length);
    };
    updateCount();
  }, [showPreview]);

  const handleFormSubmit = (data: InvoiceData) => {
    // Validate data
    const validationErrors = validateInvoiceData(data);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setShowPreview(false);
      return;
    }

    // Clear errors and set data
    setErrors([]);
    setInvoiceData(data);
    setShowPreview(true);
    setShowSearch(false);

    // Save invoice to storage (async)
    saveInvoice(data).then(async () => {
      // Update count from Firebase
      const invoices = await getAllInvoices();
      setInvoiceCount(invoices.length);
      // Clear the saved invoice number so a new one is generated for next invoice
      localStorage.removeItem('currentInvoiceNumber');

      // Trigger git commit and push after invoice is generated
      // This will be handled by the backend/terminal, not the browser
    }).catch((error) => {
      console.error('Error saving invoice:', error);
      alert('Invoice saved locally but cloud sync failed. Check Firebase configuration.');
    });

    // Scroll to preview
    setTimeout(() => {
      document.getElementById('preview-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const handlePrint = () => {
    if (!invoiceRef.current) return;
    const printContents = invoiceRef.current.innerHTML;
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'fixed';
    printWindow.style.right = '0';
    printWindow.style.bottom = '0';
    printWindow.style.width = '0';
    printWindow.style.height = '0';
    printWindow.style.border = 'none';
    document.body.appendChild(printWindow);
    const doc = printWindow.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write('<html><head><title>Print Invoice</title>');
      doc.write(`
        <style>
          @page { size: A4; margin: 0; }
          html, body { width: 210mm; height: 297mm; background: #fff; color: #222; font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .invoice { width: 190mm !important; min-height: 277mm !important; margin: 0 auto; padding: 10mm; background: #fff; }
          @media print {
            body { margin: 0; box-shadow: none; }
            .invoice { box-shadow: none; }
          }
        </style>
      `);
      doc.write('</head><body>');
      doc.write(printContents);
      doc.write('</body></html>');
      doc.close();
      printWindow.contentWindow?.focus();
      setTimeout(() => {
        printWindow.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printWindow), 1000);
      }, 300);
    }
  };

  const handleDownloadPDF = async () => {
    if (invoiceRef.current && invoiceData) {
      try {
        await generatePDF(invoiceRef.current, invoiceData.invoiceNumber);
      } catch (error) {
        alert('Failed to generate PDF. Please try using Print instead.');
      }
    }
  };

  const handleSendEmail = async () => {
    if (!invoiceRef.current || !invoiceData) return;

    // Check if email is configured
    if (!isEmailConfigured()) {
      alert('Email service is not configured yet.\\n\\nPlease set up EmailJS to enable email functionality.\\n\\nSee email-service.ts for setup instructions.');
      return;
    }

    // Check if customer has email
    const customerEmail = prompt(
      `Send Invoice ${invoiceData.invoiceNumber} to Customer\\n\\n` +
      `Customer: ${invoiceData.soldTo.name}\\n\\n` +
      `Enter customer email address:`
    );

    if (!customerEmail) return;

    // Validate email format
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      alert('Invalid email address. Please try again.');
      return;
    }

    // Prepare invoice HTML for email
    const invoiceHTML = prepareInvoiceForEmail(invoiceRef.current);

    // Send email
    const sending = confirm(
      `Send invoice to ${customerEmail}?\\n\\n` +
      `Invoice: ${invoiceData.invoiceNumber}\\n` +
      `Customer: ${invoiceData.soldTo.name}\\n\\n` +
      `Click OK to send.`
    );

    if (!sending) return;

    try {
      const success = await sendInvoiceEmail(
        customerEmail,
        invoiceData.soldTo.name,
        invoiceData.invoiceNumber,
        invoiceHTML
      );

      if (success) {
        alert(`Invoice sent successfully to ${customerEmail}!`);
      } else {
        alert('Failed to send invoice. Please check your email configuration.');
      }
    } catch (error) {
      alert('Error sending invoice. Please try again later.');
      console.error('Email error:', error);
    }
  };

  const handleNewInvoice = () => {
    setInvoiceData(null);
    setShowPreview(false);
    setShowSearch(false);
    setErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShowSearch = () => {
    setShowSearch(true);
    setShowPreview(false);
    setErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectInvoice = (savedInvoice: SavedInvoice) => {
    setInvoiceData(savedInvoice.data);
    setShowPreview(true);
    setShowSearch(false);
    setErrors([]);
    
    setTimeout(() => {
      document.getElementById('preview-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const calculations = invoiceData ? calculateInvoice(invoiceData) : null;

  if (!isAuthenticated) {
    return <Login onLogin={() => {
      setIsAuthenticated(true);
      const storedUser = localStorage.getItem('mp-invoice-user');
      if (storedUser) {
        try { setCurrentUser(JSON.parse(storedUser)); } catch {}
      }
    }} />;
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Rug Business Invoice System</h1>
            <p>Professional invoicing for Web, Android, and Windows</p>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              <b>Logged in as:</b> {currentUser?.fullName || currentUser?.username || 'Unknown'} ({currentUser?.role || 'Unknown'})
              <span style={{ marginLeft: 16 }}><b>Admin:</b> admin@marcopolo.com</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button onClick={handleShowSearch} className={styles.searchBtn}>
              🔍 Search Invoices ({invoiceCount})
            </button>
            <button onClick={handleNewInvoice} className={styles.newBtnHeader}>
              ➕ New Invoice
            </button>
            {/* Settings Dropdown */}
            <div style={{ position: 'relative', marginLeft: 10 }}>
              <button
                className={styles.settingsBtn}
                style={{ padding: '10px 18px', borderRadius: 8, background: '#fff', color: '#764ba2', fontWeight: 600, border: 'none', fontSize: 16, cursor: 'pointer' }}
                onClick={() => setShowSettings(s => !s)}
              >
                ⚙️ Settings
              </button>
              {showSettings && (
                <div style={{ position: 'absolute', right: 0, top: 45, background: '#fff', color: '#222', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 220, zIndex: 1000, padding: 12 }}>
                  <div style={{ padding: '8px 0', borderBottom: '1px solid #eee', fontWeight: 500 }}>
                    {currentUser?.fullName || currentUser?.username} ({currentUser?.role})
                  </div>
                  <button
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 0', fontSize: 15, cursor: 'pointer' }}
                    onClick={() => {
                      logout();
                      setShowSettings(false);
                    }}
                  >
                    🚪 Logout
                  </button>
                  {currentUser?.role === 'admin' && (
                    <div style={{ marginTop: 8 }}>
                      <UserManagement users={users} setUsers={setUsers} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className={styles.errors}>
            <h3>Please fix the following errors:</h3>
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Invoice Form */}
        {!showSearch && !showPreview && (
          <div className={styles.formSection}>
            <InvoiceForm onSubmit={handleFormSubmit} initialData={invoiceData || undefined} currentUser={currentUser} users={users} />
          </div>
        )}

        {/* Invoice Search */}
        {showSearch && (
          <div className={styles.searchSection}>
            <InvoiceSearch 
              onSelectInvoice={handleSelectInvoice}
              onClose={() => setShowSearch(false)}
            />
          </div>
        )}

        {/* Invoice Preview and Actions */}
        {showPreview && invoiceData && calculations && (
          <div id="preview-section" className={styles.previewSection}>
            <div className={styles.actions}>
              <h2>Invoice Preview</h2>
              <div className={styles.actionButtons}>
                <button onClick={handlePrint} className={styles.printBtn}>
                  🖨️ Print
                </button>
                <button onClick={handleDownloadPDF} className={styles.pdfBtn}>
                  📄 Download PDF
                </button>
                <button onClick={handleSendEmail} className={styles.emailBtn}>
                  📧 Email Invoice
                </button>
                <button onClick={handleNewInvoice} className={styles.newBtn}>
                  ➕ New Invoice
                </button>
              </div>
            </div>

            <div ref={invoiceRef} className={styles.invoiceContainer}>
              <InvoiceTemplate
                data={invoiceData}
                calculations={calculations}
                businessInfo={businessConfig}
              />
            </div>

            <div className={styles.bottomActions}>
              <button onClick={handlePrint} className={styles.printBtn}>
                🖨️ Print
              </button>
              <button onClick={handleDownloadPDF} className={styles.pdfBtn}>
                📄 Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
