const fs = require('fs');
let content = fs.readFileSync('app/(public)/page.tsx', 'utf8');
content = content.replace(
`    setSelectedRugIdState(id);
    if (typeof window !== "undefined") {
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();`,
`    setSelectedRugIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        window.history.pushState({}, "", \`/shop/\${id}\`);
      } else {
        window.history.pushState({}, "", \`/\`);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();`
);
fs.writeFileSync('app/(public)/page.tsx', content);
