const fs = require('fs');

const pageFile = 'app/(public)/page.tsx';
let content = fs.readFileSync(pageFile, 'utf8').replace(/\r\n/g, '\n');

if (!content.includes('new URLSearchParams(window.location.search)')) {
  // Add useEffect to the imports if missing
  if (!content.includes('import React, { useState, useEffect }')) {
    content = content.replace('import React, { useState }', 'import React, { useState, useEffect }');
  }

  // Inject useEffect after useState
  const hookInject = `  const [selectedRugId, setSelectedRugId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("track")) {
        setCurrentTab("track");
      }
    }
  }, []);`;
  content = content.replace('  const [selectedRugId, setSelectedRugId] = useState<string | null>(null);', hookInject);
  fs.writeFileSync(pageFile, content);
  console.log('Patched page.tsx for query routing');
}
