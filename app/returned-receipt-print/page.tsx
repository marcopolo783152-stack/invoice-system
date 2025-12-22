

'use client';
import React, { useEffect, useState } from 'react';

function parseData(dataParam: string | null) {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(dataParam));
  } catch {
    return null;
  }
}

export default function ReturnedReceiptPrintPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dataParam = params.get('data');
      setData(parseData(dataParam));
    }
  }, []);

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 40 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Returned Receipt</h1>
      {data ? (
        <div style={{ maxWidth: 600, margin: '0 auto', fontSize: 18 }}>
          <div><b>Customer:</b> {data.soldTo?.name}</div>
          <div><b>Date:</b> {data.date}</div>
          <div><b>Invoice #:</b> {data.invoiceNumber}</div>
          <div><b>Returned Items:</b></div>
          <ul>
            {Array.isArray(data.items) && data.items.map((item: any, idx: number) => (
              <li key={idx}>{item.description} ({item.sku})</li>
            ))}
          </ul>
          {data.returnNote && <div><b>Return Note:</b> {data.returnNote}</div>}
          {data.servedBy && <div><b>Served by:</b> {data.servedBy}</div>}
          {data.signature && (
            <div style={{ marginTop: 24 }}>
              <b>Customer Signature:</b>
              <div><img src={data.signature} alt="Signature" style={{ maxWidth: 300, border: '1px solid #ccc', marginTop: 8 }} /></div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: 'red', textAlign: 'center' }}>No receipt data found.</div>
      )}
    </div>
  );
}
