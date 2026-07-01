const fs = require('fs');

const pdfFile = 'utils/pdf.ts';
let pdfContent = fs.readFileSync(pdfFile, 'utf8');

const target = `      if (logoUrl) {
        try {
          const img = await loadImage(logoUrl);`;

const replacement = `      if (logoUrl) {
        try {
          const proxiedUrl = \`/api/proxy-image?url=\${encodeURIComponent(logoUrl)}\`;
          const img = await loadImage(proxiedUrl);`;

pdfContent = pdfContent.replace(target, replacement);

fs.writeFileSync(pdfFile, pdfContent);
console.log('pdf.ts patched with proxy');
