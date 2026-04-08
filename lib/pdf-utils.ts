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
      // We use a 3x scale for High Quality (Best balance of speed and sharpness)
      const canvas = await html2canvas(page, {
        scale: 3, // Balanced High Quality (faster than 4x)
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200, // Ensure desktop layout
        // Removed width/height to allow html2canvas to determine correct element bounds
      });

      // Use PNG for maximum lossless quality on the single-page certificate
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
 * Generate and view PDF in current tab (replaces current page)
 */
export async function viewPDFInCurrentTab(
  invoiceElement: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  try {
    const blob = await getInvoicePDFBlob(invoiceElement, invoiceNumber);
    const blobUrl = URL.createObjectURL(blob);
    window.location.href = blobUrl;
  } catch (error) {
    console.error('Error viewing PDF in current tab:', error);
    throw error;
  }
}

export async function getInvoicePDFBlob(
  invoiceElement: HTMLElement,
  invoiceNumber: string
): Promise<Blob> {
  const pages = invoiceElement.querySelectorAll('.pdf-page');
  if (!pages || pages.length === 0) throw new Error('No invoice pages found');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
  const pdfWidth = 8.5;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;
    const canvas = await html2canvas(page, {
      scale: 4, // Ultra Quality for Print
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
    });

    // Use JPEG with 0.8 quality (High) to ensure readability while keeping size reasonable
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
  }

  return pdf.output('blob');
}

export async function generatePDFBlobUrl(
  invoiceElement: HTMLElement,
  invoiceNumber: string
): Promise<string> {
  const blob = await getInvoicePDFBlob(invoiceElement, invoiceNumber);
  return URL.createObjectURL(blob);
}

/**
 * Generate a PDF for a long report (dynamic height)
 */
export async function generateReportPDFBlobUrl(
  element: HTMLElement,
  filename: string
): Promise<string> {
  // Capture the full element
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 816, // Letter size at 96 DPI (8.5 * 96)
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // We want to add margins to the PDF.
  // Letter paper is 8.5 x 11.
  // We'll leave 0.5 inches margin top and bottom.
  // So the content height per page is 10 inches instead of 11.
  const marginInches = 0.5;
  const contentHeightInches = 11 - (marginInches * 2);
  
  // Calculate how many pixels correspond to the available content height
  const pageHeightPixels = (imgWidth / 8.5) * contentHeightInches;
  const totalPages = Math.ceil(imgHeight / pageHeightPixels);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  for (let i = 0; i < totalPages; i++) {
    const sourceY = i * pageHeightPixels;
    const sWidth = imgWidth;
    const sHeight = Math.min(pageHeightPixels, imgHeight - sourceY);

    // Create a temporary canvas for this specific page slice
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = sWidth;
    pageCanvas.height = pageHeightPixels; // Always use fixed height to prevent distortion

    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sWidth, pageHeightPixels);
      ctx.drawImage(
        canvas,
        0, sourceY, sWidth, sHeight, // Source
        0, 0, sWidth, sHeight        // Destination
      );
    }

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.9);

    if (i > 0) pdf.addPage();
    // Paste the image slice offset by our top margin, with the height restricted to the safe zone
    pdf.addImage(pageImgData, 'JPEG', 0, marginInches, 8.5, contentHeightInches);
    
    // Optional: Add a simple page number footer
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Page ${i + 1} of ${totalPages}`, 4.25, 10.7, { align: 'center' });
  }

  const blob = pdf.output('blob');
  return URL.createObjectURL(blob);
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
