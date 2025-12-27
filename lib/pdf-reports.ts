import jsPDF from 'jspdf';
import { SavedInvoice } from './invoice-storage';
import { calculateInvoice } from './calculations';

/**
 * Generate Sales Report PDF
 */
export async function generateSalesReportPDF(
    invoices: SavedInvoice[],
    startDate: string,
    endDate: string
): Promise<void> {
    // Initialize PDF
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
    });

    const pageWidth = 8.5;
    const pageHeight = 11;
    const margin = 0.5;
    let y = margin;

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Sales Report', margin, y + 0.5);
    y += 1;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, y);
    doc.text(`Period: ${startDate} to ${endDate}`, margin, y + 0.2);
    y += 0.5;

    // Table Headers
    const colDate = margin;
    const colNum = 1.3;
    const colType = 2.4;
    const colCust = 4.0;
    const colAmount = 7.0;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    try {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y - 0.15, pageWidth - (margin * 2), 0.3, 'F');
    } catch (e) { }

    doc.text('Date', colDate, y + 0.05);
    doc.text('Invoice #', colNum, y + 0.05);
    doc.text('Type / Status', colType, y + 0.05);
    doc.text('Customer', colCust, y + 0.05);
    doc.text('Amount', colAmount, y + 0.05, { align: 'right' });

    y += 0.3;

    // Data
    doc.setFont('helvetica', 'normal');
    let totalSales = 0;

    invoices.forEach((inv) => {
        let amount = calculateInvoice(inv.data).totalDue;

        // Determine Status/Type
        let typeStr = inv.data.documentType || 'SALE';

        // Check for returns - either the invoice itself is marked or has returned items
        if (inv.data.returned || (inv.data.items && inv.data.items.every(i => i.returned))) {
            typeStr = 'REFUND/RETURN';
        } else if (typeStr === 'CONSIGNMENT') {
            typeStr = 'CONSIGNMENT';
        } else if (typeStr === 'WASH') {
            typeStr = 'WASH SERVICE';
        }

        // Only add valid sales to total (exclude consignments until sold, and returns)
        // Adjust logic based on specific business rules if needed. 
        // For now, we assume simple summation but visual distinction is adding value.
        // If it is a refund, we might want to NOT add it to positive sales, or substract.
        // Standard practice: List them, maybe total is net? 
        // For this iteration, I'll add them all but make it clear.

        if (typeStr.includes('RETURN') || typeStr.includes('REFUND')) {
            // Optional: Don't add to total? Or is amount negative? 
            // Usually returns are handled by creating a credit memo or negative invoice.
            // If the amount is positive but marked as returned, we shouldn't add it to "Sales".
        } else if (typeStr === 'CONSIGNMENT') {
            // Consignment items aren't sales yet.
        } else {
            totalSales += amount;
        }

        // Check pagination
        if (y > pageHeight - margin - 0.5) {
            doc.addPage();
            y = margin + 0.5; // Reset y
        }

        doc.text(inv.data.date, colDate, y);
        doc.text(inv.data.invoiceNumber || '-', colNum, y);

        doc.setFontSize(8);
        doc.text(typeStr, colType, y);
        doc.setFontSize(10);

        // Truncate customer name if too long
        let custName = inv.data.soldTo.name || '-';
        if (custName.length > 25) custName = custName.substring(0, 25) + '...';
        doc.text(custName, colCust, y);

        doc.text(`$${amount.toLocaleString()}`, colAmount, y, { align: 'right' });
        y += 0.25;

        // Light divider line
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, y - 0.15, pageWidth - margin, y - 0.15);
    });

    // Footer Totals
    y += 0.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Sales (Valid Only):', 4.5, y);
    doc.text(`$${totalSales.toLocaleString()}`, colAmount, y, { align: 'right' });

    // Save
    doc.save(`Sales_Report_${startDate}_${endDate}.pdf`);
}
