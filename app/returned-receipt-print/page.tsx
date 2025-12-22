

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
  // Support both legacy and minimal returnedItems structure
  let customer = data?.soldTo?.name || data?.customer || '';
  let date = data?.date || data?.createdAt || '';
  let invoiceNumber = data?.invoiceNumber || data?.id || '';
  let items = [];
  let returnNote = data?.returnNote || '';
  let servedBy = data?.servedBy || '';
  let signature = data?.signature || '';

  // If only returnedItems and returnNote are present, use them
  if (Array.isArray(data?.returnedItems) && Object.keys(data).length <= 3) {
    items = data.returnedItems;
    // Try to extract customer/invoice/date from returnedItems if present
    customer = items[0]?.customer || '';
    invoiceNumber = items[0]?.invoiceNumber || '';
    date = items[0]?.date || '';
  } else if (Array.isArray(data?.returnedItems)) {
    items = data.returnedItems;
  } else if (Array.isArray(data?.items)) {
    items = data.items.filter((item: any) => item.returned);
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 40 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Returned Receipt</h1>
      {data && !data._error ? (
        <div style={{ maxWidth: 600, margin: '0 auto', fontSize: 18 }}>
          {customer && <div><b>Customer:</b> {customer}</div>}
          {date && <div><b>Date:</b> {date}</div>}
          {invoiceNumber && <div><b>Invoice #:</b> {invoiceNumber}</div>}
          <div><b>Returned Items:</b></div>
          <ul>
            {items.length > 0 ? items.map((item: any, idx: number) => (
              <li key={idx}>{item.description} {item.sku ? `(${item.sku})` : ''}</li>
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
