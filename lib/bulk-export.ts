import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { SavedInvoice } from './invoice-storage';
import { calculateInvoice } from './calculations';
import { getInvoicePDFBlob } from './pdf-utils';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import AppraisalTemplate from '@/components/AppraisalTemplate';
import InventoryTemplate from '@/components/InventoryTemplate';
import { Appraisal } from './appraisals-storage';
import { InventoryItem } from './inventory-storage';
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
 * Export ALL data directly to a selected folder on disk
 */
export async function exportToDirectory(
  invoices: SavedInvoice[] = [],
  appraisals: Appraisal[] = [],
  inventoryItems: InventoryItem[] = [],
  onProgress?: ProgressCallback
): Promise<void> {

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

    // 2. Create Subdirectories (Only if we have invoices to process)
    let salesHandle, consignmentHandle, washHandle;
    if (invoices.length > 0) {
        salesHandle = await rootHandle.getDirectoryHandle('Sales', { create: true });
        consignmentHandle = await rootHandle.getDirectoryHandle('Consignment', { create: true });
        washHandle = await rootHandle.getDirectoryHandle('Wash_Repair_Services', { create: true });
    }

    let appraisalsHandle, inventoryHandle;
    if (appraisals.length > 0) {
        appraisalsHandle = await rootHandle.getDirectoryHandle('Appraisals', { create: true });
    }
    if (inventoryItems.length > 0) {
        inventoryHandle = await rootHandle.getDirectoryHandle('Inventory_Product_Sheets', { create: true });
    }

    const totalExport = invoices.length + appraisals.length + inventoryItems.length;
    let currentProcessed = 0;

    // Helper for high-quality PDF generation
    // We use Scale 4 for "Perfect System" results
    const generateHighQualityPDF = async (container: HTMLElement, filename: string) => {
        return await getInvoicePDFBlob(container, filename);
    };

    if (totalExport > 0) {
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
            const pdfBlob = await generateHighQualityPDF(container, invoice.data.invoiceNumber);

            // Filename: [Invoice#] [Name] [Phone].pdf
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
            const fileHandle = await targetHandle!.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();
            
            currentProcessed++;
        }

        // --- PROCESS APPRAISALS ---
        for (let i = 0; i < appraisals.length; i++) {
            const appraisal = appraisals[i];
            
            onProgress?.({
                current: currentProcessed + 1,
                total: totalExport,
                status: `Backing up Appraisal: ${appraisal.rugNumber || appraisal.id}...`,
                percentage: Math.round(((currentProcessed + 1) / totalExport) * 100),
            });

            // Render Appraisal
            await new Promise<void>(resolve => {
                root.render(
                    React.createElement('div', { className: 'pdf-export-wrapper', style: { background: 'white' } },
                        React.createElement(AppraisalTemplate, { appraisal })
                    )
                );
                setTimeout(resolve, 100); // Appraisals have more images
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            const pdfBlob = await generateHighQualityPDF(container, appraisal.rugNumber || appraisal.id || 'unknown');
            const safe = (str: string) => (str || '').replace(/[^a-zA-Z0-9- ]/g, '').trim();
            const filename = `Appraisal_${safe(appraisal.rugNumber || appraisal.id || 'unknown')}_${safe(appraisal.customerName || 'unknown')}.pdf`;

            const fileHandle = await appraisalsHandle!.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();

            currentProcessed++;
        }

        // --- PROCESS INVENTORY PRODUCT SHEETS ---
        for (let i = 0; i < inventoryItems.length; i++) {
            const item = inventoryItems[i];
            
            onProgress?.({
                current: currentProcessed + 1,
                total: totalExport,
                status: `Backing up Product Sheet: ${item.sku}...`,
                percentage: Math.round(((currentProcessed + 1) / totalExport) * 100),
            });

            // Render Inventory Sheet
            await new Promise<void>(resolve => {
                root.render(
                    React.createElement('div', { className: 'pdf-export-wrapper', style: { background: 'white' } },
                        React.createElement(InventoryTemplate, { item })
                    )
                );
                setTimeout(resolve, 100);
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            const pdfBlob = await generateHighQualityPDF(container, item.sku || 'unknown');
            const safeItem = (str: string) => (str || '').replace(/[^a-zA-Z0-9- ]/g, '').trim();
            const filename = `ProductSheet_${safeItem(item.sku || 'unknown')}_${safeItem(item.description || item.design || 'item')}.pdf`;

            const fileHandle = await inventoryHandle!.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();

            currentProcessed++;
        }

        // Cleanup
        root.unmount();
        document.body.removeChild(container);
    }

    // Write Master JSONs to root directory
    onProgress?.({ current: total, total, status: 'Saving Master Data Files...', percentage: 95 });
    
    // Dynamically import to avoid circular dependency issues at the top of file
    const { exportInvoices } = await import('./invoice-storage');
    const { getAppraisals } = await import('./appraisals-storage');
    const { getInventoryItems } = await import('./inventory-storage');

    try {
      const invoicesJsonHandle = await rootHandle.getFileHandle('Invoices_Master.json', { create: true });
      const writableInv = await invoicesJsonHandle.createWritable();
      await writableInv.write(exportInvoices());
      await writableInv.close();

      const appraisalsJsonHandle = await rootHandle.getFileHandle('Appraisals_Master.json', { create: true });
      const writableApp = await appraisalsJsonHandle.createWritable();
      await writableApp.write(JSON.stringify(await getAppraisals(), null, 2));
      await writableApp.close();

      const inventoryJsonHandle = await rootHandle.getFileHandle('Inventory_Master.json', { create: true });
      const writableInventory = await inventoryJsonHandle.createWritable();
      await writableInventory.write(JSON.stringify(await getInventoryItems(), null, 2));
      await writableInventory.close();
    } catch (e) {
      console.warn('Could not save one or more JSON Master files', e);
    }

    onProgress?.({ current: total, total, status: 'Backup Complete!', percentage: 100 });

  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}
