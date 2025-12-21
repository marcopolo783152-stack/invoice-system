/**
 * INVOICE FORM COMPONENT
 * 
 * Form for entering invoice data
 * Separated from template for clean architecture
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InvoiceData, InvoiceItem, InvoiceMode, RugShape, DocumentType } from '@/lib/calculations';
import { generateInvoiceNumber, getCurrentCounter, setInvoiceCounter } from '@/lib/invoice-number';
import SignaturePad from './SignaturePad';
import styles from './InvoiceForm.module.css';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceData) => void;
  initialData?: Partial<InvoiceData>;
  currentUser?: { username: string; role: string } | null;
}

// This form supports both creating and editing invoices. When editing, all fields (customer info, items, etc.) are pre-filled and can be updated.
export default function InvoiceForm({ onSubmit, initialData, currentUser }: InvoiceFormProps) {
  const [documentType, setDocumentType] = useState<DocumentType>(initialData?.documentType || 'INVOICE');
  const [mode, setMode] = useState<InvoiceMode>(
    initialData?.mode || 'retail-per-rug'
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialData?.invoiceNumber || ''
  );
  const [showCounterManager, setShowCounterManager] = useState(false);
  const [counterValue, setCounterValue] = useState('');

  // Load or generate invoice number on mount
  useEffect(() => {
    if (!initialData?.invoiceNumber) {
      // Try to get saved invoice number from localStorage
      const savedNumber = localStorage.getItem('currentInvoiceNumber');
      if (savedNumber) {
        setInvoiceNumber(savedNumber);
      } else {
        const newNumber = generateInvoiceNumber();
        setInvoiceNumber(newNumber);
        localStorage.setItem('currentInvoiceNumber', newNumber);
      }
    }
  }, [initialData]);
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [terms, setTerms] = useState(initialData?.terms || 'Due on Receipt');
  const [soldTo, setSoldTo] = useState(
    initialData?.soldTo || {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
    }
  );
  const [items, setItems] = useState<InvoiceItem[]>(
    initialData?.items || [createEmptyItem()]
  );
  const [discountPercentage, setDiscountPercentage] = useState(
    initialData?.discountPercentage || 0
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [signature, setSignature] = useState(initialData?.signature || '');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  function createEmptyItem(): InvoiceItem {
    return {
      id: Math.random().toString(36).substr(2, 9),
      sku: '',
      description: '',
      shape: 'rectangle',
      widthFeet: 0,
      widthInches: 0,
      lengthFeet: 0,
      lengthInches: 0,
      pricePerSqFt: 0,
      fixedPrice: 0,
    };
  }

  const handleAddItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleGenerateNewNumber = () => {
    const newNumber = generateInvoiceNumber();
    setInvoiceNumber(newNumber);
    localStorage.setItem('currentInvoiceNumber', newNumber);
  };

  const handleSetCounter = () => {
    const num = parseInt(counterValue, 10);
    if (!isNaN(num) && num >= 0) {
      setInvoiceCounter(num);
      setCounterValue('');
      setShowCounterManager(false);
      alert(`Counter set to ${num}. Next invoice will be MP${(num + 1).toString().padStart(8, '0')}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate signature is present
    if (!signature) {
      alert('Customer signature is required. Please add a signature before generating the invoice.');
      return;
    }

    const invoiceData: InvoiceData & { servedBy?: string } = {
      documentType,
      invoiceNumber,
      date,
      terms,
      soldTo,
      items,
      mode,
      discountPercentage: mode.startsWith('retail') ? discountPercentage : undefined,
      notes,
      signature,
      servedBy: currentUser?.username || undefined,
    };

    onSubmit(invoiceData);
  };

  const isPerSqFt = mode.includes('per-sqft');
  const isRetail = mode.startsWith('retail');

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label>Document Type:</label>
        <select
          value={documentType}
          onChange={e => {
            const value = e.target.value as DocumentType;
            setDocumentType(value);
            // Autofill consignment terms if selected
            if (value === 'CONSIGNMENT') {
              setTerms('Consignment: All items remain property of Marco Polo Oriental Rugs until sold. Payment due upon sale or return. Items not sold within 90 days may be returned.');
            } else {
              setTerms('Due on Receipt');
            }
          }}
          className={styles.select}
        >
          <option value="INVOICE">Invoice</option>
          <option value="CONSIGNMENT">Consignment</option>
        </select>
      </div>
      <h2>{documentType === 'CONSIGNMENT' ? 'Consignment Out Details' : 'Invoice Details'}</h2>

      {/* Mode Selection */}
      <div className={styles.formGroup}>
        <label>Invoice Mode:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as InvoiceMode)}
          className={styles.select}
        >
          <option value="retail-per-rug">Retail - Per Rug</option>
          <option value="wholesale-per-rug">Wholesale - Per Rug</option>
          <option value="retail-per-sqft">Retail - Per Sq.Ft</option>
          <option value="wholesale-per-sqft">Wholesale - Per Sq.Ft</option>
        </select>
      </div>

      {/* Invoice Info */}
      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label>Invoice Number:*</label>
          <div className={styles.invoiceNumberGroup}>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
              className={styles.input}
              placeholder="MP00000001"
            />
            <button
              type="button"
              onClick={handleGenerateNewNumber}
              className={styles.generateBtn}
              title="Generate new invoice number"
            >
              🔄
            </button>
            <button
              type="button"
              onClick={() => setShowCounterManager(!showCounterManager)}
              className={styles.settingsBtn}
              title="Manage counter"
            >
              ⚙️
            </button>
          </div>
          {showCounterManager && (
            <div className={styles.counterManager}>
              <p>Current counter: {getCurrentCounter()}</p>
              <div className={styles.counterControls}>
                <input
                  type="number"
                  value={counterValue}
                  onChange={(e) => setCounterValue(e.target.value)}
                  placeholder="Set counter value"
                  className={styles.input}
                  min="0"
                />
                <button
                  type="button"
                  onClick={handleSetCounter}
                  className={styles.setCounterBtn}
                >
                  Set Counter
                </button>
              </div>
              <small>Next invoice will be: MP{(getCurrentCounter() + 1).toString().padStart(8, '0')}</small>
            </div>
          )}
        </div>
        <div className={styles.formGroup}>
          <label>Date:*</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Terms:</label>
          <input
            type="text"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      {/* Sold To Section */}
      <h3>Customer Information</h3>
      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label>Name:*</label>
          <input
            type="text"
            value={soldTo.name}
            onChange={(e) =>
              setSoldTo({ ...soldTo, name: e.target.value })
            }
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Phone:*</label>
          <input
            type="tel"
            value={soldTo.phone}
            onChange={(e) =>
              setSoldTo({ ...soldTo, phone: e.target.value })
            }
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Email:</label>
          <input
            type="email"
            value={soldTo.email || ''}
            onChange={(e) =>
              setSoldTo({ ...soldTo, email: e.target.value })
            }
            placeholder="customer@example.com"
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label>Address:*</label>
        <input
          type="text"
          value={soldTo.address}
          onChange={(e) =>
            setSoldTo({ ...soldTo, address: e.target.value })
          }
          required
          className={styles.input}
        />
      </div>
      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label>City:</label>
          <input
            type="text"
            value={soldTo.city}
            onChange={(e) =>
              setSoldTo({ ...soldTo, city: e.target.value })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label>State:</label>
          <input
            type="text"
            value={soldTo.state}
            onChange={(e) =>
              setSoldTo({ ...soldTo, state: e.target.value })
            }
            maxLength={2}
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label>ZIP:</label>
          <input
            type="text"
            value={soldTo.zip}
            onChange={(e) =>
              setSoldTo({ ...soldTo, zip: e.target.value })
            }
            className={styles.input}
          />
        </div>
      </div>

      {/* Items Section */}
      <h3>Items</h3>
      <div className={styles.itemsContainer}>
        {items.map((item, index) => (
          <div key={item.id} className={styles.itemRow}>
            <div className={styles.itemHeader}>
              <span>Item {index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className={styles.removeBtn}
                >
                  Remove
                </button>
              )}
            </div>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>SKU:*</label>
                <input
                  type="text"
                  value={item.sku}
                  onChange={(e) =>
                    handleItemChange(item.id, 'sku', e.target.value)
                  }
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 2 }}>
                <label>Description:*</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(item.id, 'description', e.target.value)
                  }
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Shape:*</label>
                <select
                  value={item.shape}
                  onChange={(e) =>
                    handleItemChange(item.id, 'shape', e.target.value as RugShape)
                  }
                  className={styles.select}
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="round">Round</option>
                </select>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>{item.shape === 'round' ? 'Diameter (Feet):' : 'Width (Feet):'}*</label>
                <input
                  type="number"
                  value={item.widthFeet}
                  onChange={(e) =>
                    handleItemChange(item.id, 'widthFeet', Number(e.target.value))
                  }
                  onFocus={(e) => e.target.select()}
                  min="0"
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{item.shape === 'round' ? 'Diameter (Inches):' : 'Width (Inches):'}*</label>
                <input
                  type="number"
                  value={item.widthInches}
                  onChange={(e) =>
                    handleItemChange(item.id, 'widthInches', Number(e.target.value))
                  }
                  onFocus={(e) => e.target.select()}
                  min="0"
                  max="11"
                  required
                  className={styles.input}
                />
              </div>
              {item.shape === 'rectangle' && (
                <>
                  <div className={styles.formGroup}>
                    <label>Length (Feet):*</label>
                    <input
                      type="number"
                      value={item.lengthFeet}
                      onChange={(e) =>
                        handleItemChange(item.id, 'lengthFeet', Number(e.target.value))
                      }
                      onFocus={(e) => e.target.select()}
                      min="0"
                      required
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Length (Inches):*</label>
                    <input
                      type="number"
                      value={item.lengthInches}
                      onChange={(e) =>
                        handleItemChange(item.id, 'lengthInches', Number(e.target.value))
                      }
                      onFocus={(e) => e.target.select()}
                      min="0"
                      max="11"
                      required
                      className={styles.input}
                    />
                  </div>
                </>
              )}
            </div>
            <div className={styles.row}>
              {isPerSqFt ? (
                <div className={styles.formGroup}>
                  <label>Price per Sq.Ft:*</label>
                  <input
                    type="number"
                    value={item.pricePerSqFt}
                    onChange={(e) =>
                      handleItemChange(item.id, 'pricePerSqFt', Number(e.target.value))
                    }
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.01"
                    required
                    className={styles.input}
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label>Fixed Price:*</label>
                  <input
                    type="number"
                    value={item.fixedPrice}
                    onChange={(e) =>
                      handleItemChange(item.id, 'fixedPrice', Number(e.target.value))
                    }
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.01"
                    required
                    className={styles.input}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={handleAddItem} className={styles.addBtn}>
        + Add Item
      </button>

      {/* Additional Options */}
      {isRetail && (
        <div className={styles.formGroup}>
          <label>Discount (%):</label>
          <input
            type="number"
            value={discountPercentage}
            onChange={(e) => setDiscountPercentage(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            min="0"
            max="100"
            step="0.01"
            className={styles.input}
          />
        </div>
      )}

      <div className={styles.formGroup}>
        <label>Notes:</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={styles.textarea}
        />
      </div>

      {/* Customer Signature */}
      <div className={styles.formGroup}>
        <label>Customer Signature:*</label>
        <div className={styles.signatureSection}>
          {signature ? (
            <div className={styles.signaturePreview}>
              <img src={signature} alt="Customer signature" />
              <button
                type="button"
                onClick={() => setShowSignaturePad(true)}
                className={styles.changeSignatureBtn}
              >
                ✏️ Change Signature
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignaturePad(true)}
              className={styles.addSignatureBtn}
            >
              ✍️ Add Customer Signature
            </button>
          )}
        </div>
      </div>

      <button type="submit" className={styles.submitBtn}>
        Generate Invoice
      </button>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          onSave={(signatureData) => {
            setSignature(signatureData);
            setShowSignaturePad(false);
          }}
          onCancel={() => setShowSignaturePad(false)}
          existingSignature={signature}
        />
      )}
    </form>
  );
}
