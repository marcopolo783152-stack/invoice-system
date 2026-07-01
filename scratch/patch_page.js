const fs = require('fs');

const pageFile = 'app/(public)/page.tsx';
let content = fs.readFileSync(pageFile, 'utf8');

// 1. Modify the states in AppContent
const stateDecl = `  const [currentTab, setCurrentTab] = useState("home");
  const [selectedRugId, setSelectedRugId] = useState<string | null>(null);`;

const newStateDecl = `  const [currentTab, setCurrentTabState] = useState("home");
  const [selectedRugId, setSelectedRugIdState] = useState<string | null>(null);

  // Initialize from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      const rugId = params.get("rugId");
      if (tab) setCurrentTabState(tab);
      if (rugId) setSelectedRugIdState(rugId);
    }
  }, []);

  const setCurrentTab = (tab: string) => {
    setCurrentTabState(tab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      if (tab !== "shop") params.delete("rugId");
      window.history.pushState(null, "", "?" + params.toString());
    }
  };

  const setSelectedRugId = (id: string | null) => {
    setSelectedRugIdState(id);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (id) {
        params.set("rugId", id);
        params.set("tab", "shop");
        setCurrentTabState("shop");
      } else {
        params.delete("rugId");
      }
      window.history.pushState(null, "", "?" + params.toString());
    }
  };`;

content = content.replace(stateDecl, newStateDecl);

// Add useEffect import if not present
if (!content.includes('import React, { useState, useEffect }')) {
    content = content.replace('import React, { useState }', 'import React, { useState, useEffect }');
}

fs.writeFileSync(pageFile, content);
console.log("Patched page.tsx for URL state persistence");
