const fs = require('fs');
let content = fs.readFileSync('app/(public)/layout.tsx', 'utf8');
content = content.replace(
  "const docSnap = await getDoc(doc(db, 'showroom_settings', 'live_website_content'));",
  "const docSnap = db ? await getDoc(doc(db, 'showroom_settings', 'live_website_content')) : null;"
).replace(
  "if (docSnap.exists()) {",
  "if (docSnap && docSnap.exists()) {"
);
fs.writeFileSync('app/(public)/layout.tsx', content);
