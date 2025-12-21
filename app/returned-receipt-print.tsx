// Dedicated print page for returned receipt
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReturnedReceipt } from '@/components/InvoiceSearch';

export default function ReturnedReceiptPrintPage() {
  const searchParams = useSearchParams();
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    // Get receipt data from localStorage or query param
    const data = searchParams.get('data');
    if (data) {
      try {
        setReceiptData(JSON.parse(decodeURIComponent(data)));
      } catch {}
    }
    // Auto print after short delay
    setTimeout(() => window.print(), 500);
  }, [searchParams]);

  if (!receiptData) return <div>Loading receipt...</div>;
  // Use the ReturnedReceipt component for layout
  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 24 }}>
      <ReturnedReceipt receiptData={receiptData} />
    </div>
  );
}
