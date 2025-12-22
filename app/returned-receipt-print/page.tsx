

'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ReturnedReceipt } from '@/components/InvoiceSearch';

function parseData(dataParam: string | null) {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(dataParam));
  } catch {
    try {
      // Try double decode (sometimes data is encoded twice)
      return JSON.parse(decodeURIComponent(decodeURIComponent(dataParam)));
    } catch {
      return { _raw: dataParam, _error: 'Failed to parse receipt data.' };
    }
  }
}

export default function ReturnedReceiptPrintPage() {
  const [data, setData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Get all 'data' params and use the last one
      const allDataParams = params.getAll('data');
      const dataParam = allDataParams.length > 0 ? allDataParams[allDataParams.length - 1] : null;
      setData(parseData(dataParam));
    }
  }, []);

  // Print using iframe for better reliability
  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'fixed';
    printWindow.style.right = '0';
    printWindow.style.bottom = '0';
    printWindow.style.width = '0';
    printWindow.style.height = '0';
    printWindow.style.border = 'none';
    document.body.appendChild(printWindow);
    const doc = printWindow.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write('<html><head><title>Print Receipt</title>');
      // Optionally add styles here
      doc.write('<style>body{background:#fff;color:#222;font-family:Arial,sans-serif;}@media print{body{margin:0;}}</style>');
      doc.write('</head><body>');
      doc.write(printContents);
      doc.write('</body></html>');
      doc.close();
      printWindow.contentWindow?.focus();
      setTimeout(() => {
        printWindow.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printWindow), 1000);
      }, 300);
    }
  };

  // Use the professional ReturnedReceipt component for printing
  if (!data) {
    return <div style={{ color: 'red', textAlign: 'center' }}>No receipt data found.</div>;
  }
  // Accept both flat and nested data
  let receiptData;
  if (data.soldTo && data.returnedItems) {
    // Flat structure (from print button)
    receiptData = { data, returnedItems: data.returnedItems, returnNote: data.returnNote };
  } else if (data.data && data.returnedItems) {
    // Nested structure (from modal)
    receiptData = { data: data.data, returnedItems: data.returnedItems, returnNote: data.returnNote };
  } else {
    // Fallback: try to use as-is
    receiptData = data;
  }
  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 40 }}>
      <div ref={printRef}>
        <ReturnedReceipt receiptData={receiptData} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button onClick={handlePrint} style={{ fontSize: 18, padding: '10px 32px', background: '#764ba2', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Print Receipt
        </button>
      </div>
    </div>
  );
}
