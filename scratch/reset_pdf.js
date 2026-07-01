const { execSync } = require('child_process');
const fs = require('fs');

const originalCart = execSync('git show HEAD:components/public/CartView.tsx', { encoding: 'utf8' });

const startStr = 'const downloadReceiptAsPDF = (order: any) => {';
const startIdx = originalCart.indexOf(startStr);
const endStr = '  const handlePrint = (order: any) => {';
const endIdx = originalCart.indexOf(endStr, startIdx);

let funcBody = originalCart.substring(startIdx, endIdx).trim();
funcBody = funcBody.replace('const downloadReceiptAsPDF = (order: any) => {', '').trim();
// removing trailing "};"
if (funcBody.endsWith('};')) {
    funcBody = funcBody.slice(0, -2);
}

const newUtilContent = `import { jsPDF } from "jspdf";

export const generateAndDownloadReceiptPDF = (order: any, shopProfile: any) => {
${funcBody}
};
`;

fs.writeFileSync('utils/pdf.ts', newUtilContent);
console.log("Completely reset utils/pdf.ts");
