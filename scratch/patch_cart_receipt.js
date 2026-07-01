const fs = require('fs');
const file = 'components/public/CartView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Destructure shopProfile and logoUrl
content = content.replace(
`    checkout,
    promoCodes
  } = useStore();`,
`    checkout,
    promoCodes,
    shopProfile,
    logoUrl
  } = useStore();`
);

// 2. Update PDF Generation
const oldPdfHeader = `      // Title header
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text("MARCO POLO", 105, 22, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(215, 195, 175);
      doc.text("EXOTIC ORIENTAL RUGS & TAPESTRIES  •  OFFICIAL RECEIPT", 105, 30, { align: "center" });`;

const newPdfHeader = `      // Title header
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
      
      doc.text(shopDetails, 105, 26, { align: "center", lineHeightFactor: 1.5 });`;

if (content.includes(oldPdfHeader)) {
  content = content.replace(oldPdfHeader, newPdfHeader);
  console.log("Updated PDF Header");
} else {
  console.log("Could not find PDF Header");
}

// 3. Update Success UI Banner and Remove "Next Action" string
const oldUiSection = `                {/* Tracking ID Badge */}
                <div className="p-5 border border-editorial-border rounded-none bg-editorial-aside max-w-sm mx-auto space-y-3 text-left">
                  <div className="flex items-center justify-between border-b border-editorial-border pb-2 text-xs">
                    <span className="text-gray-400 font-semibold uppercase tracking-wider">Tracking Reference</span>
                    <span className="font-mono font-bold text-editorial-accent text-sm">{createdOrder.id}</span>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-500 leading-relaxed font-light">
                    <p>• <strong>Status:</strong> <span className="px-2 py-0.5 bg-editorial-bg text-editorial-accent border border-editorial-border text-sm font-bold uppercase">Pending Confirmation</span></p>
                    <p>• <strong>Consignee:</strong> {createdOrder.customerInfo.name}</p>
                    <p>• <strong>Settlement Sum:</strong> \${createdOrder.total.toLocaleString()}</p>
                    <p>• <strong>Next Action:</strong> Switch your workspace profile to the <strong>Admin Panel</strong> in the header menu to review, confirm, prepare, and ship this order!</p>
                  </div>
                </div>`;

const newUiSection = `                {/* Shop Details & Tracking ID Badge */}
                <div className="p-5 border border-editorial-border rounded-none bg-editorial-aside max-w-sm mx-auto space-y-4 text-left">
                  <div className="flex flex-col items-center justify-center text-center space-y-2 pb-4 border-b border-editorial-border">
                    {logoUrl && (
                      <img src={logoUrl} alt="Shop Logo" className="h-12 w-auto object-contain" />
                    )}
                    <div>
                      <h4 className="font-serif font-bold text-editorial-text">{shopProfile?.name || "Marco Polo"}</h4>
                      <p className="text-xs text-gray-500 mt-1">{shopProfile?.address}</p>
                      <p className="text-xs text-gray-500">{shopProfile?.phone} • {shopProfile?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pb-2 text-xs">
                    <span className="text-gray-400 font-semibold uppercase tracking-wider">Tracking Reference</span>
                    <span className="font-mono font-bold text-editorial-accent text-sm">{createdOrder.id}</span>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-500 leading-relaxed font-light">
                    <p>• <strong>Status:</strong> <span className="px-2 py-0.5 bg-editorial-bg text-editorial-accent border border-editorial-border text-sm font-bold uppercase">Pending Confirmation</span></p>
                    <p>• <strong>Consignee:</strong> {createdOrder.customerInfo.name}</p>
                    <p>• <strong>Settlement Sum:</strong> \${createdOrder.total.toLocaleString()}</p>
                  </div>
                </div>`;

if (content.includes(oldUiSection)) {
  content = content.replace(oldUiSection, newUiSection);
  console.log("Updated UI Section");
} else {
  console.log("Could not find UI Section");
}

fs.writeFileSync(file, content);
console.log("Done");
