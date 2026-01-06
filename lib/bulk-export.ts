import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { SavedInvoice } from './invoice-storage';
import { calculateInvoice } from './calculations';
import { getInvoicePDFBlob } from './pdf-utils';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { businessConfig } from '@/config/business';

export interface ExportProgress {
  current: number;
  total: number;
  status: string;
  percentage: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Export multiple invoices as PDFs in a ZIP file
 */
export async function exportInvoicesAsPDFs(
  invoices: SavedInvoice[],
  onProgress?: ProgressCallback
): Promise<void> {
  if (invoices.length === 0) {
    throw new Error('No invoices to export');
  }

  const zip = new JSZip();
  const total = invoices.length;

  try {
    // Update initial progress
    onProgress?.({
      current: 0,
      total,
      status: 'Starting export...',
      percentage: 0,
    });

    // Create a hidden container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '800px'; // Match the single print width logic
    container.style.visibility = 'visible';
    document.body.appendChild(container);

    // Initialize React Root
    const root = createRoot(container);

    // Process each invoice
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const calculations = calculateInvoice(invoice.data);

      // Update progress
      onProgress?.({
        current: i + 1,
        total,
        status: `Generating PDF ${i + 1} of ${total}: ${invoice.data.invoiceNumber}`,
        percentage: Math.round(((i + 1) / total) * 100),
      });

      try {
        // Render the Invoice Template
        await new Promise<void>(resolve => {
          root.render(
            React.createElement('div', { className: 'pdf-export-wrapper', style: { background: 'white' } },
              React.createElement(InvoiceTemplate, {
                data: invoice.data,
                calculations: calculations,
                businessInfo: businessConfig
              })
            )
          );
          // Allow React to complete render
          setTimeout(resolve, 50);
        });

        // Wait a bit more for images/fonts to stabilize if needed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate PDF blob using the shared utility (handles pagination)
        const pdfBlob = await getInvoicePDFBlob(container, invoice.data.invoiceNumber);

        // Add to ZIP
        const invoiceNum = invoice.data.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
        const customerName = invoice.data.soldTo.name.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${invoiceNum}_${customerName}.pdf`;
        zip.file(filename, pdfBlob);

      } catch (error) {
        console.error(`Error processing invoice ${invoice.data.invoiceNumber}:`, error);
        // Continue with next invoice even if one fails
      }
    }

    // Cleanup React Root and Container
    root.unmount();
    document.body.removeChild(container);

    // Generate ZIP file
    onProgress?.({
      current: total,
      total,
      status: 'Creating ZIP file...',
      percentage: 100,
    });

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Download ZIP
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(zipBlob, `Invoices_Export_${timestamp}.zip`);

    onProgress?.({
      current: total,
      total,
      status: 'Export complete!',
      percentage: 100,
    });

  } catch (error) {
    console.error('Error exporting invoices:', error);
    throw error;
  }
}

/**
 * Export selected invoices as PDFs
 */
export async function exportSelectedInvoices(
  invoiceIds: string[],
  allInvoices: SavedInvoice[],
  onProgress?: ProgressCallback
): Promise<void> {
  const selectedInvoices = allInvoices.filter(inv => invoiceIds.includes(inv.id));
  return exportInvoicesAsPDFs(selectedInvoices, onProgress);
}

/**
 * Export ALL invoices directly to a selected folder on disk
 * Structure: Root -> Sales/Consignment/Wash -> [Invoice#] [Name] [Phone].pdf
 */
export async function exportToDirectory(
  invoices: SavedInvoice[],
  onProgress?: ProgressCallback
): Promise<void> {
  if (invoices.length === 0) {
    throw new Error('No invoices to backup');
  }

  // 1. Request Directory Handle
  let rootHandle: any;
  try {
    // @ts-ignore - showDirectoryPicker is not yet in standard TS lib
    rootHandle = await window.showDirectoryPicker();
  } catch (e) {
    // User cancelled
    return;
  }

  const total = invoices.length;

  try {
    onProgress?.({
      current: 0,
      total,
      status: 'Preparing backup folders...',
      percentage: 0,
    });

    // 2. Create Subdirectories
    const salesHandle = await rootHandle.getDirectoryHandle('Sales', { create: true });
    const consignmentHandle = await rootHandle.getDirectoryHandle('Consignment', { create: true });
    const washHandle = await rootHandle.getDirectoryHandle('Wash_Repair_Services', { create: true });

    // Container (Hidden)
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute', left: '-10000px', top: '0', width: '800px', visibility: 'visible'
    });
    document.body.appendChild(container);
    const root = createRoot(container);

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const calculations = calculateInvoice(invoice.data);

      onProgress?.({
        current: i + 1,
        total,
        status: `Backing up ${invoice.data.invoiceNumber}...`,
        percentage: Math.round(((i + 1) / total) * 100),
      });

      // Render
      await new Promise<void>(resolve => {
        root.render(
          React.createElement('div', { className: 'pdf-export-wrapper', style: { background: 'white' } },
            React.createElement(InvoiceTemplate, {
              data: invoice.data,
              calculations: calculations,
              businessInfo: businessConfig
            })
          )
        );
        setTimeout(resolve, 50);
      });
      await new Promise(resolve => setTimeout(resolve, 100)); // Slight delay

      // Generate Blob
      const pdfBlob = await getInvoicePDFBlob(container, invoice.data.invoiceNumber);

      // Filename: [Invoice#] [Name] [Phone].pdf
      // Sanitize filename to be safe for Windows
      const safe = (str: string) => (str || '').replace(/[^a-zA-Z0-9- ]/g, '').trim();
      const invNum = safe(invoice.data.invoiceNumber);
      const name = safe(invoice.data.soldTo.name);
      const phone = safe(invoice.data.soldTo.phone);

      const filename = `${invNum} ${name} ${phone}.pdf`;

      // Determine Target Folder
      let targetHandle = salesHandle;
      const type = invoice.data.documentType || 'INVOICE';
      if (type === 'CONSIGNMENT') targetHandle = consignmentHandle;
      else if (type === 'WASH') targetHandle = washHandle;

      // Write File
      const fileHandle = await targetHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(pdfBlob);
      await writable.close();
    }

    // Cleanup
    root.unmount();
    document.body.removeChild(container);

    onProgress?.({ current: total, total, status: 'Backup Complete!', percentage: 100 });

  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}
