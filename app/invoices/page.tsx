import { Suspense } from 'react';
import InvoicesListClient from './InvoicesListClient';

export default function InvoicesPage() {
    return (
        <Suspense fallback={<div className="p-10 text-gray-500">Loading invoices...</div>}>
            <InvoicesListClient />
        </Suspense>
    );
}
