const fs = require('fs');
const file = 'app/(admin)/layout.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the specific {children} in the main-content div
const oldMainContent = `          <div className="main-content" style={{
            flex: 1,
            minHeight: '100vh',
            background: isPublicPage ? '#fff' : 'var(--bg-void)',
            width: '100%'
          }}>
            {children}
          </div>`;
          
const newMainContent = `          <div className="main-content" style={{
            flex: 1,
            minHeight: '100vh',
            background: isPublicPage ? '#fff' : 'var(--bg-void)',
            width: '100%'
          }}>
            <StoreProvider>
              {children}
            </StoreProvider>
          </div>`;

if (content.includes(oldMainContent)) {
  content = content.replace(oldMainContent, newMainContent);
  fs.writeFileSync(file, content);
  console.log("Successfully replaced main {children}");
} else {
  console.log("Could not find the target content.");
}
