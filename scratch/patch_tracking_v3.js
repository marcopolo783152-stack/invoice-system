const fs = require('fs');

const trackingFile = 'components/public/TrackingView.tsx';
let content = fs.readFileSync(trackingFile, 'utf8');

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

// 4. Inject Cancel button next to Download Receipt
// We have two places: activeOrder (single) and recoveredOrders (map)
// We already replaced the "downloadReceiptAsPDF" earlier, wait I git check-outed, so the PDF logic isn't there anymore!
// Ah! Wait, if I restored it via git checkout, the `import { generateAndDownloadReceiptPDF }` might be missing!
