const fs = require('fs');

const trackingFile = 'components/public/TrackingView.tsx';
let content = fs.readFileSync(trackingFile, 'utf8').replace(/\r\n/g, '\n');

// 1. Ensure useStore includes updateOrderStatus
if (!content.includes('updateOrderStatus')) {
    content = content.replace(
        'const { orders, cleaningBookings, sendChatMessage, shopProfile, logoUrl } = useStore();',
        'const { orders, cleaningBookings, sendChatMessage, shopProfile, logoUrl, updateOrderStatus } = useStore();'
    );
}

// 2. Add handleCancelOrder
const cancelFunc = `
  const handleCancelOrder = (orderId: string) => {
    if (confirm("Are you sure you want to cancel this order? This cannot be undone.")) {
      updateOrderStatus(orderId, "Cancelled");
      setActiveOrder((prev: any) => prev && prev.id === orderId ? { ...prev, status: "Cancelled" } : prev);
      setRecoveredOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "Cancelled" } : o));
      alert("Your order has been cancelled.");
    }
  };
`;
if (!content.includes('handleCancelOrder')) {
    content = content.replace(
        'const handleContactSupport = () => {',
        cancelFunc + '\n  const handleContactSupport = () => {'
    );
}

// 3. Inject Recovery UI after "Monitor Delivery" button
const searchFormEnd = `        </form>

        {/* --- TRACKING RESULT BOARD --- */}`;
const recoveryUI = `        </form>

        <div className="text-center mt-2">
          <button 
            type="button"
            onClick={() => setShowRecovery(!showRecovery)}
            className="text-editorial-accent font-bold tracking-wider uppercase text-[10px] hover:underline cursor-pointer"
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

        {/* --- TRACKING RESULT BOARD --- */}`;
if (!content.includes('Lost your receipt?')) {
    content = content.replace(searchFormEnd, recoveryUI);
}

// 4. Inject generateAndDownloadReceiptPDF import
if (!content.includes('generateAndDownloadReceiptPDF')) {
    content = content.replace(
        'import { Search, Compass, Truck, ShieldCheck, ClipboardCheck, PackageCheck, AlertCircle, ShoppingBag, MapPin, Send } from "lucide-react";',
        'import { Search, Compass, Truck, ShieldCheck, ClipboardCheck, PackageCheck, AlertCircle, ShoppingBag, MapPin, Send } from "lucide-react";\nimport { generateAndDownloadReceiptPDF } from "@/utils/pdf";'
    );
}

// 5. Inject PDF and Cancel buttons to activeOrder
const oldActionButtons = `                  <button 
                    onClick={handleContactSupport}
                    className="w-full sm:w-auto px-6 py-3 bg-neutral-900 hover:bg-black text-white font-bold uppercase tracking-widest text-[10px] rounded-none transition"
                  >
                    Contact Support
                  </button>`;
const newActionButtons = `                  <button 
                    onClick={handleContactSupport}
                    className="w-full sm:w-auto px-6 py-3 bg-neutral-900 hover:bg-black text-white font-bold uppercase tracking-widest text-[10px] rounded-none transition cursor-pointer"
                  >
                    Contact Support
                  </button>
                  <button 
                    onClick={() => generateAndDownloadReceiptPDF(activeOrder, shopProfile)}
                    className="w-full sm:w-auto px-6 py-3 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-[10px] rounded-none transition cursor-pointer"
                  >
                    Download Official Receipt (PDF)
                  </button>
                  {activeOrder.status === "Pending" && (
                    <button 
                      onClick={() => handleCancelOrder(activeOrder.id)}
                      className="w-full sm:w-auto px-6 py-3 bg-red-800 hover:bg-red-900 text-white font-bold uppercase tracking-widest text-[10px] rounded-none transition cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  )}`;
if (!content.includes('generateAndDownloadReceiptPDF(activeOrder')) {
    content = content.replace(oldActionButtons, newActionButtons);
}

// 6. Add Recovered Orders renderer
const recoveredOrdersBlock = `            {!activeOrder && !activeCleaning && recoveredOrders.length > 0 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-white p-6 border border-editorial-border shadow-sm">
                  <h3 className="font-serif text-lg text-editorial-text border-b border-editorial-border pb-3 mb-4">Found {recoveredOrders.length} Order(s)</h3>
                  <div className="space-y-4">
                    {recoveredOrders.map((ro) => (
                      <div key={ro.id} className="p-4 border border-editorial-border bg-editorial-aside flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="font-mono text-xs font-bold text-editorial-text">Order: {ro.id}</p>
                          <p className="text-xs text-gray-500 mt-1">Status: {ro.status}</p>
                          <p className="text-xs text-gray-500">Date: {new Date(ro.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <button 
                            onClick={() => {
                              setSearchId(ro.id);
                              setActiveOrder(ro);
                              setRecoveredOrders([]);
                            }}
                            className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest transition cursor-pointer"
                          >
                            View Details
                          </button>
                          <button 
                            onClick={() => generateAndDownloadReceiptPDF(ro, shopProfile)}
                            className="px-4 py-2 bg-editorial-accent hover:bg-[#8E7453] text-white text-[10px] font-bold uppercase tracking-widest transition cursor-pointer"
                          >
                            Download PDF
                          </button>
                          {ro.status === "Pending" && (
                            <button 
                              onClick={() => handleCancelOrder(ro.id)}
                              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-[10px] font-bold uppercase tracking-widest transition cursor-pointer"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!activeOrder && !activeCleaning && recoveredOrders.length === 0 ? (`;

const oldNotFoundBlock = `            {!activeOrder && !activeCleaning ? (`

if (!content.includes('recoveredOrders.length > 0')) {
    content = content.replace(oldNotFoundBlock, recoveredOrdersBlock);
}

fs.writeFileSync(trackingFile, content);
console.log("TrackingView patched successfully with CRLF normalization.");
