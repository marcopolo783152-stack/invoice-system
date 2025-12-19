/**
 * BULK PDF EXPORT
 * Generate and download multiple invoices as PDFs in a ZIP file
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SavedInvoice } from './invoice-storage';
import { calculateInvoice } from './calculations';

export interface ExportProgress {
  current: number;
  total: number;
  status: string;
  percentage: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Generate PDF from invoice HTML element
 */
async function generatePDFBlob(invoiceElement: HTMLElement): Promise<Blob> {
  try {
    // Capture the invoice as canvas
    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Return PDF as blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Create temporary invoice element for rendering
 */
function createInvoiceElement(invoice: SavedInvoice): HTMLElement {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm';
  container.style.padding = '10mm';
  container.style.backgroundColor = 'white';
  document.body.appendChild(container);

  const calculations = calculateInvoice(invoice.data);

  // Build invoice HTML
  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 9pt; color: #000;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #000;">
        <div>
          <div style="font-size: 16pt; font-weight: bold; margin-bottom: 5px;">MARCO POLO ORIENTAL RUGS, INC.</div>
          <div style="font-size: 8pt;">
            3260 DUKE ST<br>
            ALEXANDRIA, VA 22314<br>
            Tel: 703-461-0207 | Fax: 703-461-0208<br>
            www.marcopolorugs.com<br>
            marcopolorugs@aol.com
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8pt; margin-bottom: 8px;">
            <strong>Invoice #:</strong> ${invoice.data.invoiceNumber}<br>
            <strong>Date:</strong> ${invoice.data.date}
          </div>
        </div>
      </div>

      <!-- Customer Info -->
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">SOLD TO:</div>
        <div style="font-size: 8pt;">
          ${invoice.data.soldTo.name}<br>
          ${invoice.data.soldTo.address}<br>
          ${invoice.data.soldTo.city}, ${invoice.data.soldTo.state} ${invoice.data.soldTo.zip}<br>
          Phone: ${invoice.data.soldTo.phone}
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 8pt;">
        <thead>
          <tr style="background: #f0f0f0; border: 1px solid #000;">
            <th style="border: 1px solid #000; padding: 4px; text-align: left;">Description</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: center;">Shape</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: center;">W.Ft</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: center;">W.In</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: center;">L.Ft</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: center;">L.In</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right;">Sq.Ft</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right;">Price</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.data.items.map(item => {
            const itemCalc = calculations.items.find(i => i.description === item.description);
            return `
              <tr>
                <td style="border: 1px solid #000; padding: 4px;">${item.description}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.shape === 'round' ? 'Round' : 'Rect'}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.widthFeet}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.widthInches}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.shape === 'round' ? '-' : item.lengthFeet}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.shape === 'round' ? '-' : item.lengthInches}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${itemCalc?.squareFoot.toFixed(2) || '0.00'}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">$${(item.pricePerSqFt || item.fixedPrice || 0).toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">$${itemCalc?.amount.toFixed(2) || '0.00'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
        <div style="width: 250px; font-size: 8pt;">
          <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #ccc;">
            <span>Subtotal:</span>
            <span>$${calculations.subtotal.toFixed(2)}</span>
          </div>
          ${calculations.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #ccc;">
              <span>Discount:</span>
              <span>-$${calculations.discount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${calculations.salesTax > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #ccc;">
              <span>Tax (6%):</span>
              <span>$${calculations.salesTax.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 5px 0; font-weight: bold; font-size: 10pt; border-top: 2px solid #000;">
            <span>Total:</span>
            <span>$${calculations.totalDue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Terms -->
      <div style="margin-top: 20px; padding: 8px; border: 1px solid #000; font-size: 7pt;">
        <div style="font-weight: bold; margin-bottom: 3px;">Terms & Conditions:</div>
        <div>All items subject to prior sale. All sales are final. No returns or exchanges accepted. Payment due upon receipt.</div>
      </div>
    </div>
  `;

  return container;
}

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

    // Process each invoice
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      
      // Update progress
      onProgress?.({
        current: i + 1,
        total,
        status: `Generating PDF ${i + 1} of ${total}: ${invoice.data.invoiceNumber}`,
        percentage: Math.round(((i + 1) / total) * 100),
      });

      try {
        // Create temporary invoice element
        const element = createInvoiceElement(invoice);

        // Wait a bit for rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Generate PDF blob
        const pdfBlob = await generatePDFBlob(element);

        // Add to ZIP with sanitized filename including invoice number, customer name, and phone
        const invoiceNum = invoice.data.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
        const customerName = invoice.data.soldTo.name.replace(/[^a-zA-Z0-9]/g, '_');
        const phone = invoice.data.soldTo.phone.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${invoiceNum}_${customerName}_${phone}.pdf`;
        zip.file(filename, pdfBlob);

        // Clean up
        document.body.removeChild(element);
      } catch (error) {
        console.error(`Error processing invoice ${invoice.data.invoiceNumber}:`, error);
        // Continue with next invoice
      }
    }

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
