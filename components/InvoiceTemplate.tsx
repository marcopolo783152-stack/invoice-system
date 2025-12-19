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
          <div className={styles.logoCircle}>
            <div className={styles.logoOrnate}>
              <svg viewBox="0 0 200 200" className={styles.logoSvg}>
                {/* Ornate decorative border */}
                <circle cx="100" cy="100" r="95" fill="url(#grad1)" stroke="#d4af37" strokeWidth="3"/>
                <circle cx="100" cy="100" r="88" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.5"/>
                <circle cx="100" cy="100" r="80" fill="none" stroke="#d4af37" strokeWidth="2"/>
                {/* Center text */}
                <text x="100" y="95" textAnchor="middle" fill="#d4af37" fontSize="42" fontWeight="bold" fontFamily="serif">MPR</text>
                {/* Circular text */}
                <path id="circlePath" d="M 100,20 A 80,80 0 1,1 99.9,20" fill="none"/>
                <text fontSize="11" fill="#d4af37" fontWeight="600" letterSpacing="2">
                  <textPath href="#circlePath" startOffset="12%">POLO • ORIENTAL • RUGS • MARCO</textPath>
                </text>
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" stopOpacity="1" />
                    <stop offset="100%" stopColor="#764ba2" stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
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
                <td className={styles.value}>{data.date}</td>
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
          <div className={styles.signature}>
            <p>Authorized Signature: _______________________________</p>
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
    </div>
  );
}
