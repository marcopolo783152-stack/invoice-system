// ReturnedReceipt component for professional returned receipt
function ReturnedReceipt({ receiptData }: { receiptData: any }) {
  if (!receiptData) return null;
  const { data, returnedItems, returnNote } = receiptData;
  const businessInfo = {
    name: 'MARCO POLO ORIENTAL RUGS, INC.',
    address: '3260 DUKE ST',
    city: 'ALEXANDRIA',
    state: 'VA',
    zip: '22314',
    phone: '703-461-0207',
    fax: '703-461-0208',
    website: 'www.marcopolorugs.com',
    email: 'marcopolorugs@aol.com',
  };
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', color: '#222', padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <img src="/LOGO.png" alt="Logo" style={{ height: 60, marginRight: 16 }} />
        <div>
          <h2 style={{ margin: 0 }}>{businessInfo.name}</h2>
          <div style={{ fontSize: 14 }}>{businessInfo.address}, {businessInfo.city}, {businessInfo.state} {businessInfo.zip}</div>
          <div style={{ fontSize: 14 }}>Phone: {businessInfo.phone} | Fax: {businessInfo.fax}</div>
          <div style={{ fontSize: 14 }}>{businessInfo.website} | {businessInfo.email}</div>
        </div>
      </div>
      <h3 style={{ textAlign: 'center', margin: '16px 0', letterSpacing: 2 }}>RETURNED RECEIPT</h3>
      <div style={{ marginBottom: 12 }}>
        <b>Invoice #:</b> {data.invoiceNumber}<br />
        <b>Date:</b> {new Date().toLocaleDateString()}<br />
        <b>Customer:</b> {data.soldTo.name}<br />
        <b>Address:</b> {data.soldTo.address}, {data.soldTo.city}, {data.soldTo.state} {data.soldTo.zip}<br />
        <b>Phone:</b> {data.soldTo.phone} {data.soldTo.email && (<span>| <b>Email:</b> {data.soldTo.email}</span>)}
      </div>
      <div style={{ marginBottom: 12 }}>
        <b>Returned Items:</b>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {returnedItems.map((item: any) => (
            <li key={item.id}>
              {item.sku} - {item.description}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginBottom: 12 }}>
        <b>Return Note:</b> {returnNote}
      </div>
      <div style={{ marginTop: 24, fontSize: 13, color: '#666' }}>
        Thank you for your business. Please keep this receipt for your records.
      </div>
    </div>
  );
}
/**
 * INVOICE SEARCH COMPONENT
 * 
 * Search and view saved invoices
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { searchInvoices, getAllInvoices, deleteInvoice, deleteMultipleInvoices, SavedInvoice, exportAddressBook } from '@/lib/invoice-storage';
import { calculateInvoice, formatCurrency } from '@/lib/calculations';
import { exportInvoicesAsPDFs, ExportProgress } from '@/lib/bulk-export';
import { requestSecurityConfirmation } from '@/lib/email-service';
import styles from './InvoiceSearch.module.css';

interface InvoiceSearchProps {
  onSelectInvoice: (invoice: SavedInvoice) => void;
  onClose?: () => void;
}

export default function InvoiceSearch({ onSelectInvoice, onClose }: InvoiceSearchProps) {
  const [showAddressBookPreview, setShowAddressBookPreview] = useState(false);
  const [excludedAddressRows, setExcludedAddressRows] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SavedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SavedInvoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [filterTab, setFilterTab] = useState<'ALL' | 'INVOICE' | 'CONSIGNMENT'>('ALL');

  // Rug Return Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [returnProcessing, setReturnProcessing] = useState(false);
  const [returnItems, setReturnItems] = useState<string[]>([]); // item ids
  const [showReturnReceipt, setShowReturnReceipt] = useState(false);
  const [returnedReceiptData, setReturnedReceiptData] = useState<any>(null);

  // Handle rug return
  const handleReturnInvoice = async () => {
    if (!selectedInvoice) return;
    if (returnItems.length === 0) {
      alert('Please select at least one item to return.');
      return;
    }
    if (!confirm('Are you sure you want to process a return for the selected item(s)?')) return;
    setReturnProcessing(true);
    try {
      // Mark only selected items as returned
      const updatedItems = selectedInvoice.data.items.map(item =>
        returnItems.includes(item.id)
          ? { ...item, returned: true, returnNote: returnNote || 'Returned by customer' }
          : item
      );
      const updated = {
        ...selectedInvoice,
        data: {
          ...selectedInvoice.data,
          items: updatedItems,
          returnNote: returnNote || 'Returned by customer',
          returned: updatedItems.every(i => i.returned),
        },
        updatedAt: new Date().toISOString(),
      };
      // Save as an update (reuse saveInvoice logic)
      const { saveInvoice } = await import('@/lib/invoice-storage');
      await saveInvoice(updated.data);
      setReturnedReceiptData({
        ...updated,
        returnedItems: updatedItems.filter(i => i.returned),
        returnNote: returnNote || 'Returned by customer',
      });
      setShowReturnReceipt(true);
      setShowReturnModal(false);
      setReturnNote('');
      setReturnItems([]);
      setReturnProcessing(false);
      await handleSearch(searchQuery);
    } catch (err) {
      alert('Error processing return.');
      setReturnProcessing(false);
    }
  };

  useEffect(() => {
    // Load all invoices on mount (async)
    getAllInvoices().then(invoices => {
      setResults(invoices.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    });
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
    const invoices = await searchInvoices(query);
    setResults(invoices.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  };

  const handleViewInvoice = (invoice: SavedInvoice) => {
    setSelectedInvoice(invoice);
  };

  const handleSelectInvoice = (invoice: SavedInvoice) => {
    onSelectInvoice(invoice);
  };

  const handleDeleteInvoice = async (id: string) => {
    const invoice = results.find(inv => inv.id === id);
    if (!invoice) return;

    if (!confirm('Are you sure you want to delete this invoice?')) return;

    // Require security key before deletion
    const key = prompt('Enter security key to delete invoice:');
    if (key !== 'Marcopolo$') {
      alert('Incorrect security key. Deletion cancelled.');
      return;
    }
    await deleteInvoice(id);
    await handleSearch(searchQuery);
    setSelectedInvoice(null);
    setSelectedIds(prev => prev.filter(sid => sid !== id));
    alert('Invoice deleted successfully.');
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

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Delete ${selectedIds.length} selected invoice(s)? This cannot be undone.`)) return;

    // Require security key before bulk deletion
    const key = prompt('Enter security key to delete selected invoices:');
    if (key !== 'Marcopolo$') {
      alert('Incorrect security key. Bulk deletion cancelled.');
      return;
    }
    await deleteMultipleInvoices(selectedIds);
    await handleSearch(searchQuery);
    setSelectedInvoice(null);
    setSelectedIds([]);
    alert(`${selectedIds.length} invoice(s) deleted successfully.`);
  };

  const handleExportAll = async () => {
    if (results.length === 0) {
      alert('No invoices to export');
      return;
    }

    if (!confirm(`Export ${results.length} invoice(s) as PDF files in a ZIP?\n\nThis may take a few moments.`)) {
      return;
    }

    // Request security confirmation
    const confirmed = await requestSecurityConfirmation(
      'Export All Invoices',
      `Exporting ${results.length} invoice(s) as PDF`
    );

    if (!confirmed) return;

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
    const d = new Date(dateString);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Filter results by tab
  const filteredResults = results.filter(inv => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'INVOICE') return (inv.data.documentType || inv.documentType) !== 'CONSIGNMENT';
    if (filterTab === 'CONSIGNMENT') return (inv.data.documentType || inv.documentType) === 'CONSIGNMENT';
    return true;
  });

  // Download address book CSV
  // Parse address book for preview
  const getAddressBookRows = () => {
    const csv = exportAddressBook();
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const rows = lines.slice(1).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => cell.replace(/"/g, '')));
    return { headers, rows };
  };

  const getFilteredAddressBookRows = () => {
    const { headers, rows } = getAddressBookRows();
    const filteredRows = rows.filter((_, idx) => !excludedAddressRows.includes(idx));
    return { headers, rows: filteredRows };
  };

  const handleShowAddressBookPreview = () => {
    setShowAddressBookPreview(true);
  };

  const handleDownloadAddressBook = () => {
    const { headers, rows } = getFilteredAddressBookRows();
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'address-book.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowAddressBookPreview(false);
    setExcludedAddressRows([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Search Invoices</h2>
        <div style={{ marginBottom: 8 }}>
          <button onClick={handleShowAddressBookPreview} className={styles.exportBtn} style={{ marginRight: 8 }}>
            📤 Address Book (Preview & Download)
          </button>
        </div>
              {showAddressBookPreview && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modalContent}>
                    <h3>Address Book Preview</h3>
                    <div className={styles.addressBookTableWrapper}>
                      <table className={styles.addressBookTable}>
                        <thead>
                          <tr>
                            {getFilteredAddressBookRows().headers.map((header, idx) => (
                              <th key={idx}>{header}</th>
                            ))}
                            <th>Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredAddressBookRows().rows.map((row, idx) => (
                            <tr key={idx}>
                              {row.map((cell, cidx) => (
                                <td key={cidx}>{cell}</td>
                              ))}
                              <td>
                                <button className={styles.removeBtn} onClick={() => setExcludedAddressRows([...excludedAddressRows, idx])}>Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                      <button className={styles.exportBtn} onClick={handleDownloadAddressBook}>Download CSV</button>
                      <button className={styles.closeBtn} onClick={() => { setShowAddressBookPreview(false); setExcludedAddressRows([]); }}>Close</button>
                    </div>
                  </div>
                </div>
              )}
        <div className={styles.filterTabs} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => setFilterTab('ALL')} className={filterTab === 'ALL' ? styles.activeTab : ''}>All</button>
          <button onClick={() => setFilterTab('INVOICE')} className={filterTab === 'INVOICE' ? styles.activeTab : ''}>Invoices</button>
          <button onClick={() => setFilterTab('CONSIGNMENT')} className={filterTab === 'CONSIGNMENT' ? styles.activeTab : ''}>Consignments</button>
        </div>
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
          {filteredResults.length} record{filteredResults.length !== 1 ? 's' : ''} found
        </span>
      </div>
{/* Pagination Controls */}
      {filteredResults.length > 0 && (
        <div className={styles.paginationTop}>
          <div className={styles.pageInfo}>
            Page {currentPage} of {Math.ceil(filteredResults.length / itemsPerPage)} 
            {' '}• Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredResults.length)}-{Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length}
          </div>
          <div className={styles.paginationControls}>
            <button 
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={styles.pageBtn}
            >
              ⏮️ First
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={styles.pageBtn}
            >
              ◀️ Previous
            </button>
            <span className={styles.pageNumber}>Page {currentPage}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(results.length / itemsPerPage), p + 1))}
              disabled={currentPage >= Math.ceil(results.length / itemsPerPage)}
              className={styles.pageBtn}
            >
              Next ▶️
            </button>
            <button 
              onClick={() => setCurrentPage(Math.ceil(results.length / itemsPerPage))}
              disabled={currentPage >= Math.ceil(results.length / itemsPerPage)}
              className={styles.pageBtn}
            >
              Last ⏭️
            </button>
          </div>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={styles.itemsPerPageSelect}
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
          </select>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.resultsList}>
          {filteredResults.length === 0 ? (
            <div className={styles.noResults}>
              <p>No records found</p>
              <small>
                {searchQuery ? 'Try a different search term' : 'Create your first invoice or consignment to get started'}
              </small>
            </div>
          ) : (
            filteredResults
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((invoice) => {
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
                      {(invoice.data.documentType === 'CONSIGNMENT' || invoice.documentType === 'CONSIGNMENT') && (
                        <span className={styles.consignBadge}>Consignment</span>
                      )}
                      {invoice.data.returned && (
                        <span className={styles.returnedBadge}>Returned</span>
                      )}
                    </div>
                    <div className={styles.customerName}>
                      {invoice.data.soldTo.name}
                      {(invoice.data.documentType === 'CONSIGNMENT' || invoice.documentType === 'CONSIGNMENT') && (
                        <span className={styles.givenTo}>
                          &nbsp;| <b>Given To:</b> {invoice.data.soldTo.name}
                        </span>
                      )}
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
                <button
                  onClick={() => setShowReturnModal(true)}
                  className={styles.returnBtn}
                >
                  ↩️ Return
                </button>
                <button
                  onClick={() => {
                    onSelectInvoice(selectedInvoice);
                    if (onClose) onClose();
                  }}
                  className={styles.editBtn}
                >
                  ✏️ Edit
                </button>
              </div>
            {/* Rug Return Modal (uses portal for iPad/mobile compatibility) */}
            {showReturnModal && selectedInvoice && typeof window !== 'undefined' && createPortal(
              <div className={styles.modalOverlay} style={{ zIndex: 10000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                <div className={styles.modalContent} style={{ maxWidth: 400, margin: '10vh auto' }}>
                  <h3>Return Invoice #{selectedInvoice.data.invoiceNumber}</h3>
                  <p>Customer: <b>{selectedInvoice.data.soldTo.name}</b></p>
                  <div>
                    <b>Select items to return:</b>
                    <ul className={styles.returnItemList}>
                      {selectedInvoice.data.items.map(item => (
                        <li key={item.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={returnItems.includes(item.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setReturnItems([...returnItems, item.id]);
                                } else {
                                  setReturnItems(returnItems.filter(id => id !== item.id));
                                }
                              }}
                              disabled={item.returned}
                            />
                            <span style={{ textDecoration: item.returned ? 'line-through' : undefined }}>
                              {item.sku} - {item.description} {item.returned && '(Already Returned)'}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <textarea
                    placeholder="Return note (optional)"
                    value={returnNote}
                    onChange={e => setReturnNote(e.target.value)}
                    rows={3}
                    className={styles.textarea}
                  />
                  <div className={styles.modalActions}>
                    <button onClick={handleReturnInvoice} disabled={returnProcessing} className={styles.returnBtn}>
                      {returnProcessing ? 'Processing...' : 'Confirm Return'}
                    </button>
                    <button onClick={() => setShowReturnModal(false)} className={styles.cancelBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
                    {/* Return Receipt Modal (uses portal for iPad/mobile compatibility) */}
                    {showReturnReceipt && returnedReceiptData && typeof window !== 'undefined' && createPortal(
                      <div className={styles.modalOverlay} style={{ zIndex: 10000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                        <div className={styles.modalContent} style={{ maxWidth: 520, margin: '5vh auto', background: '#fff' }}>
                          <ReturnedReceipt receiptData={returnedReceiptData} />
                          <div className={styles.modalActions}>
                            <button onClick={() => setShowReturnReceipt(false)} className={styles.closeBtn}>Close</button>
                            <button onClick={() => window.print()} className={styles.printBtn}>Print Receipt</button>
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewSection}>
                <h4>Invoice Details</h4>
                <p><strong>Invoice #:</strong> {selectedInvoice.data.invoiceNumber}</p>
                <p><strong>Date:</strong> {selectedInvoice.data.date}</p>
                <p><strong>Terms:</strong> {selectedInvoice.data.terms}</p>
                <p><strong>Mode:</strong> {selectedInvoice.data.mode}</p>
                {selectedInvoice.data.returned && (
                  <p className={styles.returnedInfo}><strong>Status:</strong> Returned<br/>{selectedInvoice.data.returnNote && (<span><strong>Note:</strong> {selectedInvoice.data.returnNote}</span>)}</p>
                )}
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
