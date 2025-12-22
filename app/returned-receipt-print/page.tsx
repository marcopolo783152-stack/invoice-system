import React from 'react';

// Utility to parse query string data
function parseData(search: string) {
  try {
    const params = new URLSearchParams(search);
    const data = params.get('data');
    if (data) return JSON.parse(decodeURIComponent(data));
  } catch {}
  return null;
}

export default function ReturnedReceiptPrintPage({ searchParams }: { searchParams?: Record<string, string> }) {
  // For Next.js App Router, use useSearchParams
  let data: any = null;
  if (typeof window !== 'undefined') {
    data = parseData(window.location.search);
  }

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
        </div>
      ) : (
        <div style={{ color: 'red', textAlign: 'center' }}>No receipt data found.</div>
      )}
    </div>
  );
}
