const fs = require('fs');

// Patch pdf.ts
const pdfFile = 'utils/pdf.ts';
let pdfContent = fs.readFileSync(pdfFile, 'utf8').replace(/\r\n/g, '\n');

if (!pdfContent.includes('loadImage')) {
  // make it async
  pdfContent = pdfContent.replace(
    'export const generateAndDownloadReceiptPDF = (order: any, shopProfile: any) => {',
    'const loadImage = (url: string): Promise<HTMLImageElement> => {\\n  return new Promise((resolve, reject) => {\\n    const img = new Image();\\n    img.crossOrigin = "Anonymous";\\n    img.onload = () => resolve(img);\\n    img.onerror = (e) => reject(e);\\n    img.src = url;\\n  });\\n};\\n\\nexport const generateAndDownloadReceiptPDF = async (order: any, shopProfile: any, logoUrl?: string) => {'
  );

  // inject logo rendering right after the background rect
  const headerStrip = `      // Deep brown aesthetic header strip\\n      doc.setFillColor(45, 42, 38);\\n      doc.rect(8, 8, 194, 35, "F");`;
  const logoLogic = `      // Deep brown aesthetic header strip\\n      doc.setFillColor(45, 42, 38);\\n      doc.rect(8, 8, 194, 35, "F");\\n\\n      if (logoUrl) {\\n        try {\\n          const img = await loadImage(logoUrl);\\n          const maxH = 22;\\n          const maxW = 35;\\n          let w = img.width;\\n          let h = img.height;\\n          if (h > maxH) { w = w * (maxH / h); h = maxH; }\\n          if (w > maxW) { h = h * (maxW / w); w = maxW; }\\n          const y = 8 + (35 - h) / 2;\\n          doc.addImage(img, 'PNG', 12, y, w, h);\\n        } catch (e) {\\n          console.warn("Could not load logo for PDF", e);\\n        }\\n      }`;

  pdfContent = pdfContent.replace(headerStrip, logoLogic);

  fs.writeFileSync(pdfFile, pdfContent);
  console.log('pdf.ts patched');
}

// Patch CartView.tsx
const cartFile = 'components/public/CartView.tsx';
let cartContent = fs.readFileSync(cartFile, 'utf8').replace(/\r\n/g, '\n');
if (!cartContent.includes('generateAndDownloadReceiptPDF(order, shopProfile, logoUrl)')) {
  cartContent = cartContent.replace(
    'generateAndDownloadReceiptPDF(order, shopProfile);',
    'generateAndDownloadReceiptPDF(order, shopProfile, logoUrl);'
  );
  fs.writeFileSync(cartFile, cartContent);
  console.log('CartView.tsx patched');
}

// Patch TrackingView.tsx
const trackingFile = 'components/public/TrackingView.tsx';
let trackContent = fs.readFileSync(trackingFile, 'utf8').replace(/\r\n/g, '\n');
if (!trackContent.includes('generateAndDownloadReceiptPDF(ro, shopProfile, logoUrl)')) {
  trackContent = trackContent.replace(
    'generateAndDownloadReceiptPDF(ro, shopProfile)',
    'generateAndDownloadReceiptPDF(ro, shopProfile, logoUrl)'
  );
  trackContent = trackContent.replace(
    'generateAndDownloadReceiptPDF(activeOrder, shopProfile)',
    'generateAndDownloadReceiptPDF(activeOrder, shopProfile, logoUrl)'
  );
  fs.writeFileSync(trackingFile, trackContent);
  console.log('TrackingView.tsx patched');
}
