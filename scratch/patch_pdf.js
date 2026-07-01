const fs = require('fs');

const file = 'utils/pdf.ts';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// Replace unicode bullet points
content = content.replace(/EXOTIC ORIENTAL RUGS & TAPESTRIES.*OFFICIAL RECEIPT/, "EXOTIC ORIENTAL RUGS & TAPESTRIES  ---  OFFICIAL RECEIPT");
content = content.replace(/\.filter\(Boolean\)\.join\(".*"\)/, '.filter(Boolean).join("  ---  ")');

// Replace unconditional loadImage with conditional
const loadImgTarget = `      // Try to add shop logo (via Next.js proxy to avoid canvas CORS)
      try {
        const img = await loadImage(\`/api/proxy-image?url=\${encodeURIComponent(logoUrl)}\`);
        // Adjust logo position and size
        const logoSize = 25;
        doc.addImage(img, "PNG", 12, 10, logoSize, logoSize);
      } catch (e) {
        console.warn("Could not load logo for PDF:", e);
      }`;

const loadImgReplacement = `      // Try to add shop logo (via Next.js proxy to avoid canvas CORS)
      if (logoUrl) {
        try {
          const img = await loadImage(\`/api/proxy-image?url=\${encodeURIComponent(logoUrl)}\`);
          // Adjust logo position and size
          const logoSize = 25;
          doc.addImage(img, "PNG", 12, 10, logoSize, logoSize);
        } catch (e) {
          console.warn("Could not load logo for PDF:", e);
        }
      }`;

if (content.includes(loadImgTarget)) {
    content = content.replace(loadImgTarget, loadImgReplacement);
}

fs.writeFileSync(file, content);
console.log('Fixed pdf.ts unicode and logo load logic');
