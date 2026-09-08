const fs = require('fs');
const content = fs.readFileSync('components/ImageViewerModal.tsx', 'utf8');
const fixed = content
  .replace("    if (!isOpen || images.length === 0) return null;\n    return () => { document.body.style.overflow = 'auto'; };", "    return () => { document.body.style.overflow = 'auto'; };")
  .replace("    if (!isOpen || images.length === 0) return null;\n    return () => window.removeEventListener('keydown', handleKeyDown);", "    return () => window.removeEventListener('keydown', handleKeyDown);");
fs.writeFileSync('components/ImageViewerModal.tsx', fixed);
