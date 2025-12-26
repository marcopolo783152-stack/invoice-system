'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText, Download, Undo, Edit, ShoppingCart } from 'lucide-react';
import { getInvoiceByIdAsync, SavedInvoice, saveInvoice } from '@/lib/invoice-storage';
import { calculateInvoice, InvoiceCalculations } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { ReturnedReceipt } from '@/components/ReturnedReceipt';
import { businessConfig } from '@/config/business';
// ... imports
// import { printElement } from '@/lib/print-service'; // No longer needed
import { generatePDF } from '@/lib/pdf-utils';

// ...

const handlePrint = () => {
    // Direct Window Print (CSS handles content filtering)
    window.print();
};

// ...

{/* Screen Preview */ }
<div
    id="invoice-content-to-print"
    style={{
        background: 'white',
        padding: 40,
        borderRadius: 8,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
    }}
    ref={invoiceRef}
>
    <InvoiceTemplate
        data={invoice.data}
        calculations={calculations}
        businessInfo={businessConfig}
    />
</div>
                </div >
            </div >



    <style jsx global>{`
                @media print {
                    /* Handle legacy overrides if any, but print.css should handle most */
                    html, body {
                        background: white !important;
                    }
                }
            `}</style>
        </div >
    );
}


export default function InvoiceViewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InvoiceViewContent />
        </Suspense>
    );
}
