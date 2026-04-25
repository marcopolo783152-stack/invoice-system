/**
 * INVOICE FORM COMPONENT
 * 
 * Form for entering invoice data
 * Separated from template for clean architecture
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InvoiceData, InvoiceItem, InvoiceMode, RugShape, DocumentType, formatCurrency, calculateInvoice } from '@/lib/calculations';
import { generateInvoiceNumber, getCurrentCounter, setInvoiceCounter } from '@/lib/invoice-number';
import { getItemBySku, searchInventory, InventoryItem } from '@/lib/inventory-storage';
import { Customer, searchCustomers } from '@/lib/customer-storage';
import { getCustomerDebt } from '@/lib/invoice-storage';
import { logActivity } from '@/lib/audit-logger';
import * as XLSX from 'xlsx'; // Import SheetJS
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });

import SignaturePad from './SignaturePad';
import InventorySearch from './InventorySearch';
import AddressAutocomplete from './AddressAutocomplete';
import styles from './InvoiceForm.module.css';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceData) => void;
  initialData?: Partial<InvoiceData>;
  currentUser?: { username: string; fullName: string; role: string } | null;
  users?: { username: string; fullName: string; role: string }[];
}

// This form supports both creating and editing invoices. When editing, all fields (customer info, items, etc.) are pre-filled and can be updated.
export default function InvoiceForm({ onSubmit, initialData, currentUser, users }: InvoiceFormProps) {
  const [servedBy, setServedBy] = useState(initialData?.servedBy || (currentUser?.fullName || currentUser?.username || ''));

  useEffect(() => {
    if (!initialData?.servedBy && currentUser) {
      setServedBy(currentUser.fullName || currentUser.username);
    }
  }, [currentUser, initialData]);
  const [documentType, setDocumentType] = useState<DocumentType>(initialData?.documentType || 'INVOICE');
  const [mode, setMode] = useState<InvoiceMode>(
    initialData?.mode || 'retail'
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialData?.invoiceNumber || ''
  );
  const [showCounterManager, setShowCounterManager] = useState(false);
  const [counterValue, setCounterValue] = useState('');
  const [showInventorySearch, setShowInventorySearch] = useState(false);

  // Load or generate invoice number on mount
  useEffect(() => {
    if (!initialData?.invoiceNumber) {
      // Try to get saved invoice number from localStorage
      const savedNumber = localStorage.getItem('currentInvoiceNumber');
      if (savedNumber) {
        setInvoiceNumber(savedNumber);
      } else {
        generateInvoiceNumber().then(newNumber => {
          setInvoiceNumber(newNumber);
          localStorage.setItem('currentInvoiceNumber', newNumber);
        });
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

  // React to initialData changes (e.g. when loaded via editId or Quick Transaction param)
  useEffect(() => {
    if (initialData?.soldTo) {
      setSoldTo(prev => ({ ...prev, ...initialData.soldTo }));
    }
  }, [initialData]);

  // Customer Auto-complete logic
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debtStats, setDebtStats] = useState<{ totalDebt: number; overdueCount: number } | null>(null);

  const handleCustomerNameChange = async (value: string) => {
    setSoldTo(prev => ({ ...prev, name: value }));
    setDebtStats(null); // Clear debt warning when name changes
    if (value.length > 1) {
      const matches = await searchCustomers(value);
      setCustomerSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setSoldTo({
      name: customer.name,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
      phone: customer.phone,
      email: customer.email || '',
    });
    setShowSuggestions(false);

    // Check for debt
    const stats = await getCustomerDebt(customer.name);
    if (stats.totalDebt > 0) {
      setDebtStats(stats);
    } else {
      setDebtStats(null);
    }
  };
  const [items, setItems] = useState<InvoiceItem[]>(
    initialData?.items || [createEmptyItem()]
  );
  const [discountPercentage, setDiscountPercentage] = useState(
    initialData?.discountPercentage || 0
  );
  const [discountValue, setDiscountValue] = useState(
    initialData?.discountValue !== undefined ? initialData.discountValue : (initialData?.discountPercentage || 0)
  );
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>(
    initialData?.discountType || 'percentage'
  );
  const [downpayment, setDownpayment] = useState(
    initialData?.downpayment || 0
  );
  const [additionalCharges, setAdditionalCharges] = useState<{ id: string; amount: number; description: string }[]>(
    initialData?.additionalCharges || []
  );

  // Auto-switch to Wholesale for Consignment
  useEffect(() => {
    if (documentType === 'CONSIGNMENT') {
      // Only switch if not already a wholesale mode to preserve specific wholesale choices if any
      if (!mode.includes('wholesale')) {
        setMode('wholesale');
      }
    }
  }, [documentType]);

  const [notes, setNotes] = useState(initialData?.notes || '');
  const [signature, setSignature] = useState(initialData?.signature || '');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  // Wash/Repair specific (local state logic)
  const [pickupDate, setPickupDate] = useState(initialData?.pickupDate || '');
  const [status, setStatus] = useState<InvoiceData['status']>(initialData?.status || 'washing');
  const isWash = documentType === 'WASH';

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
      pricingMethod: 'piece',
      serviceType: { wash: false, repair: false }
    };
  }

  // SKU Suggestion Logic
  const [skuSuggestions, setSkuSuggestions] = useState<{ [itemId: string]: InventoryItem[] }>({});
  const [showSkuSuggestions, setShowSkuSuggestions] = useState<{ [itemId: string]: boolean }>({});


  // AUTOMATIC TERMS UPDATE BASED ON BALANCE
  useEffect(() => {
    // We only want to auto-update if terms is 'Paid' or 'Outstanding' (or empty)
    // to avoid overwriting specific user terms like 'Net 30' unless it's just a status change
    const isStandardStatus = !terms || terms === 'Paid' || terms === 'Outstanding' || terms === 'Due on Receipt';

    if (isStandardStatus) {
      const calc = calculateInvoice({
        items,
        mode: mode as InvoiceMode,
        documentType,
        invoiceNumber: '',
        date: '',
        terms: '',
        soldTo: { name: '', address: '', city: '', state: '', zip: '', phone: '' },
        discountPercentage,
        discountValue,
        discountType,
        additionalCharges,
        downpayment,
        payments: initialData?.payments || [] // Use existing payments from editing
      });

      const hasBalance = calc.balanceDue > 0.01; // Small threshold for floating point
      const newTerms = hasBalance ? 'Outstanding' : 'Paid';

      if (terms !== newTerms) {
        setTerms(newTerms);
      }
    }
  }, [items, mode, documentType, discountValue, discountType, additionalCharges, downpayment, initialData?.payments]);


  const handleSkuChange = async (itemId: string, value: string) => {
    handleItemChange(itemId, 'sku', value);

    if (value.length > 1) {
      const results = await searchInventory(value);
      setSkuSuggestions(prev => ({ ...prev, [itemId]: results }));
      setShowSkuSuggestions(prev => ({ ...prev, [itemId]: true }));
    } else {
      setShowSkuSuggestions(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const selectSkuFromSuggestion = (itemId: string, item: InventoryItem) => {
    setItems(prevItems => prevItems.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          sku: item.sku,
          description: item.description,
          shape: item.shape,
          widthFeet: item.widthFeet,
          widthInches: item.widthInches,
          lengthFeet: item.lengthFeet,
          lengthInches: item.lengthInches,
          fixedPrice: item.price,
          image: item.image,
          // Extended
          origin: item.origin,
          material: item.material,
          quality: item.quality,
          design: item.design,
          colorBg: item.colorBg,
          colorBorder: item.colorBorder,
          importCost: item.importCost,
          totalCost: item.totalCost,
          zone: item.zone
        };
      }
      return i;
    }));
    setShowSkuSuggestions(prev => ({ ...prev, [itemId]: false }));
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number | any
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );

    // Auto-fill logic when SKU changes
    if (field === 'sku' && typeof value === 'string' && value.length > 2) {
      // Debounce slightly or just fire async
      getItemBySku(value).then(found => {
        if (found) {
          setItems(currentItems =>
            currentItems.map(item => {
              if (item.id === id) {
                // If found, auto-fill details
                // Only overwrite if current fields are empty or user just typed SKU
                return {
                  ...item,
                  description: item.description || found.description,
                  shape: found.shape,
                  widthFeet: found.widthFeet,
                  widthInches: found.widthInches,
                  lengthFeet: found.lengthFeet,
                  lengthInches: found.lengthInches,
                  fixedPrice: item.fixedPrice || found.price, // Use inventory price as default fixed price
                  image: item.image || found.image
                };
              }
              return item;
            })
          );
        }
      });
    }
  };

  const handleMultiImageUpload = (id: string, files: FileList) => {
    if (!files || files.length === 0) return;

    const item = items.find(i => i.id === id);
    const existingImages = item?.images || (item?.image ? [item.image] : []);

    // Only allow up to 5 images total
    const slotsAvailable = 5 - existingImages.length;
    if (slotsAvailable <= 0) {
      alert('Maximum 5 images per item allowed.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, slotsAvailable);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600; // Optimized for 5-image total size
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Reduced quality for safety

          setItems(prev => prev.map(invItem => {
            if (invItem.id === id) {
              const currentImgs = invItem.images || (invItem.image ? [invItem.image] : []);
              if (currentImgs.length >= 5) return invItem;
              return { ...invItem, images: [...currentImgs, dataUrl], image: dataUrl }; // Keep legacy 'image' as first preview
            }
            return invItem;
          }));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (itemId: string, index: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newImages = (item.images || []).filter((_, i) => i !== index);
        return { ...item, images: newImages, image: newImages[0] || '' };
      }
      return item;
    }));
  };

  // Barcode Scanning
  const [scanningItemId, setScanningItemId] = useState<string | null>(null);

  const handleScanSuccess = (code: string) => {
    if (scanningItemId) {
      handleItemChange(scanningItemId, 'sku', code);
    }
    setScanningItemId(null);
  };

  const handleGenerateNewNumber = async () => {
    const newNumber = await generateInvoiceNumber();
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

  const handleInventorySelect = (item: any) => { // Type should be InventoryItem
    // Add item to invoice
    setItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      sku: item.sku,
      description: item.description,
      shape: item.shape,
      widthFeet: item.widthFeet,
      widthInches: item.widthInches,
      lengthFeet: item.lengthFeet,
      lengthInches: item.lengthInches,
      pricePerSqFt: 0,
      fixedPrice: item.price,
      pricingMethod: 'piece',
      // Extended fields
      origin: item.origin,
      material: item.material,
      quality: item.quality,
      design: item.design,
      colorBg: item.colorBg,
      colorBorder: item.colorBorder,
      importCost: item.importCost,
      totalCost: item.totalCost,
      zone: item.zone,
      image: item.image
    }]);
    setShowInventorySearch(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate signature is present
    if (!signature) {
      alert('Customer signature is required. Please add a signature before generating the invoice.');
      return;
    }

    const invoiceData: InvoiceData & { servedBy?: string } = {
      ...initialData, // Preserve existing fields like payments, returned, etc.
      documentType,
      invoiceNumber,
      date,
      terms,
      soldTo,
      items,
      mode,
      additionalCharges,
      notes,
      signature,
      discountType,
      discountValue,
      servedBy: servedBy || currentUser?.fullName || currentUser?.username || undefined,
      pickupDate: documentType === 'WASH' ? pickupDate : undefined,
      // Auto-calculate status if it's currently 'washing' or 'repairing' (initial states)
      // If it is already 'ready' or 'picked_up', keep it.
      status: documentType === 'WASH' ? (
        ['ready', 'picked_up'].includes(status || '') ? status :
          (items.some(i => i.serviceType?.wash) ? 'washing' : 'repairing')
      ) : undefined,
    };

    onSubmit(invoiceData);
    logActivity('Invoice Saved', `${documentType} #${invoiceNumber} for ${soldTo.name} has been processed.`);
  };

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
              setTerms('Consignment: All items remain property of Ariana Oriental Rugs until sold. Payment due upon sale or return. Items not sold within 90 days may be returned.');
            } else if (value === 'WASH') {
              setMode('wash');
              setTerms('Due on Receipt');
            } else {
              setTerms('Due on Receipt');
            }
          }}
          className={styles.select}
        >
          <option value="INVOICE">Invoice</option>
          <option value="CONSIGNMENT">Consignment</option>
          <option value="WASH">Wash/Repair</option>
        </select>
      </div>

      {/* Wash/Repair Specific Fields */}
      {documentType === 'WASH' && (
        <div style={{ marginBottom: 20, padding: 15, background: '#e0f2fe', borderRadius: 8, border: '1px solid #bae6fd' }}>
          <h3 style={{ marginTop: 0, color: '#0284c7' }}>Wash/Repair Tracking</h3>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Pick up Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
              />
            </div>
            {/* Status is automatically managed based on service type or pickup action */}
          </div>
        </div>
      )}

      <h2>{documentType === 'CONSIGNMENT' ? 'Consignment Out Details' : (documentType === 'WASH' ? 'Wash/Repair Ticket' : 'Invoice Details')}</h2>

      {/* Mode Selection */}
      <div className={styles.formGroup}>
        <label>Invoice Mode:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as InvoiceMode)}
          className={styles.select}
        >
          <option value="retail">Retail</option>
          <option value="wholesale">Wholesale</option>
          <option value="wash">Wash/Repair</option>
        </select>
      </div>

      {/* Invoice Info */}
      <div className={styles.topRow}>
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
      </div>

      {/* Payment Status & Terms */}
      <div className={styles.row}>
        <div className={styles.formGroup} style={{ flex: 2 }}>
          <label>Terms:</label>
          <input
            type="text"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className={styles.input}
            placeholder="e.g. Due on Receipt, Paid, Net 30"
          />
        </div>
      </div>

      {/* Sold To Section */}
      <h3>Customer Information</h3>
      {debtStats && debtStats.totalDebt > 0 && (
        <div style={{ padding: '15px', background: '#ffe4e6', border: '1px solid #fda4af', borderRadius: '8px', marginBottom: '20px', color: '#9f1239' }}>
          <h4 style={{ margin: '0 0 5px 0' }}>⚠️ Outstanding Balance</h4>
          <p style={{ margin: 0 }}>Customer has a total outstanding balance of <strong>{formatCurrency(debtStats.totalDebt)}</strong>.</p>
          {debtStats.overdueCount > 0 && (
            <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>There are {debtStats.overdueCount} overdue invoices (30+ days).</p>
          )}
        </div>
      )}
      <div className={styles.row}>
        <div className={styles.formGroup} style={{ position: 'relative' }}>
          <label>Name:*</label>
          <input
            type="text"
            value={soldTo.name}
            onChange={(e) => handleCustomerNameChange(e.target.value)}
            required
            className={styles.input}
            autoComplete="off"
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && customerSuggestions.length > 0 && (
            <div className={styles.suggestionsList}>
              {customerSuggestions.map((c) => (
                <div
                  key={c.id}
                  className={styles.suggestionItem}
                  onClick={() => selectCustomer(c)}
                >
                  <span className={styles.suggestionName}>{c.name}</span>
                  <span className={styles.suggestionDetail}>{c.city}, {c.state} • {c.phone}</span>
                </div>
              ))}
            </div>
          )}
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
              setSoldTo(prev => ({ ...prev, email: e.target.value }))
            }
            placeholder="customer@example.com"
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label>Company Name <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>:</label>
        <input
          type="text"
          value={soldTo.companyName || ''}
          onChange={(e) =>
            setSoldTo(prev => ({ ...prev, companyName: e.target.value }))
          }
          placeholder="Business Name"
          className={styles.input}
        />
      </div>
      <div className={styles.formGroup}>
        <label>Address:*</label>
        <AddressAutocomplete
          value={soldTo.address}
          onChange={(val) => setSoldTo(prev => ({ ...prev, address: val }))}
          onAddressSelect={(details) => {
            setSoldTo(prev => ({
              ...prev,
              address: details.street,
              city: details.city,
              state: details.state,
              zip: details.zip
            }));
          }}
          required
          className={styles.input}
          placeholder="Enter Street Address"
        />
      </div>
      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label>City:</label>
          <input
            type="text"
            value={soldTo.city}
            onChange={(e) =>
              setSoldTo(prev => ({ ...prev, city: e.target.value }))
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
              setSoldTo(prev => ({ ...prev, state: e.target.value }))
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
              setSoldTo(prev => ({ ...prev, zip: e.target.value }))
            }
            className={styles.input}
          />
        </div>
      </div>

      {/* Items Section */}
      <h3>Items</h3>
      <div className={styles.itemsContainer}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => {
              // Download Template
              const templateData = [
                {
                  SKU: 'Example-1',
                  Description: 'Persian Rug',
                  Shape: 'Rectangle',
                  Width_Ft: 5,
                  Width_In: 0,
                  Length_Ft: 7,
                  Length_In: 0,
                  Fixed_Price: 1500,
                  Price_Per_SqFt: 0
                },
                {
                  SKU: 'Example-2',
                  Description: 'Round Rug',
                  Shape: 'Round',
                  Width_Ft: 6,
                  Width_In: 6,
                  Length_Ft: 0,
                  Length_In: 0,
                  Fixed_Price: 2000,
                  Price_Per_SqFt: 0
                }
              ];
              const ws = XLSX.utils.json_to_sheet(templateData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Template");
              XLSX.writeFile(wb, "invoice_import_template.xlsx");
            }}
            style={{ padding: '6px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >
            📥 Download Excel Template
          </button>

          <button
            type="button"
            onClick={() => setShowInventorySearch(true)}
            style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🔎 Search Inventory
          </button>

          <label style={{ padding: '6px 12px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'inline-block' }}>
            📤 Import from Excel
            <input
              type="file"
              accept=".xlsx, .xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                  try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws);

                    const newItems: InvoiceItem[] = data.map((row: any) => ({
                      id: Math.random().toString(36).substr(2, 9),
                      sku: row['SKU']?.toString() || '',
                      description: row['Description']?.toString() || '',
                      shape: (row['Shape']?.toString().toLowerCase().includes('round') ? 'round' : 'rectangle') as RugShape,
                      widthFeet: Number(row['Width_Ft']) || 0,
                      widthInches: Number(row['Width_In']) || 0,
                      lengthFeet: Number(row['Length_Ft']) || 0,
                      lengthInches: Number(row['Length_In']) || 0,
                      pricePerSqFt: Number(row['Price_Per_SqFt']) || 0,
                      fixedPrice: Number(row['Fixed_Price']) || Number(row['Price']) || 0,
                      returned: false
                    }));

                    if (newItems.length > 0) {
                      if (confirm(`Found ${newItems.length} items. Append to current list? (Cancel to clear list and replace)`)) {
                        setItems(prev => [...prev, ...newItems]);
                      } else {
                        setItems(newItems);
                      }
                    } else {
                      alert('No items found in file.');
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Error parsing file. Please use the template.');
                  }
                  e.target.value = ''; // Reset input
                };
                reader.readAsBinaryString(file);
              }}
            />
          </label>
        </div>
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
              <div className={styles.formGroup} style={{ position: 'relative' }}>
                <label>SKU:*</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={item.sku}
                    onChange={(e) => handleSkuChange(item.id, e.target.value)}
                    onBlur={() => setTimeout(() => setShowSkuSuggestions(prev => ({ ...prev, [item.id]: false })), 200)}
                    required
                    className={styles.input}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setScanningItemId(item.id)}
                    style={{ padding: '0 12px', background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '8px', cursor: 'pointer', fontSize: '20px' }}
                    title="Scan Barcode"
                  >
                    📷
                  </button>
                </div>
                {showSkuSuggestions[item.id] && skuSuggestions[item.id]?.length > 0 && (
                  <div className={styles.suggestionsList} style={{ top: '100%', left: 0, width: '100%', maxHeight: '200px', overflowY: 'auto' }}>
                    {skuSuggestions[item.id].map(suggestion => (
                      <div
                        key={suggestion.id}
                        className={styles.suggestionItem}
                        onClick={() => selectSkuFromSuggestion(item.id, suggestion)}
                      >
                        <span style={{ fontWeight: 700 }}>{suggestion.sku}</span>
                        <span style={{ fontSize: 12, marginLeft: 8, color: '#64748b' }}>
                          {suggestion.widthFeet}'{suggestion.widthInches}x{suggestion.lengthFeet}'{suggestion.lengthInches} - {suggestion.design}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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

            {/* Image Gallery for Item */}
            <div className={styles.formGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#4f46e5', marginTop: 8 }}>
                <span>📷 Add Pictures (Max 5)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => handleMultiImageUpload(item.id, e.target.files!)}
                  style={{ display: 'none' }}
                />
              </label>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {(item.images || (item.image ? [item.image] : [])).map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={img}
                      alt={`Rug ${idx + 1}`}
                      style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                      title="Click to view full size"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(item.id, idx)}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: 18,
                        height: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white',
                        cursor: 'pointer',
                        fontSize: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      title="Remove image"
                    >
                      ✕
                    </button>
                    <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 8, padding: '1px 3px', borderRadius: 2 }}>
                      {idx + 1}
                    </div>
                  </div>
                ))}
                {(!item.images || item.images.length < 5) && !item.image && (
                  <div style={{ height: 60, width: 60, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 20 }}>
                    🖼️
                  </div>
                )}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>{item.shape === 'round' ? 'Diameter (Feet):' : 'Width (Feet):'}*</label>
                <input
                  type="number"
                  value={item.widthFeet || ''}
                  onChange={(e) =>
                    handleItemChange(item.id, 'widthFeet', Number(e.target.value))
                  }
                  onFocus={(e) => e.target.select()}
                  min="0"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{item.shape === 'round' ? 'Diameter (Inches):' : 'Width (Inches):'}*</label>
                <input
                  type="number"
                  value={item.widthInches || ''}
                  onChange={(e) =>
                    handleItemChange(item.id, 'widthInches', Number(e.target.value))
                  }
                  onFocus={(e) => e.target.select()}
                  min="0"
                  max="11"
                  className={styles.input}
                />
              </div>
              {item.shape === 'rectangle' && (
                <>
                  <div className={styles.formGroup}>
                    <label>Length (Feet):*</label>
                    <input
                      type="number"
                      value={item.lengthFeet || ''}
                      onChange={(e) =>
                        handleItemChange(item.id, 'lengthFeet', Number(e.target.value))
                      }
                      onFocus={(e) => e.target.select()}
                      min="0"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Length (Inches):*</label>
                    <input
                      type="number"
                      value={item.lengthInches || ''}
                      onChange={(e) =>
                        handleItemChange(item.id, 'lengthInches', Number(e.target.value))
                      }
                      onFocus={(e) => e.target.select()}
                      min="0"
                      max="11"
                      className={styles.input}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Wash/Repair Service Selection */}
            {documentType === 'WASH' && (
              <div style={{ margin: '10px 0', padding: '10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Service Type:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={item.serviceType?.wash || false}
                      onChange={(e) => handleItemChange(item.id, 'serviceType', { ...item.serviceType, wash: e.target.checked })}
                    />
                    Wash
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={item.serviceType?.repair || false}
                      onChange={(e) => handleItemChange(item.id, 'serviceType', { ...item.serviceType, repair: e.target.checked })}
                    />
                    Repair
                  </label>
                </div>

                <div style={{ marginTop: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#475569', display: 'block', marginBottom: 8 }}>Conditions:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                    {[
                      { key: 'used', label: 'Used / General wear' },
                      { key: 'heavyWear', label: 'Heavy wear' },
                      { key: 'damagedEdges', label: 'Damaged edges' },
                      { key: 'frayedEnds', label: 'Frayed ends / fringe damage' },
                      { key: 'holes', label: 'Holes or tears' },
                      { key: 'thinAreas', label: 'Thin or worn areas' },
                      { key: 'looseKnots', label: 'Loose knots / weaving' },
                      { key: 'fading', label: 'Color fading' },
                      { key: 'bleeding', label: 'Color bleeding risk' },
                      { key: 'stains', label: 'Stains (type unknown)' },
                      { key: 'petStains', label: 'Pet stains / odor' },
                      { key: 'waterDamage', label: 'Water damage' },
                      { key: 'mold', label: 'Mold / mildew' },
                      { key: 'insectDamage', label: 'Insect damage' },
                      { key: 'sunDamage', label: 'Sun damage' }
                    ].map((cond: any) => (
                      <label key={cond.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#334155' }}>
                        <input
                          type="checkbox"
                          checked={(item.conditions as any)?.[cond.key] || false}
                          onChange={(e) => handleItemChange(item.id, 'conditions', { ...item.conditions, [cond.key]: e.target.checked })}
                        />
                        {cond.label}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Other condition notes..."
                      value={item.conditions?.other || ''}
                      onChange={(e) => handleItemChange(item.id, 'conditions', { ...item.conditions, other: e.target.value })}
                      style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 4, width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className={styles.row}>
              <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Price per Piece:</label>
                  <input
                    type="number"
                    value={item.fixedPrice || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleItemChange(item.id, 'fixedPrice', val);
                      if (e.target.value !== '') {
                        handleItemChange(item.id, 'pricingMethod', 'piece');
                        handleItemChange(item.id, 'pricePerSqFt', 0);
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.01"
                    className={styles.input}
                    placeholder="0.00"
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Price per Sq.Ft:</label>
                  <input
                    type="number"
                    value={item.pricePerSqFt || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleItemChange(item.id, 'pricePerSqFt', val);
                      if (e.target.value !== '') {
                        handleItemChange(item.id, 'pricingMethod', 'sqft');
                        handleItemChange(item.id, 'fixedPrice', 0);
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.01"
                    className={styles.input}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={handleAddItem} className={styles.addBtn}>
          + Add Item
        </button>

        {/* Static Summary Block */}
        <div style={{ marginTop: 24, padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, color: '#334155' }}>Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 24px', color: '#64748b', textAlign: 'right' }}>Subtotal:</td>
                  <td style={{ padding: '8px 0', color: '#1e293b', fontWeight: 600, textAlign: 'right', minWidth: 100 }}>
                    {(() => {
                      const calc = calculateInvoice({ items, mode: mode as InvoiceMode, documentType, invoiceNumber: '', date: '', terms: '', soldTo: { name: '', address: '', city: '', state: '', zip: '', phone: '' } });
                      return formatCurrency(calc.subtotal);
                    })()}
                  </td>
                </tr>

                {documentType === 'CONSIGNMENT' && (
                  <tr>
                    <td style={{ padding: '8px 24px', color: '#64748b', textAlign: 'right' }}>Downpayment:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', minWidth: 100 }}>
                      <input
                        type="number"
                        value={downpayment}
                        onChange={(e) => setDownpayment(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        min="0"
                        step="0.01"
                        style={{ width: '100%', textAlign: 'right', padding: '4px', borderRadius: 4, border: '1px solid #cbd5e1', fontWeight: 600, color: '#0f172a' }}
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                )}

                {discountValue > 0 && (
                  <tr>
                    <td style={{ padding: '8px 24px', color: '#64748b', textAlign: 'right' }}>
                      Discount ({discountType === 'percentage' ? `${discountValue}%` : formatCurrency(discountValue)}):
                    </td>
                    <td style={{ padding: '8px 0', color: '#dc2626', fontWeight: 600, textAlign: 'right', minWidth: 100 }}>
                      {(() => {
                        const calc = calculateInvoice({ items, mode: mode as InvoiceMode, documentType, invoiceNumber: '', date: '', terms: '', soldTo: { name: '', address: '', city: '', state: '', zip: '', phone: '' }, discountValue, discountType });
                        return `-${formatCurrency(calc.discount)}`;
                      })()}
                    </td>
                  </tr>
                )}

                {additionalCharges.map(charge => (
                  <tr key={charge.id}>
                    <td style={{ padding: '8px 24px', color: '#64748b', textAlign: 'right' }}>{charge.description}:</td>
                    <td style={{ padding: '8px 0', color: '#0f172a', fontWeight: 600, textAlign: 'right', minWidth: 100 }}>
                      +{formatCurrency(charge.amount)}
                    </td>
                  </tr>
                ))}

                <tr>
                  <td style={{ padding: '8px 24px', color: '#64748b', textAlign: 'right', fontSize: 18, fontWeight: 700 }}>
                    {documentType === 'CONSIGNMENT' ? 'Total Consignment Value:' : 'Total Due:'}
                  </td>
                  <td style={{ padding: '8px 0', color: '#0f172a', fontWeight: 800, textAlign: 'right', fontSize: 18 }}>
                    {(() => {
                      const calc = calculateInvoice({ items, mode: mode as InvoiceMode, documentType, invoiceNumber: '', date: '', terms: '', soldTo: { name: '', address: '', city: '', state: '', zip: '', phone: '' }, discountValue, discountType, additionalCharges });
                      return formatCurrency(calc.totalDue);
                    })()}
                  </td>
                </tr>

                {documentType === 'CONSIGNMENT' && (
                  <tr>
                    <td style={{ padding: '8px 24px', color: '#64748b', textAlign: 'right', fontSize: 18, fontWeight: 700 }}>Balance Due:</td>
                    <td style={{ padding: '8px 0', color: '#dc2626', fontWeight: 800, textAlign: 'right', fontSize: 18 }}>
                      {(() => {
                        const calc = calculateInvoice({ items, mode: mode as InvoiceMode, documentType, invoiceNumber: '', date: '', terms: '', soldTo: { name: '', address: '', city: '', state: '', zip: '', phone: '' }, discountValue, discountType, downpayment, additionalCharges });
                        return formatCurrency(calc.balanceDue || 0);
                      })()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div >

      <div className={styles.formGroup}>
        <label>Discount:</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'amount')}
            className={styles.select}
            style={{ width: 'auto', minWidth: 120 }}
          >
            <option value="percentage">Percentage (%)</option>
            <option value="amount">Fixed Amount ($)</option>
          </select>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => {
              const val = Number(e.target.value);
              setDiscountValue(val);
              setDiscountPercentage(discountType === 'percentage' ? val : 0);
            }}
            onFocus={(e) => e.target.select()}
            min="0"
            max={discountType === 'percentage' ? 100 : undefined}
            step="0.01"
            className={styles.input}
            placeholder={discountType === 'percentage' ? '0%' : '$0.00'}
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Additional Charges:</label>
        {additionalCharges.map((charge, index) => (
          <div key={charge.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Description"
              value={charge.description}
              onChange={(e) => {
                const newCharges = [...additionalCharges];
                newCharges[index].description = e.target.value;
                setAdditionalCharges(newCharges);
              }}
              style={{ flex: 2 }}
              className={styles.input}
            />
            <input
              type="number"
              placeholder="Amount"
              value={charge.amount}
              onChange={(e) => {
                const newCharges = [...additionalCharges];
                newCharges[index].amount = Number(e.target.value);
                setAdditionalCharges(newCharges);
              }}
              style={{ flex: 1 }}
              className={styles.input}
              step="0.01"
            />
            <button
              type="button"
              onClick={() => {
                const newCharges = additionalCharges.filter((_, i) => i !== index);
                setAdditionalCharges(newCharges);
              }}
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, padding: '0 8px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAdditionalCharges([...additionalCharges, { id: Math.random().toString(36).substr(2, 9), description: '', amount: 0 }])}
          style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: 4, padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
        >
          + Add Charge
        </button>
      </div>

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
          {!showSignaturePad && !signature && (
            <button
              type="button"
              onClick={() => setShowSignaturePad(true)}
              className={styles.addSignatureBtn}
            >
              ✍️ Add Customer Signature
            </button>
          )}

          {!showSignaturePad && signature && (
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
          )}

          {showSignaturePad && (
            <SignaturePad
              onSave={(signatureData) => {
                setSignature(signatureData);
                setShowSignaturePad(false);
              }}
              onCancel={() => setShowSignaturePad(false)}
              existingSignature={signature}
              variant="inline"
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 32 }}>

        <button type="submit" className={styles.submitBtn}>
          Generate Invoice
        </button>
      </div>


      {/* Signature Pad Modal */}
      {/* Signature Pad Modal - REMOVED (Now Inline) */}

      {/* Barcode Scanner Modal */}
      {
        scanningItemId && (
          <BarcodeScanner
            onScan={handleScanSuccess}
            onClose={() => setScanningItemId(null)}
          />
        )
      }
    </form >
  );
}
