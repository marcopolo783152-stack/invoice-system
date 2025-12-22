

'use client';
import React, { useEffect, useState } from 'react';

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

  // Support both legacy and new returnedItems structure
  const customer = data?.soldTo?.name || data?.customer || '';
  const date = data?.date || data?.createdAt || '';
  const invoiceNumber = data?.invoiceNumber || data?.id || '';
  const items = Array.isArray(data?.returnedItems)
    ? data.returnedItems
    : Array.isArray(data?.items)
      ? data.items.filter((item: any) => item.returned)
      : [];
  const returnNote = data?.returnNote || '';
  const servedBy = data?.servedBy || '';
  const signature = data?.signature || '';

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 40 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Returned Receipt</h1>
      {data && !data._error ? (
        <div style={{ maxWidth: 600, margin: '0 auto', fontSize: 18 }}>
          <div><b>Customer:</b> {customer}</div>
          <div><b>Date:</b> {date}</div>
          <div><b>Invoice #:</b> {invoiceNumber}</div>
          <div><b>Returned Items:</b></div>
          <ul>
            {items.length > 0 ? items.map((item: any, idx: number) => (
              <li key={idx}>{item.description} ({item.sku})</li>
            )) : <li>No returned items found.</li>}
          </ul>
          {returnNote && <div><b>Return Note:</b> {returnNote}</div>}
          {servedBy && <div><b>Served by:</b> {servedBy}</div>}
          {signature && (
            <div style={{ marginTop: 24 }}>
              <b>Customer Signature:</b>
              <div><img src={signature} alt="Signature" style={{ maxWidth: 300, border: '1px solid #ccc', marginTop: 8 }} /></div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: 'red', textAlign: 'center' }}>
          No receipt data found.<br />
          {data?._raw && (
            <div style={{ marginTop: 16, fontSize: 12, color: '#333' }}>
              <b>Raw data param:</b>
              <div style={{ wordBreak: 'break-all' }}>{data._raw}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
