import NoSsrWrapper from '@/components/NoSsrWrapper';
import InvoicesListClient from './InvoicesListClient';

export default function InvoicesPage() {
    return (
        <NoSsrWrapper fallback={<div className="p-10 text-gray-500">Loading invoices...</div>}>
            <InvoicesListClient />
        </NoSsrWrapper>
    );
}
