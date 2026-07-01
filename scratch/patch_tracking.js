const fs = require('fs');

const trackingFile = 'components/public/TrackingView.tsx';
let content = fs.readFileSync(trackingFile, 'utf8');

// 1. Update useStore variables
content = content.replace(
    'const { orders, cleaningBookings, sendChatMessage } = useStore();',
    'const { orders, cleaningBookings, sendChatMessage, shopProfile, logoUrl } = useStore();'
);

// 2. Add new states for recovery
content = content.replace(
    'const [searched, setSearched] = useState(false);',
    `const [searched, setSearched] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveredOrders, setRecoveredOrders] = useState<any[]>([]);`
);

// 3. Add handleRecovery function
content = content.replace(
    'const handleTrack = (e: React.FormEvent) => {',
    `const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const emailClean = recoveryEmail.trim().toLowerCase();
    const phoneClean = recoveryPhone.trim();
    
    if (!emailClean && !phoneClean) return;
    
    const found = orders.filter((o) => {
      const eMatch = emailClean && o.customerInfo?.email?.toLowerCase().includes(emailClean);
      const pMatch = phoneClean && o.customerInfo?.phone?.includes(phoneClean);
      return eMatch || pMatch;
    });
    
    setRecoveredOrders(found);
    setActiveOrder(null);
    setActiveCleaning(null);
  };
  
  const handleTrack = (e: React.FormEvent) => {`
);

// 4. Add "Lost your receipt?" UI under the form
const trackingFormUI = `        <form onSubmit={handleTrack} className="bg-white p-6 rounded-none border border-editorial-border shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4.5 w-4.5" />
            </div>
            <input
              type="text"
              required
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Order ID (e.g., MPR-49204)"
              className="w-full bg-editorial-aside border border-editorial-border rounded-none py-3.5 pl-11 pr-4 outline-none text-xs focus:border-editorial-accent text-editorial-text tracking-widest uppercase font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest rounded-none transition cursor-pointer text-xs"
          >
            Monitor Delivery
          </button>
        </form>`;

const replacementFormUI = `${trackingFormUI}

        <div className="text-center mt-2">
          <button 
            onClick={() => setShowRecovery(!showRecovery)}
            className="text-editorial-accent font-bold tracking-wider uppercase text-[10px] hover:underline"
          >
            Lost your receipt? Click here to find your order by Email or Phone.
          </button>
        </div>

        {showRecovery && (
          <form onSubmit={handleRecovery} className="bg-white p-6 rounded-none border border-editorial-border shadow-sm flex flex-col sm:flex-row gap-3 animate-fadeIn mt-2">
            <div className="relative flex-1">
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="Enter Email Address"
                className="w-full bg-editorial-aside border border-editorial-border rounded-none py-3.5 px-4 outline-none text-xs focus:border-editorial-accent text-editorial-text tracking-widest"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                placeholder="Or Phone Number"
                className="w-full bg-editorial-aside border border-editorial-border rounded-none py-3.5 px-4 outline-none text-xs focus:border-editorial-accent text-editorial-text tracking-widest"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-neutral-800 hover:bg-black text-white font-bold uppercase tracking-widest rounded-none transition cursor-pointer text-xs"
            >
              Find Orders
            </button>
          </form>
        )}
`;

content = content.replace(trackingFormUI, replacementFormUI);

// 5. Handle recovered orders list and the "Download Receipt" button inside the tracking result board
// For active order, we inject a "Download PDF" button right before the order statuses.
const activeOrderHeader = `<div className="flex items-center gap-2 mb-4">
                  <PackageCheck className="h-5 w-5 text-editorial-accent" />
                  <h3 className="font-serif text-xl font-light text-editorial-text">Order Invoice Log: <span className="font-bold">{activeOrder.id}</span></h3>
                </div>`;

const newActiveOrderHeader = `<div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-editorial-accent" />
                    <h3 className="font-serif text-xl font-light text-editorial-text">Order Invoice Log: <span className="font-bold">{activeOrder.id}</span></h3>
                  </div>
                  <button 
                    onClick={() => {
                      import('@/utils/pdf').then(({ generateAndDownloadReceiptPDF }) => {
                        generateAndDownloadReceiptPDF(activeOrder, shopProfile);
                      });
                    }}
                    className="px-4 py-2 bg-editorial-accent text-white hover:bg-[#8E7453] transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest rounded-none"
                  >
                    <FileText className="w-4 h-4" /> Download Official Receipt (PDF)
                  </button>
                </div>`;

content = content.replace(activeOrderHeader, newActiveOrderHeader);

// Now for recoveredOrders handling
const noResultsBlock = `{!activeOrder && !activeCleaning ? (
              <div className="bg-white p-10 rounded-none border border-editorial-border shadow-sm text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-editorial-accent/60 mx-auto" />
                <h3 className="font-serif text-base font-light text-editorial-text">Reference Number Not Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-light">
                  We could not locate a registered invoice or booking matching "{searchId.toUpperCase()}". Please verify the code on your success screen or contact concierge support.
                </p>
                <button
                  onClick={() => {
                    const lastOrder = orders[0];
                    if (lastOrder) {
                      setSearchId(lastOrder.id);
                      setSearched(false);
                    }
                  }}
                  className="px-4 py-2 mt-4 bg-editorial-aside text-editorial-text hover:bg-stone-200 font-bold uppercase tracking-widest text-[10px] transition-colors"
                >
                  Or View Demo Example
                </button>
              </div>
            ) : activeOrder ? (`;

const newNoResultsBlock = `{!activeOrder && !activeCleaning ? (
              <>
                {recoveredOrders.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-serif text-xl font-light text-editorial-text mb-4">Recovered Orders</h3>
                    {recoveredOrders.map((ro) => (
                      <div key={ro.id} className="bg-white p-6 rounded-none border border-editorial-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{new Date(ro.createdAt).toLocaleDateString()}</div>
                          <div className="font-bold text-base text-editorial-text">{ro.id}</div>
                          <div className="text-sm mt-1">{ro.cartItems?.length || 0} items - \${ro.total?.toLocaleString() || "0"}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSearchId(ro.id);
                              setActiveOrder(ro);
                              setRecoveredOrders([]);
                              setShowRecovery(false);
                            }}
                            className="px-4 py-2 bg-neutral-800 text-white hover:bg-black transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                          >
                            <Search className="w-3.5 h-3.5" /> View Tracking
                          </button>
                          <button
                            onClick={() => {
                              import('@/utils/pdf').then(({ generateAndDownloadReceiptPDF }) => {
                                generateAndDownloadReceiptPDF(ro, shopProfile);
                              });
                            }}
                            className="px-4 py-2 bg-editorial-accent text-white hover:bg-[#8E7453] transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                          >
                            <FileText className="w-3.5 h-3.5" /> Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-10 rounded-none border border-editorial-border shadow-sm text-center space-y-3">
                    <AlertCircle className="h-10 w-10 text-editorial-accent/60 mx-auto" />
                    <h3 className="font-serif text-base font-light text-editorial-text">Reference Not Found</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-light">
                      We could not locate a registered invoice or booking matching your entry. Please verify your details or contact concierge support.
                    </p>
                    <button
                      onClick={() => {
                        const lastOrder = orders[0];
                        if (lastOrder) {
                          setSearchId(lastOrder.id);
                          setSearched(false);
                        }
                      }}
                      className="px-4 py-2 mt-4 bg-editorial-aside text-editorial-text hover:bg-stone-200 font-bold uppercase tracking-widest text-[10px] transition-colors"
                    >
                      Or View Demo Example
                    </button>
                  </div>
                )}
              </>
            ) : activeOrder ? (`

content = content.replace(noResultsBlock, newNoResultsBlock);

fs.writeFileSync(trackingFile, content);
console.log("Patched TrackingView.tsx for Lost Receipt and PDF download");
