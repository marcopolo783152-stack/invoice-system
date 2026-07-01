import { jsPDF } from "jspdf";

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

export const generateAndDownloadReceiptPDF = async (order: any, shopProfile: any, logoUrl?: string) => {
if (!order) return;
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Warm background base
      doc.setFillColor(248, 246, 242);
      doc.rect(0, 0, 210, 297, "F");

      // Outer border frame
      doc.setDrawColor(220, 210, 200);
      doc.setLineWidth(0.4);
      doc.rect(8, 8, 194, 281, "S");

      // Deep brown aesthetic header strip
      doc.setFillColor(45, 42, 38);
      doc.rect(8, 8, 194, 35, "F");

      // Title header
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text(shopProfile?.name || "MARCO POLO", 105, 18, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(215, 195, 175);
      
      const shopDetails = [
        "EXOTIC ORIENTAL RUGS & TAPESTRIES  •  OFFICIAL RECEIPT",
        shopProfile?.address ? shopProfile.address : "",
        [shopProfile?.phone || "", shopProfile?.email || ""].filter(Boolean).join("  •  ")
      ].filter(Boolean);
      
      doc.text(shopDetails, 105, 26, { align: "center", lineHeightFactor: 1.5 });

      // Transaction info block
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 52, 180, 52, "F");
      doc.setDrawColor(220, 215, 210);
      doc.rect(15, 52, 180, 52, "S");

      doc.setTextColor(60, 55, 50);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("ESCROW TRANSACTION METADATA", 20, 60);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(110, 105, 100);
      
      doc.text("Order Reference:", 20, 68);
      doc.text("Authorized Date:", 20, 75);
      doc.text("Consignee Name:", 20, 82);
      doc.text("Contact Email:", 20, 89);
      doc.text("Delivery Type:", 20, 96);

      doc.setTextColor(45, 42, 38);
      doc.setFont("Helvetica", "bold");
      doc.text(`${order.id || "N/A"}`, 55, 68);
      doc.text(`${new Date(order.createdAt || Date.now()).toLocaleString()}`, 55, 75);
      doc.text(`${order.customerInfo?.name || "N/A"}`, 55, 82);
      doc.text(`${order.customerInfo?.email || "N/A"}`, 55, 89);
      doc.text(`${order.deliveryOption || "N/A"}`, 55, 96);

      // Line items table
      let y = 116;
      doc.setTextColor(45, 42, 38);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("SECURED CARAVAN CARGO ACQUISITIONS", 15, y);

      y += 4;
      doc.setDrawColor(185, 175, 160);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);

      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(130, 125, 120);
      doc.text("ITEM DESCRIPTION & ATTRIBUTES", 17, y);
      doc.text("SKU", 110, y);
      doc.text("QTY", 145, y);
      doc.text("PRICE", 172, y);

      y += 3;
      doc.line(15, y, 195, y);
      doc.setLineWidth(0.25);
      doc.setDrawColor(225, 220, 215);

      const items = order.cartItems || [];
      items.forEach((item: any) => {
        y += 7;
        doc.setTextColor(65, 60, 55);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        
        // Truncate name if too long
        let itemName = item.rug?.name || "Premium Handmade Rug";
        if (itemName.length > 42) itemName = itemName.substring(0, 39) + "...";

        doc.text(itemName, 17, y);
        doc.text(item.rug?.sku || "N/A", 110, y);
        doc.text(`${item.quantity || 1}`, 145, y);
        doc.text(`$${(item.rug?.price || 0).toLocaleString()}`, 172, y);
        
        y += 2;
        doc.line(15, y, 195, y);
      });

      y += 4;
      doc.setDrawColor(185, 175, 160);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);

      // Summary
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(110, 105, 100);
      doc.setFont("Helvetica", "normal");
      doc.text("Subtotal:", 135, y);
      doc.setFont("Helvetica", "bold");
      doc.text(`$${(order.subtotal || 0).toLocaleString()}`, 172, y);

      y += 5;
      doc.setFont("Helvetica", "normal");
      doc.text("Sales Tax (6%):", 135, y);
      doc.setFont("Helvetica", "bold");
      doc.text(`$${(order.tax || 0).toLocaleString()}`, 172, y);

      y += 5;
      doc.setFont("Helvetica", "normal");
      doc.text("Shipping Freight:", 135, y);
      doc.setFont("Helvetica", "bold");
      doc.text(`$${(order.shipping || 0).toLocaleString()}`, 172, y);

      y += 7;
      doc.setFillColor(45, 42, 38);
      doc.rect(130, y - 4, 65, 7.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");
      doc.text("TOTAL SECURED:", 134, y + 1);
      doc.text(`$${(order.total || 0).toLocaleString()}`, 172, y + 1);

      // Security Seal Box
      y += 22;
      doc.setFillColor(255, 255, 255);
      doc.rect(15, y - 8, 105, 26, "F");
      doc.setDrawColor(180, 205, 190);
      doc.rect(15, y - 8, 105, 26, "S");
      doc.setTextColor(16, 120, 64);
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.text("✓ SECURITY DEPOSIT SECURED & SIGNED", 19, y);
      
      doc.setTextColor(100, 95, 90);
      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "normal");
      doc.text("Escrow state: PENDING CONFIRMATION", 19, y + 5);
      doc.text("This receipt is a legally binding hold token. Do not delete.", 19, y + 9);
      doc.text("Presented by Marco Polo Luxury Imports.", 19, y + 13);

      // Footer line
      doc.setDrawColor(210, 205, 195);
      doc.setLineWidth(0.3);
      doc.line(15, 276, 195, 276);
      doc.setFontSize(7);
      doc.setTextColor(130, 125, 120);
      doc.text("AUTHENTIC HAND-LOOMED ORIENTAL RUG HOLDING PLATFORM  •  SECURED CLIENT GATEWAY", 105, 281, { align: "center" });

      doc.save(`Receipt-${order.id}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      // Fallback to basic text file download if PDF rendering fails
      const text = `MARCO POLO ESCROW RECEIPT
Order Reference: ${order.id}
Total Secured: $${order.total.toLocaleString()}`;
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Receipt-${order.id}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  
};
