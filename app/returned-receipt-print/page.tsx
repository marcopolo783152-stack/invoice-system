

'use client';
import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Get all 'data' params and use the last one
      const allDataParams = params.getAll('data');
      const dataParam = allDataParams.length > 0 ? allDataParams[allDataParams.length - 1] : null;
      setData(parseData(dataParam));
      // Automatically trigger print dialog after rendering
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, []);

  // Use the professional ReturnedReceipt component for printing
  if (!data) {
    return <div style={{ color: 'red', textAlign: 'center' }}>No receipt data found.</div>;
  }
  // Wrap data in the expected structure for ReturnedReceipt
  const receiptData = data.returnedItems ? { data, returnedItems: data.returnedItems, returnNote: data.returnNote } : { data, returnedItems: data.items?.filter((item: any) => item.returned) || [], returnNote: data.returnNote };
  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 40 }}>
      <ReturnedReceipt receiptData={receiptData} />
    </div>
  );
}
