/**
 * PRINT AND PDF UTILITY
 * 
 * Handles printing and PDF generation with pixel-perfect output
 * Ensures consistency across screen, print, and PDF
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Print the invoice using browser print dialog
 */
export function printInvoice(): void {
  window.print();
}

/**
 * Generate and download PDF from invoice
 */
/**
 * Generate PDF from invoice
 */
async function createPDF(invoiceElement: HTMLElement, invoiceNumber: string, isDownload: boolean): Promise<void> {
  try {
    // Find all pages
    const pages = invoiceElement.querySelectorAll('.pdf-page');
    if (!pages || pages.length === 0) {
      throw new Error('No invoice pages found to generate');
    }

    // Initialize PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter', // Standard Letter size
    });

    const pdfWidth = 8.5;
    const pdfHeight = 11;

    // Process each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;

      // Generate canvas for the page
      // We use a slightly smaller width to avoid any potential overflow
      const canvas = await html2canvas(page, {
        scale: 2, // High quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: page.scrollWidth,
        height: page.scrollHeight,
        windowWidth: page.scrollWidth, // Ensure responsive styles don't match
      });

      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);

      // Calculate height to fit width
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // If not the first page, add a new one
      if (i > 0) {
        pdf.addPage();
      }

      // Add image to PDF
      // usage: addImage(imageData, format, x, y, width, height)
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
    }

    const fileName = `Invoice_${invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;

    if (isDownload) {
      pdf.save(fileName);
    } else {
      // Open in new tab
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      if (isMobileDevice()) {
        window.location.href = blobUrl;
      } else {
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          window.location.href = blobUrl;
        }
      }
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

export async function generatePDF(
  invoiceElement: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  return createPDF(invoiceElement, invoiceNumber, true);
}

export async function openPDFInNewTab(
  invoiceElement: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  return createPDF(invoiceElement, invoiceNumber, false);
}

/**
 * Alternative: Direct print to PDF using browser
 * This uses the browser's native print-to-PDF capability
 */
export function printToPDF(): void {
  // Trigger print dialog - user can select "Save as PDF"
  window.print();
}

/**
 * Check if browser supports print
 */
export function isPrintSupported(): boolean {
  return typeof window !== 'undefined' && 'print' in window;
}

/**
 * Robust mobile detection
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent)
    || (window.innerWidth <= 800 && window.innerHeight <= 900);
}
