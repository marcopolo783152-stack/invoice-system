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
export async function generatePDF(
  invoiceElement: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  try {
    // Create canvas from HTML element
    const canvas = await html2canvas(invoiceElement, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: invoiceElement.scrollWidth,
      height: invoiceElement.scrollHeight,
    });

    // Calculate dimensions for letter size (8.5" x 11")
    const imgWidth = 8.5; // inches
    const pageHeight = 11; // inches
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter',
    });

    const imgData = canvas.toDataURL('image/png');

    // Add image to PDF
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add new pages if content exceeds one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download PDF
    const fileName = `Invoice_${invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

/**
 * Generate and open PDF in new tab
 */
export async function openPDFInNewTab(
  invoiceElement: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  try {
    // Create canvas from HTML element
    const canvas = await html2canvas(invoiceElement, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: invoiceElement.scrollWidth,
      height: invoiceElement.scrollHeight,
    });

    // Calculate dimensions for letter size (8.5" x 11")
    const imgWidth = 8.5; // inches
    const pageHeight = 11; // inches
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter',
    });

    const imgData = canvas.toDataURL('image/png');

    // Add image to PDF
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add new pages if content exceeds one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Open PDF
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    if (isMobileDevice()) {
      // On mobile, window.open is often blocked if async. 
      // Redirecting current window is more reliable for viewing the PDF.
      window.location.href = blobUrl;
    } else {
      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow) {
        // Fallback if blocked
        window.location.href = blobUrl;
      }
    }

  } catch (error) {
    console.error('Error opening PDF:', error);
    throw new Error('Failed to open PDF. Please try again.');
  }
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
