import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const InvoicesListClient = dynamic(() => import('./InvoicesListClient'), { ssr: false });

export default function InvoicesPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, color: '#666' }}>Loading invoices...</div>}>
            <InvoicesListClient />
        </Suspense>
    );
}
