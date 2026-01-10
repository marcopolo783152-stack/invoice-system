import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { InventoryItem } from './inventory-storage';

export const generateInventoryTagsPDF = (items: InventoryItem[]) => {
    // Avery 5161 Template
    // Page: Letter (8.5 x 11 in)
    // Labels: 1" x 4"
    // Columns: 2 (Gap 0.1875")
    // Rows: 10 (Gap 0")
    // Top Margin: 0.5"
    // Left Margin: 0.156"

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
    });

    // Font setup
    doc.setFont('helvetica', 'normal');

    const marginLeft = 0.16;
    const marginTop = 0.5;

    // Explicit positions for Column 1 and Column 2
    const col1X = marginLeft;
    const col2X = marginLeft + 4.0 + 0.18;

    items.forEach((item, index) => {
        // Calculate position
        const itemsPerPage = 20;
        const pageIndex = Math.floor(index / itemsPerPage);
        const positionOnPage = index % itemsPerPage;

        // Add new page if needed
        if (index > 0 && positionOnPage === 0) {
            doc.addPage();
        }

        const row = Math.floor(positionOnPage / 2);
        const col = positionOnPage % 2;

        const x = col === 0 ? col1X : col2X;
        const y = marginTop + (row * 1.0);

        // --- Draw Tag Content ---

        const leftX = x + 0.2;
        const rightX = x + 3.8;

        // LEFT SIDE
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('MARCO POLO RUGS', leftX, y + 0.25);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`SKU: ${item.sku}`, leftX, y + 0.4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const dimText = `${item.widthFeet}'${item.widthInches}" x ${item.lengthFeet}'${item.lengthInches}" ${item.shape === 'round' ? '(R)' : ''}`;
        doc.text(dimText, leftX, y + 0.55);

        doc.setFontSize(7);
        const mat = (item.material || item.quality || '').substring(0, 35); // Truncate
        doc.text(mat, leftX, y + 0.7);

        // RIGHT SIDE
        // Price
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const price = `$${(item.price || 0).toLocaleString()}`;
        doc.text(price, rightX, y + 0.6, { align: 'right' });

        // Barcode Generation
        try {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, item.sku, {
                format: "CODE39",
                width: 2,
                height: 40,
                displayValue: false, // We'll render text manually if needed, or rely on the image
                margin: 0
            });
            const barcodeData = canvas.toDataURL('image/png');

            // Add barcode image (Adjust dimensions to fit)
            // rightX is the right edge alignment. We want to place the image to the left (approx 1.5 inch wide)
            doc.addImage(barcodeData, 'PNG', rightX - 1.5, y + 0.3, 1.5, 0.25);

            // Text below barcode
            doc.setFont('courier', 'bold');
            doc.setFontSize(10);
            doc.text(`*${item.sku}*`, rightX, y + 0.25, { align: 'right' });

        } catch (e) {
            console.error("Barcode generation failed", e);
            // Fallback text
            doc.setFont('courier', 'normal');
            doc.setFontSize(14);
            doc.text(`*${item.sku}*`, rightX, y + 0.4, { align: 'right' });
        }

        // Small Brand helper
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('MarcoPolo', rightX, y + 0.2, { align: 'right' });
        doc.setTextColor(0);
    });

    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
};
