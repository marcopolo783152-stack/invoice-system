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
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<{
    username: string;
    password: string;
    role: "admin" | "seller" | "manager";
  }[]>([
    { username: "admin@marcopolo.com", password: "Marcopolo$", role: "admin" }
  ]);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
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
    printInvoice();
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
        {/* User Management for admin */}
        {currentUser?.role === 'admin' && (
          <UserManagement users={users} setUsers={setUsers} />
        )}
        <header className={styles.header}>
          <div>
            <h1>Rug Business Invoice System</h1>
            <p>Professional invoicing for Web, Android, and Windows</p>
          </div>
          <div className={styles.headerActions}>
            <button onClick={handleShowSearch} className={styles.searchBtn}>
              🔍 Search Invoices ({invoiceCount})
            </button>
            <button onClick={handleNewInvoice} className={styles.newBtnHeader}>
              ➕ New Invoice
            </button>
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
            <InvoiceForm onSubmit={handleFormSubmit} initialData={invoiceData || undefined} currentUser={currentUser} />
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
