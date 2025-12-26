/**
 * MAIN INVOICE PAGE
 * 
 * Entry point for the invoice system
 * Combines form, template, and actions
 */

'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import InvoiceForm from '@/components/InvoiceForm';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import PrintPortal from '@/components/PrintPortal';
// ... existing imports ...


import InvoiceSearch from '@/components/InvoiceSearch';
const Login = dynamic(() => import('@/components/Login').then(mod => mod.default), { ssr: false });
const UserManagement = dynamic(() => import('@/components/UserManagement'), { ssr: false });
import { InvoiceData, calculateInvoice, validateInvoiceData } from '@/lib/calculations';
import { printInvoice, generatePDF, openPDFInNewTab, isMobileDevice } from '@/lib/pdf-utils';
import { printElement } from '@/lib/print-service';
import { saveInvoice, getInvoicesCount, getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
// ...
const handlePrint = async () => {
  // Use Robust Popup Print
  printElement('invoice-printable-content-new');
};
// ...
{/* Print-only wrapper: only this area will be printed */ }
{/* Screen Preview (Visible on Screen, Hidden on Print via CSS) */ }
<div className="screen-only" ref={invoiceRef} id="invoice-printable-content-new">
  <InvoiceTemplate
    data={invoiceData}
    calculations={calculations}
    businessInfo={businessConfig}
  />
</div>

{/* Print Portal (Hidden on Screen, Visible on Print) */ }
            <PrintPortal>
              <div className="print-only-portal">
                <InvoiceTemplate
                  data={invoiceData}
                  calculations={calculations}
                  businessInfo={businessConfig}
                />
              </div>
            </PrintPortal>

            <div className={styles.bottomActions}>
              <button onClick={handlePrint} className={styles.printBtn}>
                🖨️ Print
              </button>
              <button onClick={handleDownloadPDF} className={styles.pdfBtn}>
                📄 Download PDF
              </button>
            </div>
          </div >
        )}
      </div >
    </main >
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <InvoicePageContent />
    </Suspense>
  );
}
