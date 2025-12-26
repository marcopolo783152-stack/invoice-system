/**
 * INVOICE TEMPLATE - UI COMPONENT
 * 
 * Professional printed invoice layout - LOCKED DESIGN
 * This component displays the invoice exactly as it should print.
 * DO NOT modify layout, spacing, or arrangement.
 */

import React from 'react';
import {
  InvoiceData,
  InvoiceCalculations,
  formatCurrency,
  formatSquareFoot,
  RugShape,
} from '@/lib/calculations';
import styles from './InvoiceTemplate.module.css';

interface InvoiceTemplateProps {
  data: InvoiceData;
  calculations: InvoiceCalculations;
  businessInfo?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    fax?: string;
    website?: string;
    email?: string;
  };
}

export default function InvoiceTemplate({
  data,
  calculations,
  businessInfo = {
    name: 'MARCO POLO ORIENTAL RUGS, INC.',
    address: '3260 DUKE ST',
    city: 'ALEXANDRIA',
    state: 'VA',
    zip: '22314',
    phone: '703-461-0207',
    fax: '703-461-0208',
    website: 'www.marcopolorugs.com',
    email: 'marcopolorugs@aol.com',
  },
}: InvoiceTemplateProps) {
  // Format date as mm/dd/yyyy
  function formatDateMMDDYYYY(dateString: string) {
    // If dateString is in yyyy-mm-dd, parse as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [yyyy, mm, dd] = dateString.split('-');
      return `${mm}/${dd}/${yyyy}`;
    }
    // Otherwise, fallback to Date parsing
    const d = new Date(dateString);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }
  const isRetail = data.mode.startsWith('retail');
  const isPerSqFt = data.mode.includes('per-sqft');

  // PAGINATION LOGIC
  const ITEMS_PER_PAGE = 20;
  const items = calculations.items;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

  // Create array of page indices [0, 1, 2...]
  const pages = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <>
      {pages.map((pageIndex) => {
        const isLastPage = pageIndex === totalPages - 1;
        const startIdx = pageIndex * ITEMS_PER_PAGE;
        const pageItems = items.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        return (
          <div key={pageIndex} className={styles.invoice}>
            {/* Header Section - Repeated on every page */}
            <div className={styles.header}>
              <div className={styles.businessInfo}>
                <h1>{businessInfo.name}</h1>
                <p>{businessInfo.address}</p>
                <p>
                  {businessInfo.city}, {businessInfo.state} {businessInfo.zip}
                </p>
                <p>Phone: {businessInfo.phone}</p>
                {businessInfo.fax && <p>Fax: {businessInfo.fax}</p>}
                {businessInfo.website && <p>Website: {businessInfo.website}</p>}
                {businessInfo.email && <p>Email: {businessInfo.email}</p>}
              </div>
              <div className={styles.logoSection}>
                <img
                  src="/LOGO.png"
                  alt="Marco Polo Oriental Rugs"
                  className={`${styles.logoImage} invoice-logo`}
                  onError={e => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.textContent = 'LOGO';
                    fallback.style.width = '120px';
                    fallback.style.height = '100px';
                    fallback.style.display = 'flex';
                    fallback.style.alignItems = 'center';
                    fallback.style.justifyContent = 'center';
                    fallback.style.background = '#eee';
                    fallback.style.color = '#888';
                    fallback.style.fontWeight = 'bold';
                    fallback.style.fontSize = '18px';
                    target.parentNode?.appendChild(fallback);
                  }}
                />
              </div>
            </div>

            {/* Document Title & Page Number */}
            <div className={styles.documentTitle}>
              <h2 style={{ textAlign: 'center', margin: '10px 0 5px 0', letterSpacing: 2 }}>
                {data.documentType === 'CONSIGNMENT' ? 'CONSIGNMENT OUT' : 'INVOICE'}
              </h2>
              {totalPages > 1 && (
                <div style={{ textAlign: 'center', fontSize: '9pt', color: '#666', marginBottom: 15 }}>
                  Page {pageIndex + 1} of {totalPages}
                </div>
              )}
            </div>

            {/* Customer and Invoice Info Section - Repeated */}
            <div className={styles.infoSection}>
              <div className={styles.soldTo}>
                <h3>SOLD TO:</h3>
                <p className={styles.customerName}>{data.soldTo.name}</p>
                <p>{data.soldTo.address}</p>
                <p>
                  {data.soldTo.city}, {data.soldTo.state} {data.soldTo.zip}
                </p>
                {data.soldTo.phone && <p>Phone: {data.soldTo.phone}</p>}
                {data.soldTo.email && <p>Email: {data.soldTo.email}</p>}
                {data.servedBy && (
                  <p><b>Served by:</b> {data.servedBy}</p>
                )}
              </div>
              <div className={styles.invoiceInfo}>
                <table>
                  <tbody>
                    <tr>
                      <td className={styles.label}>Invoice #:</td>
                      <td className={styles.value}>{data.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td className={styles.label}>Date:</td>
                      <td className={styles.value}>{formatDateMMDDYYYY(data.date)}</td>
                    </tr>
                    <tr>
                      <td className={styles.label}>Terms:</td>
                      <td className={styles.value}>{data.terms}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Items Table */}
            <div className={styles.itemsSection}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Description</th>
                    <th>Shape</th>
                    <th colSpan={2}>Width/Diameter</th>
                    <th colSpan={2}>Length</th>
                    <th>Sq.Ft</th>
                    {isPerSqFt && <th>Price/Sq.Ft</th>}
                    <th>Amount</th>
                  </tr>
                  <tr className={styles.subheader}>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th className={styles.smallCol}>Ft</th>
                    <th className={styles.smallCol}>In</th>
                    <th className={styles.smallCol}>Ft</th>
                    <th className={styles.smallCol}>In</th>
                    <th></th>
                    {isPerSqFt && <th></th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item.id} style={item.returned ? { color: '#dc2626', backgroundColor: '#fef2f2' } : {}}>
                      <td>{item.sku}</td>
                      <td className={styles.description}>
                        {item.returned && <span style={{ fontWeight: 'bold', marginRight: 4 }}>[RETURNED]</span>}
                        {item.description}
                        {item.image && (
                          <div style={{ marginTop: 4 }}>
                            <img src={item.image} alt="Item" style={{ maxHeight: 60, maxWidth: 100, objectFit: 'contain', border: '1px solid #eee' }} />
                          </div>
                        )}
                      </td>
                      <td className={styles.shape}>
                        {item.shape === 'round' ? 'Round' : 'Rect'}
                      </td>
                      <td className={styles.numeric}>{item.widthFeet}</td>
                      <td className={styles.numeric}>{item.widthInches}</td>
                      <td className={styles.numeric}>
                        {item.shape === 'rectangle' ? item.lengthFeet : '-'}
                      </td>
                      <td className={styles.numeric}>
                        {item.shape === 'rectangle' ? item.lengthInches : '-'}
                      </td>
                      <td className={styles.numeric}>{formatSquareFoot(item.squareFoot)}</td>
                      {isPerSqFt && (
                        <td className={styles.numeric}>
                          {item.pricePerSqFt ? formatCurrency(item.pricePerSqFt) : '-'}
                        </td>
                      )}
                      <td className={styles.numeric}>{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows if needed for consistent height? No, user just wants 20 per page. */}
                </tbody>
              </table>
            </div>

            {/* Footer Section - ONLY ON LAST PAGE */}
            {isLastPage ? (
              <div className={styles.footer}>
                <div className={styles.notesSection}>
                  {data.notes && (
                    <>
                      <h4>Notes:</h4>
                      <p>{data.notes}</p>
                    </>
                  )}
                  <div className={styles.salesTerms}>
                    <h4>Terms & Conditions:</h4>
                    {data.documentType === 'CONSIGNMENT' ? (
                      <p>All items remain property of Marco Polo Oriental Rugs until sold. Payment due upon sale or return. Items not sold within 90 days may be returned.</p>
                    ) : (
                      <>
                        <p>1. All Sales are final</p>
                        <p>2. No refunds. Exchanges only within one week of purchase.</p>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.totalsSection}>
                  <table className={styles.totalsTable}>
                    <tbody>
                      <tr>
                        <td className={styles.totalLabel}>Subtotal:</td>
                        <td className={styles.totalValue}>{formatCurrency(calculations.subtotal)}</td>
                      </tr>
                      {isRetail && calculations.discount > 0 && (
                        <tr>
                          <td className={styles.totalLabel}>
                            Discount ({data.discountPercentage}%):
                          </td>
                          <td className={styles.totalValue}>-{formatCurrency(calculations.discount)}</td>
                        </tr>
                      )}
                      {isRetail && (
                        <tr>
                          <td className={styles.totalLabel}>Sales Tax (6%):</td>
                          <td className={styles.totalValue}>{formatCurrency(calculations.salesTax)}</td>
                        </tr>
                      )}
                      <tr className={styles.totalDueRow}>
                        <td className={styles.totalLabel}>
                          {data.documentType === 'CONSIGNMENT' ? 'TOTAL VALUE ON HOLD:' : 'TOTAL DUE:'}
                        </td>
                        <td className={styles.totalValue}>{formatCurrency(calculations.totalDue)}</td>
                      </tr>
                      {calculations.returnedAmount > 0 && (
                        <>
                          <tr style={{ color: '#dc2626' }}>
                            <td className={styles.totalLabel}>Less Returns:</td>
                            <td className={styles.totalValue}>-{formatCurrency(calculations.returnedAmount)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>

                  {data.signature && (
                    <div className={styles.signatureSection}>
                      <div className={styles.signatureLabel}>Customer Signature:</div>
                      <div className={styles.signatureImage}>
                        <img src={data.signature} alt="Customer signature" />
                      </div>
                      <div className={styles.signatureDate}>Date: {data.date}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.footer} style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 10 }}>
                <p style={{ fontStyle: 'italic', fontSize: '9pt' }}>Continued on next page...</p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
