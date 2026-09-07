const fs = require('fs');
let content = fs.readFileSync('app/(public)/services/page.tsx', 'utf8');

const moreKeywords = "rug cleaning Alexandria VA, persian rug washing, oriental rug repair near me, pet stain removal for rugs, fringe replacement, antique rug restoration, moth treatment for wool rugs, water damaged rug repair, color run correction, custom rug pads";

content = content.replace(
  /alternates: \{/,
  `keywords: '${moreKeywords}',\n  alternates: {`
);

fs.writeFileSync('app/(public)/services/page.tsx', content);
