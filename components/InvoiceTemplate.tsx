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
  onDeletePayment?: (paymentId: string) => void;
}

export default function InvoiceTemplate({
  data,
  calculations,
  businessInfo = {
    name: 'ARIANA ORIENTAL RUGS INC',
    address: '3210 DUKE ST',
    city: 'ALEXANDRIA',
    state: 'VA',
    zip: '22314',
    phone: '+1 (703) 801 1640',
    fax: '703-461-0208',
    website: '',
    email: 'arianaorientalrugs@gmail.com',
  },
  onDeletePayment,
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
  // We no longer rely on a global isPerSqFt flag for the whole invoice

  // PAGINATION LOGIC
  // PAGINATION LOGIC (Weight-based to handle images)
  const MAX_WEIGHT_PER_PAGE = 22; // Total "height" units allowed per page
  const items = calculations.items;

  // Define item weights: images take much more vertical space
  const getItemWeight = (item: any) => {
    const images = item.images || (item.image ? [item.image] : []);
    if (images.length === 0) return 1;
    if (images.length <= 1) return 4.5;
    return 6; // Extra space for multi-image gallery
  };

  // Footer weight factor
  const hasSubstantialNotes = (data.notes || '').length > 200;
  const hasManyPayments = (data.payments || []).length > 3;
  const hasAdditionalCharges = (data.additionalCharges || []).length > 2;
  const hasSignature = !!(data.signature || data.pickupSignature);
  const footerWeight = (hasSubstantialNotes || hasManyPayments || hasAdditionalCharges || hasSignature) ? 10 : 6;

  // Group items into pages
  const pagesData: any[][] = [];
  let currentPageItems: any[] = [];
  let currentWeight = 0;

  items.forEach((item) => {
    const weight = getItemWeight(item);
    if (currentWeight + weight > MAX_WEIGHT_PER_PAGE) {
      pagesData.push(currentPageItems);
      currentPageItems = [item];
      currentWeight = weight;
    } else {
      currentPageItems.push(item);
      currentWeight += weight;
    }
  });

  // Add the last set of items
  if (currentPageItems.length > 0 || pagesData.length === 0) {
    pagesData.push(currentPageItems);
    // Track weight of the very last page to see if footer fits
  } else {
    currentWeight = 0;
  }

  // Check if we need a dedicated page for the footer
  const lastPageWeight = currentWeight;
  const needsDedicatedFooterPage = lastPageWeight + footerWeight > MAX_WEIGHT_PER_PAGE;

  if (needsDedicatedFooterPage) {
    pagesData.push([]); // Empty page just for the footer
  }

  const totalPages = pagesData.length;

  return (
    <>
      {pagesData.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <div key={pageIndex} className={`${styles.invoice} email-invoice pdf-page`} style={{ position: 'relative', minHeight: '11in' }}>
            {/* Header Section - Repeated on every page */}
            <div className={`${styles.header} email-header`}>
              <div className={`${styles.businessInfo} email-business-info`}>
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
              <div className={`${styles.logoSection} email-logo-section`}>
                <img
                  src="/LOGO.png"
                  alt="Ariana Oriental Rugs"
                  className={`${styles.logoImage} email-logo invoice-logo`}
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
            <div className={`${styles.documentTitle} email-document-title`}>
              <h2 style={{ textAlign: 'center', margin: '10px 0 5px 0', letterSpacing: 2 }}>
                {data.documentType === 'CONSIGNMENT' ? 'CONSIGNMENT OUT' :
                  (data.documentType === 'WASH' || data.mode === 'wash') ? 'WASH/REPAIR SERVICE' :
                    data.mode.startsWith('retail') ? 'RETAIL' :
                      data.mode.startsWith('wholesale') ? 'WHOLESALE' : 'INVOICE'}
              </h2>
              {totalPages > 1 && (
                <div style={{ textAlign: 'center', fontSize: '9pt', color: '#666', marginBottom: 15 }}>
                  Page {pageIndex + 1} of {totalPages}
                </div>
              )}
            </div>

            {/* Customer and Invoice Info Section - Repeated */}
            <div className={`${styles.infoSection} email-info-section`}>
              {/* Client Details */}
              <div className="email-client-details">
                <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Bill To:</p>
                {data.soldTo.companyName && (
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#000000', marginBottom: 2 }}>{data.soldTo.companyName}</p>
                )}
                <h3 style={{ fontSize: data.soldTo.companyName ? 13 : 15, fontWeight: data.soldTo.companyName ? 400 : 500, color: '#000000', marginBottom: 4 }}>
                  {data.soldTo.name}
                </h3>
                <p style={{ fontSize: 13, color: '#000000', whiteSpace: 'pre-line' }}>{data.soldTo.address}</p>
                <p style={{ fontSize: 13, color: '#000000' }}>
                  {data.soldTo.city}, {data.soldTo.state} {data.soldTo.zip}
                </p>
                <p style={{ fontSize: 13, color: '#000000' }}>{data.soldTo.phone}</p>
                {data.soldTo.email && <p style={{ fontSize: 13, color: '#000000' }}>{data.soldTo.email}</p>}
                {data.servedBy && (
                  <p style={{ fontSize: 12, color: '#444', marginTop: 4 }}><b>Served by:</b> {data.servedBy}</p>
                )}
              </div>
              <div className={`${styles.invoiceInfo} email-invoiceInfo`}>
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
                      <td className={styles.value} style={data.terms.toLowerCase().includes('paid') ? { color: '#059669', fontWeight: 'bold' } : {}}>{data.terms}</td>
                    </tr>
                    {data.pickupDate && (
                      <tr>
                        <td className={styles.label}>Pick up Date:</td>
                        <td className={styles.value} style={{ color: '#0284c7', fontWeight: 'bold' }}>{formatDateMMDDYYYY(data.pickupDate)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Items Table */}
            <div className={`${styles.itemsSection} email-items-section`}>
              <table className={`${styles.itemsTable} email-items-table`}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Description</th>
                    <th>Shape</th>
                    <th colSpan={2}>Width/Diameter</th>
                    <th colSpan={2}>Length</th>
                    <th>Sq.Ft</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                  <tr className={`${styles.subheader} email-subheader`}>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th className={styles.smallCol}>Ft</th>
                    <th className={styles.smallCol}>In</th>
                    <th className={styles.smallCol}>Ft</th>
                    <th className={styles.smallCol}>In</th>
                    <th></th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item.id} style={item.returned ? { color: '#dc2626', backgroundColor: '#fef2f2' } : item.sold ? { color: '#059669', backgroundColor: '#ecfdf5' } : {}}>
                      <td>{item.sku}</td>
                      <td className={styles.description}>
                        {item.returned && <span style={{ fontWeight: 'bold', marginRight: 4 }}>[RETURNED]</span>}
                        {item.sold && <span style={{ fontWeight: 'bold', marginRight: 4, color: '#059669' }}>[SOLD/PAID]</span>}
                        {item.description}
                        {(() => {
                          const images = item.images || (item.image ? [item.image] : []);
                          if (images.length === 0) return null;
                          return (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {images.map((img: string, idx: number) => (
                                <img key={idx} src={img} alt="" style={{ maxHeight: 60, maxWidth: 80, objectFit: 'contain', border: '1px solid #eee', borderRadius: 2 }} />
                              ))}
                            </div>
                          );
                        })()}
                        {item.serviceType && (item.serviceType.wash || item.serviceType.repair) && (
                          <div style={{ marginTop: 4, fontSize: '0.85em', color: '#0369a1', fontStyle: 'italic' }}>
                            Service: {[item.serviceType.wash && 'Wash', item.serviceType.repair && 'Repair'].filter(Boolean).join(' & ')}
                          </div>
                        )}
                        {/* Render all boolean conditions */}
                        {item.conditions && (
                          <div style={{ marginTop: 4, fontSize: '9pt', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: 6, lineHeight: 1.4 }}>
                            {[
                              { k: 'used', l: 'Used/Wear' }, { k: 'heavyWear', l: 'Heavy wear' }, { k: 'damagedEdges', l: 'Damaged edges' },
                              { k: 'frayedEnds', l: 'Frayed ends' }, { k: 'holes', l: 'Holes/tears' }, { k: 'thinAreas', l: 'Thin areas' },
                              { k: 'looseKnots', l: 'Loose knots' }, { k: 'fading', l: 'Fading' }, { k: 'bleeding', l: 'Bleeding risk' },
                              { k: 'stains', l: 'Stains' }, { k: 'petStains', l: 'Pet stains/odor' }, { k: 'waterDamage', l: 'Water damage' },
                              { k: 'mold', l: 'Mold' }, { k: 'insectDamage', l: 'Insect damage' }, { k: 'sunDamage', l: 'Sun damage' }
                            ].map(c => (item.conditions as any)?.[c.k] && (
                              <span key={c.k} style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, border: '1px solid #e2e8f0' }}>• {c.l}</span>
                            ))}
                            {item.conditions.other && <span style={{ fontWeight: 500, background: '#fff7ed', padding: '1px 4px' }}>Notes: {item.conditions.other}</span>}
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
                      <td className={styles.numeric}>
                        {item.pricingMethod === 'sqft'
                          ? (item.pricePerSqFt ? `${formatCurrency(item.pricePerSqFt)}/sf` : '-')
                          : (item.fixedPrice ? formatCurrency(item.fixedPrice) : '-')
                        }
                      </td>
                      <td className={styles.numeric}>{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows if needed for consistent height? No, user just wants 20 per page. */}
                </tbody>
              </table>
            </div>

            {/* Footer Section - ONLY ON LAST PAGE */}
            {isLastPage ? (
              <div className={`${styles.footer} email-footer`}>
                <div className={`${styles.notesSection} email-notes-section`}>
                  {data.notes && (
                    <>
                      <h4>Notes:</h4>
                      <p>{data.notes}</p>
                    </>
                  )}
                  <div className={`${styles.salesTerms} email-sales-terms`}>
                    <h4>Terms & Conditions:</h4>
                    {data.documentType === 'CONSIGNMENT' ? (
                      <p>All items remain property of Ariana Oriental Rugs until sold. Payment due upon sale or return. Items not sold within 90 days may be returned.</p>
                    ) : (
                      <>
                        <p>1. All Sales are final</p>
                        <p>2. No refunds. Exchanges only within one week of purchase.</p>
                      </>
                    )}
                  </div>
                </div>

                <div className={`${styles.totalsSection} email-totals-section`}>
                  <table className={`${styles.totalsTable} email-totals-table`}>
                    <tbody>
                      <tr>
                        <td className={styles.totalLabel}>Total Items:</td>
                        <td className={styles.totalValue}>{calculations.items.length}</td>
                      </tr>
                      {/* Hide Subtotal for Consignment, show for others */}
                      {data.documentType !== 'CONSIGNMENT' && (
                        <tr>
                          <td className={styles.totalLabel}>Subtotal:</td>
                          <td className={styles.totalValue}>{formatCurrency(calculations.subtotal)}</td>
                        </tr>
                      )}

                      {/* Discount Row - ALL MODES */}
                      {calculations.discount > 0 && (
                        <tr>
                          <td className={styles.totalLabel}>
                            Discount ({data.discountType === 'amount' ? formatCurrency(data.discountValue || 0) : `${data.discountValue || data.discountPercentage || 0}%`}):
                          </td>
                          <td className={styles.totalValue}>-{formatCurrency(calculations.discount)}</td>
                        </tr>
                      )}

                      {/* Sales Tax - Retail Only (Never for Wash) */}
                      {isRetail && data.mode !== 'wash' && (
                        <tr>
                          <td className={styles.totalLabel}>Sales Tax (6%):</td>
                          <td className={styles.totalValue}>{formatCurrency(calculations.salesTax)}</td>
                        </tr>
                      )}

                      {/* Additional Charges List */}
                      {data.additionalCharges && data.additionalCharges.length > 0 && data.additionalCharges.map(charge => (
                        <tr key={charge.id}>
                          <td className={styles.totalLabel}>{charge.description || 'Additional Charge'}:</td>
                          <td className={styles.totalValue}>{formatCurrency(charge.amount)}</td>
                        </tr>
                      ))}

                      {/* Retail Total Due */}
                      {data.documentType !== 'CONSIGNMENT' && (
                        <tr className={`${styles.totalDueRow} email-total-due-row`}>
                          <td className={styles.totalLabel}>TOTAL DUE:</td>
                          <td className={styles.totalValue}>{formatCurrency(calculations.totalDue)}</td>
                        </tr>
                      )}

                      {/* Consignment Inventory Tracking */}
                      {data.documentType === 'CONSIGNMENT' && (
                        <>
                          <tr className={`${styles.totalDueRow} email-total-due-row`}>
                            <td className={styles.totalLabel}>TOTAL CONSIGNMENT VALUE:</td>
                            <td className={styles.totalValue}>{formatCurrency(calculations.totalDue)}</td>
                          </tr>

                          {/* Always subtract Sold Items if any */}
                          {calculations.soldAmount > 0 && (
                            <tr style={{ color: '#059669' }}>
                              <td className={styles.totalLabel}>Less Sold Items:</td>
                              <td className={styles.totalValue}>-{formatCurrency(calculations.soldAmount)}</td>
                            </tr>
                          )}

                          {/* Always subtract Returned Items if any */}
                          {calculations.returnedAmount > 0 && (
                            <tr style={{ color: '#64748b' }}>
                              <td className={styles.totalLabel}>Less Returned Items:</td>
                              <td className={styles.totalValue}>-{formatCurrency(calculations.returnedAmount)}</td>
                            </tr>
                          )}

                          {/* Remaining Inventory = Total - Sold - Returned */}
                          <tr style={{ fontWeight: 'bold', borderTop: '1px solid #334155' }}>
                            <td className={styles.totalLabel}>REMAINING INVENTORY:</td>
                            <td className={styles.totalValue}>{formatCurrency(calculations.totalDue - calculations.returnedAmount - (calculations.totalPaid || 0))}</td>
                          </tr>

                          {calculations.soldAmount > 0 && (
                            <>
                              {/* Spacer for Settlement Section */}
                              <tr style={{ height: 10 }}><td colSpan={2}></td></tr>
                              <tr style={{ color: '#059669' }}>
                                <td className={styles.totalLabel} style={{ fontWeight: 600 }}>Amount Due (Sold Items):</td>
                                <td className={styles.totalValue} style={{ fontWeight: 600 }}>{formatCurrency(calculations.soldAmount)}</td>
                              </tr>
                            </>
                          )}
                        </>
                      )}

                      {/* Payments Display */}
                      {(calculations.downpayment || 0) > 0 && (
                        <tr>
                          <td className={styles.totalLabel}>Less Deposit/Holding:</td>
                          <td className={styles.totalValue}>-{formatCurrency(calculations.downpayment || 0)}</td>
                        </tr>
                      )}

                      {data.payments && data.payments.map((p, idx) => (
                        <tr key={`${p.id}-${idx}`}>
                          <td className={styles.totalLabel}>
                            Less Payment ({p.method}{p.reference ? ` #${p.reference}` : ''}):
                          </td>
                          <td className={styles.totalValue} style={{ color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            -{formatCurrency(p.amount)}
                            {onDeletePayment && (
                              <button
                                onClick={() => onDeletePayment(p.id)}
                                className="no-print"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  padding: '0 4px',
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  lineHeight: 1
                                }}
                                title="Delete payment"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Final Balance Due */}
                      {/* Show Balance Due if Retail OR if Consignment has activity */}
                      {(data.documentType !== 'CONSIGNMENT' || calculations.soldAmount > 0 || (calculations.totalPaid || 0) > 0) && (
                        <tr style={{
                          fontWeight: 'bold',
                          borderTop: '2px solid #334155',
                          fontSize: '14px',
                          color: calculations.balanceDue <= 0 ? '#059669' : '#dc2626'
                        }}>
                          <td className={styles.totalLabel}>
                            {calculations.balanceDue <= 0 ? 'INVOICE PAID:' : 'BALANCE DUE:'}
                          </td>
                          <td className={styles.totalValue}>{formatCurrency(calculations.balanceDue)}</td>
                        </tr>
                      )}
                      {data.documentType !== 'CONSIGNMENT' && calculations.returnedAmount > 0 && (
                        <>
                          <tr style={{ color: '#dc2626' }}>
                            <td className={styles.totalLabel}>Less Returns:</td>
                            <td className={styles.totalValue}>-{formatCurrency(calculations.returnedAmount)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>

                  {/* Signature Section - Only show one signature (Pickup replaces original) */}
                  {(data.pickupSignature || data.signature) && (
                    <div className={`${styles.signatureSection} email-signature-section`}>
                      <div className={styles.signatureBlock}>
                        <div className={styles.signatureLabel}>
                          {data.pickupSignature ? 'Pickup Signature:' : 'Customer Signature:'}
                        </div>
                        <div className={styles.signatureImage}>
                          <img
                            src={data.pickupSignature || data.signature}
                            alt="Signature"
                          />
                        </div>
                        <div className={styles.signatureDate}>
                          {data.pickupSignature ?
                            `Picked Up: ${formatDateMMDDYYYY(new Date().toISOString())}` :
                            `Date: ${formatDateMMDDYYYY(data.date)}`
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`${styles.footer} email-footer`} style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 10 }}>
                <p style={{ fontStyle: 'italic', fontSize: '9pt' }}>Continued on next page...</p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
