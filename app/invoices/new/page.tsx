/**
 * MAIN INVOICE PAGE
 * 
 * Entry point for the invoice system
 * Combines form, template, and actions
 */

'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import InvoiceForm from '@/components/InvoiceForm';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import PrintPortal from '@/components/PrintPortal';


import InvoiceSearch from '@/components/InvoiceSearch';
const Login = dynamic(() => import('@/components/Login').then(mod => mod.default), { ssr: false });
const UserManagement = dynamic(() => import('@/components/UserManagement'), { ssr: false });
import { InvoiceData, calculateInvoice, validateInvoiceData } from '@/lib/calculations';
import { printInvoice, generatePDF, openPDFInNewTab, isMobileDevice } from '@/lib/pdf-utils';
import { saveInvoice, getInvoicesCount, getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { sendInvoiceEmail, prepareInvoiceForEmail, isEmailConfigured } from '@/lib/email-service';
import { businessConfig } from '@/config/business';
import styles from './page.module.css';

function InvoicePageContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  // Settings dropdown state
  const [showSettings, setShowSettings] = useState(false);

  // Logout function
  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    sessionStorage.removeItem('mp-invoice-auth');
    sessionStorage.removeItem('mp-invoice-user');
    // Also clean local just in case
    localStorage.removeItem('mp-invoice-auth');
    localStorage.removeItem('mp-invoice-user');
  };

  // Helper to detect if page is being closed (not reloaded)
  function isWindowClosing(event: BeforeUnloadEvent) {
    if (window.performance) {
      const navs = window.performance.getEntriesByType && window.performance.getEntriesByType('navigation');
      const nav = navs && navs.length > 0 ? navs[0] as PerformanceNavigationTiming : undefined;
      if (nav && 'type' in nav) {
        if (nav.type === 'reload') return false;
        if (nav.type === 'navigate') return false;
      }
      if ((window.performance as any).navigation && (window.performance as any).navigation.type === 1) return false;
    }
    return true;
  }
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [formInitialData, setFormInitialData] = useState<Partial<InvoiceData> | undefined>(undefined);
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
    { username: "admin@marcopolo.com", fullName: "Nazif", password: "Marcopolo$", role: "admin" },
    { username: "manager@marcopolo.com", fullName: "Farid", password: "manager", role: "manager" }
  ]);
  const [currentUser, setCurrentUser] = useState<{ username: string; fullName: string; role: string } | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check auth and users on mount
    if (typeof window !== 'undefined') {
      // Check SESSION storage for auth (fallback to local for legacy)
      const auth = sessionStorage.getItem('mp-invoice-auth') || localStorage.getItem('mp-invoice-auth');
      setIsAuthenticated(auth === '1');

      const storedUsers = localStorage.getItem('mp-invoice-users');
      if (storedUsers) {
        try { setUsers(JSON.parse(storedUsers)); } catch { }
      }

      // Check SESSION storage for user (fallback to local)
      const storedUser = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');
      if (storedUser) {
        try { setCurrentUser(JSON.parse(storedUser)); } catch { }
      }

      // --- Logout after 2 hours of inactivity ---
      let inactivityTimeout: ReturnType<typeof setTimeout> | undefined;
      const resetInactivityTimer = () => {
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
          logout();
          alert('Session timed out due to inactivity.'); // Inform user
        }, 2 * 60 * 60 * 1000); // 2 hours
      };

      // Reset timer on user activity
      const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
      events.forEach(evt => {
        window.addEventListener(evt, resetInactivityTimer);
      });
      resetInactivityTimer();

      return () => {
        events.forEach(evt => {
          window.removeEventListener(evt, resetInactivityTimer);
        });
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
      };
    }
  }, []);

  useEffect(() => {
    if (editId) {
      getAllInvoices().then(invoices => {
        const found = invoices.find(inv => inv.id === editId || inv.data.invoiceNumber === editId);
        if (found) {
          setFormInitialData(found.data);
        }
      });
    }
  }, [editId]);

  useEffect(() => {
    // Save users to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('mp-invoice-users', JSON.stringify(users));

      // Update currentUser if their details changed
      if (currentUser) {
        const updatedUser = users.find(u => u.username === currentUser.username);
        if (updatedUser) {
          setCurrentUser(updatedUser);
          sessionStorage.setItem('mp-invoice-user', JSON.stringify(updatedUser));
        }
      }
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

  useEffect(() => {
    // Check for converted items from Consignment (Sold Workflow)
    if (typeof window !== 'undefined') {
      const convertItemsStr = sessionStorage.getItem('convert_items');
      if (convertItemsStr) {
        try {
          const items = JSON.parse(convertItemsStr);
          setFormInitialData({
            documentType: 'INVOICE',
            items: items,
            date: new Date().toISOString().split('T')[0],
            terms: 'Due on Receipt'
          });
          // Clear it so it doesn't persist on reload/navigation
          sessionStorage.removeItem('convert_items');
        } catch (e) {
          console.error('Error parsing converted items', e);
        }
      }
    }
  }, []);

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
    saveInvoice(data, editId || undefined).then(async () => {
      // Update count from Firebase
      const invoices = await getAllInvoices();
      setInvoiceCount(invoices.length);
      // Clear the saved invoice number so a new one is generated for next invoice
      localStorage.removeItem('currentInvoiceNumber');
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

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (invoiceRef.current && invoiceData) {
      setIsPrinting(true);
      try {
        // Use client-side PDF generation to open in new tab
        await openPDFInNewTab(invoiceRef.current, invoiceData.invoiceNumber);
      } catch (error) {
        console.error('Print generation failed:', error);
        alert('Failed to generate print view. Please try again.');
      } finally {
        setIsPrinting(false);
      }
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

    if (!isEmailConfigured()) {
      alert('Email service is not configured yet.\\n\\nPlease set up EmailJS to enable email functionality.\\n\\nSee email-service.ts for setup instructions.');
      return;
    }

    const customerEmail = prompt(
      `Send Invoice ${invoiceData.invoiceNumber} to Customer\\n\\n` +
      `Customer: ${invoiceData.soldTo.name}\\n\\n` +
      `Enter customer email address:`
    );

    if (!customerEmail) return;

    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      alert('Invalid email address. Please try again.');
      return;
    }

    const invoiceHTML = prepareInvoiceForEmail(invoiceRef.current);

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
      const storedUser = sessionStorage.getItem('mp-invoice-user');
      if (storedUser) {
        try { setCurrentUser(JSON.parse(storedUser)); } catch { }
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
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></div>
              <span>{currentUser?.fullName} ({currentUser?.role})</span>
            </div>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6366f1', fontSize: 13, fontWeight: 500,
                  marginTop: 4, display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <span>Mange Users</span> ⚙️
              </button>
            )}
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
            <InvoiceForm
              onSubmit={handleFormSubmit}
              initialData={formInitialData}
              currentUser={currentUser}
              users={users}
              key={formInitialData ? 'edit-mode' : 'create-mode'}
            />
          </div>
        )}

        {/* User Management Modal */}
        {showSettings && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
          }}>
            <div style={{ background: 'white', padding: 20, borderRadius: 8, maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
              <UserManagement
                users={users}
                setUsers={setUsers}
                currentUser={currentUser}
                onClose={() => setShowSettings(false)}
              />
            </div>
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
                <button onClick={handlePrint} className={styles.printBtn} disabled={isPrinting}>
                  🖨️ {isPrinting ? 'Preparing...' : 'Print'}
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

            {/* Print-only wrapper: only this area will be printed */}
            {/* Screen Preview (Visible on Screen, Hidden on Print via CSS) */}
            <div className="screen-only invoice-paper" ref={invoiceRef} id="invoice-view">
              <InvoiceTemplate
                data={invoiceData}
                calculations={calculations}
                businessInfo={businessConfig}
              />
            </div>

            {/* Print Portal (Hidden on Screen, Visible on Print) */}
            <PrintPortal>
              <div className="print-only-portal">
                <InvoiceTemplate
                  data={invoiceData}
                  calculations={calculations}
                  businessInfo={businessConfig}
                />
              </div>
            </PrintPortal>

            <div className={styles.bottomActions}>
              <button onClick={handlePrint} className={styles.printBtn} disabled={isPrinting}>
                🖨️ {isPrinting ? 'Preparing...' : 'Print'}
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

export default function Home() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <InvoicePageContent />
    </Suspense>
  );
}
