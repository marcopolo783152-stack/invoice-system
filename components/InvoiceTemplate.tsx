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

  return (
    <div className={styles.invoice}>
      {/* Header Section */}
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
            className={styles.logoImage}
          />
        </div>
      </div>
      {/* Document Title */}
      <div className={styles.documentTitle}>
        <h2 style={{ textAlign: 'center', margin: '10px 0 20px 0', letterSpacing: 2 }}>
          {data.documentType === 'CONSIGNMENT' ? 'CONSIGNMENT OUT' : 'INVOICE'}
        </h2>
      </div>

      {/* Customer and Invoice Info Section */}
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
            {calculations.items.map((item) => (
              <tr key={item.id}>
                <td>{item.sku}</td>
                <td className={styles.description}>{item.description}</td>
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
          </tbody>
        </table>
      </div>

      {/* Footer Section */}
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
            <p>1. All Sales are final</p>
            <p>2. No refunds. Exchanges only within one week of purchase.</p>
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
                <td className={styles.totalLabel}>TOTAL DUE:</td>
                <td className={styles.totalValue}>{formatCurrency(calculations.totalDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Signature */}
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
  );
}
