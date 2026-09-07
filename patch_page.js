const fs = require('fs');
let content = fs.readFileSync('app/(public)/page.tsx', 'utf8');

content = content.replace(
`      {/* Luxury sticky Header Navigation bar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />`,
`      {/* CMS PROMO BANNER */}
      {websiteContent?.announcement_text && (
        <div className="bg-neutral-900 text-white text-center py-2 px-4 text-xs font-bold uppercase tracking-widest relative z-50">
          {websiteContent?.announcement_link ? (
            <a href={websiteContent.announcement_link} className="hover:text-editorial-accent transition-colors">
              {websiteContent.announcement_text}
            </a>
          ) : (
            <span>{websiteContent.announcement_text}</span>
          )}
        </div>
      )}

      {/* Luxury sticky Header Navigation bar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />`
);

fs.writeFileSync('app/(public)/page.tsx', content);
