import dynamic from 'next/dynamic';

const InvoicesListClient = dynamic(() => import('./InvoicesListClient'), {
    ssr: false,
    loading: () => <div className="p-10 text-gray-500">Loading invoices...</div>
});

export default function InvoicesPage() {
    return <InvoicesListClient />;
}
