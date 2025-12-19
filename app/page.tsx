/**
 * MAIN INVOICE PAGE
 * 
 * Entry point for the invoice system
 * Combines form, template, and actions
 */

'use client';

import React, { useState, useRef } from 'react';
import InvoiceForm from '@/components/InvoiceForm';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import InvoiceSearch from '@/components/InvoiceSearch';
import { InvoiceData, calculateInvoice, validateInvoiceData } from '@/lib/calculations';
import { printInvoice, generatePDF } from '@/lib/pdf-utils';
import { saveInvoice, getInvoicesCount, SavedInvoice } from '@/lib/invoice-storage';
import { businessConfig } from '@/config/business';
import styles from './page.module.css';

export default function Home() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const invoiceRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setInvoiceCount(getInvoicesCount());
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

    // Save invoice to storage
    saveInvoice(data);
    setInvoiceCount(getInvoicesCount());

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

  return (
    <main className={styles.main}>
      <div className={styles.container}>
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
            <InvoiceForm onSubmit={handleFormSubmit} initialData={invoiceData || undefined} />
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
