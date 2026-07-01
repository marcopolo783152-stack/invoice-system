const fs = require('fs');

const adminFile = 'components/public/AdminDashboard.tsx';
let content = fs.readFileSync(adminFile, 'utf8');

// 1. Add audioEnabled state
content = content.replace(
    'const [activeTab, setActiveTab] = useState<"analytics" | "inventory" | "bulk_import" | "orders" | "cleaning" | "reviews" | "messages" | "blogs" | "promotions" | "settings">("analytics");',
    `const [activeTab, setActiveTab] = useState<"analytics" | "inventory" | "bulk_import" | "orders" | "cleaning" | "reviews" | "messages" | "blogs" | "promotions" | "settings">("analytics");
  const [audioEnabled, setAudioEnabled] = useState(false);`
);

// 2. Add Audio Enable Banner right inside the return div
content = content.replace(
    '<div className="bg-[#F9F7F5] min-h-screen font-sans text-xs text-editorial-text flex flex-col md:flex-row">',
    `<div className="bg-[#F9F7F5] min-h-screen font-sans text-xs text-editorial-text flex flex-col md:flex-row">
        
        {/* Audio Autoplay Override Banner */}
        {!audioEnabled && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white p-3 flex flex-col sm:flex-row items-center justify-center gap-4 shadow-md animate-fadeIn">
            <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Audio alerts are currently muted by your browser.
            </span>
            <button 
              onClick={() => {
                const audio = new Audio("/coin.mp3");
                audio.play().then(() => {
                  setAudioEnabled(true);
                }).catch(e => {
                  console.error("Audio unlock failed", e);
                  setAudioEnabled(true); // Hide it anyway if they at least tried to click
                });
              }}
              className="px-4 py-1.5 bg-white text-amber-700 font-bold uppercase tracking-widest text-xs hover:bg-amber-50 transition-colors"
            >
              Enable Order Notification Sound
            </button>
          </div>
        )}`
);

fs.writeFileSync(adminFile, content);
console.log("Patched AdminDashboard.tsx for Audio Enable Banner");
