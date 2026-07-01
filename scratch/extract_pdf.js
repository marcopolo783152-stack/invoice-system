const fs = require('fs');

const cartFile = 'components/public/CartView.tsx';
let cartContent = fs.readFileSync(cartFile, 'utf8');

const startStr = 'const downloadReceiptAsPDF = (order: any) => {';
const startIdx = cartContent.indexOf(startStr);

const endStr = `        document.body.removeChild(a);
      }
    }
  };`;
const endIdx = cartContent.indexOf(endStr, startIdx) + endStr.length;

if (startIdx === -1 || endIdx < startIdx) {
    console.error("Could not find the function block exactly");
    process.exit(1);
}

const funcBody = cartContent.substring(startIdx, endIdx);

const newUtilContent = `import { jsPDF } from "jspdf";

export const generateAndDownloadReceiptPDF = (order: any, shopProfile: any) => {
${funcBody.replace('const downloadReceiptAsPDF = (order: any) => {', '').slice(0, -1)}
};
`;

fs.writeFileSync('utils/pdf.ts', newUtilContent);
console.log("Created utils/pdf.ts");

const newCartCall = `const downloadReceiptAsPDF = (order: any) => {
    import("@/utils/pdf").then(({ generateAndDownloadReceiptPDF }) => {
      generateAndDownloadReceiptPDF(order, shopProfile);
    });
  };`;

cartContent = cartContent.substring(0, startIdx) + newCartCall + cartContent.substring(endIdx);
fs.writeFileSync(cartFile, cartContent);
console.log("Updated CartView.tsx");
