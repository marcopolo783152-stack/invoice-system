/**
 * INVOICE SEARCH COMPONENT
 * 
 * Search and view saved invoices
 */

'use client';

import React, { useState, useEffect } from 'react';
import { searchInvoices, getAllInvoices, deleteInvoice, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, formatCurrency } from '@/lib/calculations';
import { exportInvoicesAsPDFs, ExportProgress } from '@/lib/bulk-export';
import styles from './InvoiceSearch.module.css';

interface InvoiceSearchProps {
  onSelectInvoice: (invoice: SavedInvoice) => void;
  onClose?: () => void;
}

export default function InvoiceSearch({ onSelectInvoice, onClose }: InvoiceSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SavedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SavedInvoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  useEffect(() => {
    // Load all invoices on mount
    setResults(getAllInvoices().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setResults(getAllInvoices().sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } else {
      setResults(searchInvoices(query).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
  };

  const handleViewInvoice = (invoice: SavedInvoice) => {
    setSelectedInvoice(invoice);
  };

  const handleSelectInvoice = (invoice: SavedInvoice) => {
    onSelectInvoice(invoice);
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice(id);
      handleSearch(searchQuery); // Refresh results
      setSelectedInvoice(null);
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === results.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map(inv => inv.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    
    if (confirm(`Delete ${selectedIds.length} selected invoice(s)? This cannot be undone.`)) {
      selectedIds.forEach(id => deleteInvoice(id));
      handleSearch(searchQuery);
      setSelectedInvoice(null);
      setSelectedIds([]);
    }
  };

  const handleExportAll = async () => {
    if (results.length === 0) {
      alert('No invoices to export');
      return;
    }

    if (!confirm(`Export ${results.length} invoice(s) as PDF files in a ZIP?\n\nThis may take a few moments.`)) {
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: results.length, status: 'Starting...', percentage: 0 });

    try {
      await exportInvoicesAsPDFs(results, (progress) => {
        setExportProgress(progress);
      });
      alert('Export complete! Your ZIP file has been downloaded.');
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting invoices. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Search Invoices</h2>
        <div className={styles.headerActions}>
          <button 
            onClick={handleSelectAll} 
            className={styles.selectAllBtn}
            disabled={results.length === 0}
          >
            {selectedIds.length === results.length && results.length > 0 ? '☐' : '☑'} Select All
          </button>
          <button 
            onClick={handleDeleteSelected} 
            className={styles.deleteSelectedBtn}
            disabled={selectedIds.length === 0}
          >
            🗑️ Delete Selected ({selectedIds.length})
          </button>
          <button 
            onClick={handleExportAll} 
            className={styles.exportBtn}
            disabled={isExporting || results.length === 0}
          >
            📥 Export All PDFs ({results.length})
          </button>
          {onClose && (
            <button onClick={onClose} className={styles.closeBtn}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Export Progress */}
      {isExporting && exportProgress && (
        <div className={styles.progressBar}>
          <div className={styles.progressInfo}>
            <span>{exportProgress.status}</span>
            <span>{exportProgress.percentage}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${exportProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className={styles.searchBox}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by invoice #, customer name, phone, or address..."
          className={styles.searchInput}
          autoFocus
        />
        <span className={styles.resultCount}>
          {results.length} invoice{results.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.resultsList}>
          {results.length === 0 ? (
            <div className={styles.noResults}>
              <p>No invoices found</p>
              <small>
                {searchQuery ? 'Try a different search term' : 'Create your first invoice to get started'}
              </small>
            </div>
          ) : (
            results.map((invoice) => {
              const calculations = calculateInvoice(invoice.data);
              const isSelected = selectedInvoice?.id === invoice.id;
              const isChecked = selectedIds.includes(invoice.id);
              
              return (
                <div
                  key={invoice.id}
                  className={`${styles.resultItem} ${isSelected ? styles.selected : ''} ${isChecked ? styles.checked : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(invoice.id);
                    }}
                    className={styles.checkbox}
                  />
                  <div 
                    className={styles.itemContent}
                    onClick={() => handleViewInvoice(invoice)}
                  >
                  <div className={styles.resultHeader}>
                    <span className={styles.invoiceNumber}>
                      {invoice.data.invoiceNumber}
                    </span>
                    <span className={styles.invoiceDate}>
                      {invoice.data.date}
                    </span>
                  </div>
                  <div className={styles.customerName}>
                    {invoice.data.soldTo.name}
                  </div>
                  <div className={styles.resultDetails}>
                    {invoice.data.soldTo.phone && (
                      <span>📞 {invoice.data.soldTo.phone}</span>
                    )}
                    {invoice.data.soldTo.address && (
                      <span>📍 {invoice.data.soldTo.address}</span>
                    )}
                  </div>
                  <div className={styles.resultFooter}>
                    <span className={styles.total}>
                      {formatCurrency(calculations.totalDue)}
                    </span>
                    <span className={styles.itemCount}>
                      {invoice.data.items.length} item{invoice.data.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className={styles.timestamp}>
                    Created: {formatDate(invoice.createdAt)}
                  </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedInvoice && (
          <div className={styles.previewPanel}>
            <div className={styles.previewHeader}>
              <h3>Invoice Preview</h3>
              <div className={styles.previewActions}>
                <button
                  onClick={() => handleSelectInvoice(selectedInvoice)}
                  className={styles.viewBtn}
                >
                  📄 View Full Invoice
                </button>
                <button
                  onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                  className={styles.deleteBtn}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewSection}>
                <h4>Invoice Details</h4>
                <p><strong>Invoice #:</strong> {selectedInvoice.data.invoiceNumber}</p>
                <p><strong>Date:</strong> {selectedInvoice.data.date}</p>
                <p><strong>Terms:</strong> {selectedInvoice.data.terms}</p>
                <p><strong>Mode:</strong> {selectedInvoice.data.mode}</p>
              </div>
              <div className={styles.previewSection}>
                <h4>Customer</h4>
                <p><strong>{selectedInvoice.data.soldTo.name}</strong></p>
                <p>{selectedInvoice.data.soldTo.address}</p>
                <p>{selectedInvoice.data.soldTo.city}, {selectedInvoice.data.soldTo.state} {selectedInvoice.data.soldTo.zip}</p>
                {selectedInvoice.data.soldTo.phone && <p>📞 {selectedInvoice.data.soldTo.phone}</p>}
              </div>
              <div className={styles.previewSection}>
                <h4>Items ({selectedInvoice.data.items.length})</h4>
                {selectedInvoice.data.items.map((item, idx) => (
                  <div key={item.id} className={styles.previewItem}>
                    <p><strong>{idx + 1}. {item.sku}</strong> - {item.description}</p>
                    <p className={styles.itemDetails}>
                      {item.shape === 'round' 
                        ? `Round: ${item.widthFeet}'${item.widthInches}" diameter`
                        : `${item.widthFeet}'${item.widthInches}" × ${item.lengthFeet}'${item.lengthInches}"`
                      }
                    </p>
                  </div>
                ))}
              </div>
              <div className={styles.previewSection}>
                <h4>Total</h4>
                <p className={styles.totalAmount}>
                  {formatCurrency(calculateInvoice(selectedInvoice.data).totalDue)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
