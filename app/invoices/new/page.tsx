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


import InvoiceSearch from '@/components/InvoiceSearch';
const Login = dynamic(() => import('@/components/Login').then(mod => mod.default), { ssr: false });
const UserManagement = dynamic(() => import('@/components/UserManagement'), { ssr: false });
import { InvoiceData, calculateInvoice, validateInvoiceData } from '@/lib/calculations';
import { printInvoice, generatePDF, openPDFInNewTab, isMobileDevice } from '@/lib/pdf-utils';
// ... imports
// import { printElement } from '@/lib/print-service'; // No longer needed
import { printInvoice, generatePDF, openPDFInNewTab, isMobileDevice } from '@/lib/pdf-utils';
import { saveInvoice, getInvoicesCount, getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';

// ... 

const handlePrint = async () => {
  // Direct Window Print (CSS handles content filtering)
  window.print();
};

// ...

{/* Print-only wrapper: only this area will be printed */ }
{/* Screen Preview (Visible on Screen, Hidden on Print via CSS) */ }
<div className="screen-only" ref={invoiceRef} id="invoice-content-to-print">
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
