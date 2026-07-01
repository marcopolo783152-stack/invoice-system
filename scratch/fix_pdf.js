const fs = require('fs');

const cartFile = 'components/public/CartView.tsx';
const cartContent = fs.readFileSync(cartFile, 'utf8');

const startStr = 'const downloadReceiptAsPDF = (order: any) => {';
const startIdx = cartContent.indexOf(startStr);
const endStr = '  const handlePrint = (order: any) => {';
const endIdx = cartContent.indexOf(endStr, startIdx);

const funcBody = cartContent.substring(startIdx, endIdx).trim();

const newUtilContent = `import { jsPDF } from "jspdf";

export const generateAndDownloadReceiptPDF = (order: any, shopProfile: any) => {
${funcBody.replace('const downloadReceiptAsPDF = (order: any) => {', '').replace(/}$/, '')}
};
`;

fs.writeFileSync('utils/pdf.ts', newUtilContent);
console.log("Fixed utils/pdf.ts");
