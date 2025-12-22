

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
    }
  }, []);

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 40 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Returned Receipt</h1>
      {data && !data._error ? (
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
