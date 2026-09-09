const fs = require('fs');
const file = 'app/(public)/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `{currentTab === "home" && (
          <Hero 
            onSelectRugId={(id) => {
              setSelectedRugId(id);
              setCurrentTab("shop");
            }} 
            setCurrentTab={setCurrentTab}
          />
        )}`;

const replacement = `{currentTab === "home" && (
          <DynamicPageRenderer 
            slug="home" 
            fallback={
              <Hero 
                onSelectRugId={(id) => {
                  setSelectedRugId(id);
                  setCurrentTab("shop");
                }} 
                setCurrentTab={setCurrentTab}
              />
            } 
          />
        )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
