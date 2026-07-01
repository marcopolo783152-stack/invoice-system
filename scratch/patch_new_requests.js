const fs = require('fs');

// Patch 1: AdminDashboard.tsx (Replace localStorage with Firebase)
const adminFile = 'components/public/AdminDashboard.tsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');

const oldAdminEffect = `    useEffect(() => {
      if (orders.length === 0) return;
  
      const latestOrderTime = Math.max(...orders.map(o => new Date(o.createdAt).getTime()));
      const lastSeenTimeStr = localStorage.getItem("marcopolo_last_order_time");
      const lastSeenTime = lastSeenTimeStr ? parseInt(lastSeenTimeStr) : 0;
  
      if (latestOrderTime > lastSeenTime) {
        // Play a coin sound using the Web Audio API
        if (lastSeenTime > 0) { // Don't ring on the very first time they ever use the system, but ring if there are actually new orders since last time
          try {
            const audio = new Audio("/coin.mp3");
            audio.play().catch(e => {
              console.error("Audio playback blocked by browser", e);
              // Fallback if browser blocks autoplay
              alert("🛎️ NEW ORDER RECEIVED! 🛎️ (Audio blocked by browser, please click anywhere on the page first)");
            });
          } catch (e) {
            console.error("Audio playback failed", e);
          }
        }
        
        // Update the last seen time
        localStorage.setItem("marcopolo_last_order_time", latestOrderTime.toString());
      }
    }, [orders]);`;

const newAdminEffect = `    useEffect(() => {
      if (orders.length === 0) return;
  
      const latestOrderTime = Math.max(...orders.map(o => new Date(o.createdAt).getTime()));
      
      const checkAndRing = async () => {
        try {
          const { db } = await import("@/lib/firebase");
          const { doc, getDoc, setDoc } = await import("firebase/firestore");
          const { SHOWROOM_SETTINGS } = await import("@/lib/showroom-firebase");
          if (!db) return;
          
          const prefRef = doc(db, SHOWROOM_SETTINGS, "admin_preferences");
          const prefSnap = await getDoc(prefRef);
          const lastSeenTime = prefSnap.exists() && prefSnap.data().lastSeenOrderTime ? prefSnap.data().lastSeenOrderTime : 0;
          
          if (latestOrderTime > lastSeenTime) {
            if (lastSeenTime > 0) {
              const audio = new Audio("/coin.mp3");
              audio.play().catch(e => {
                console.error("Audio playback blocked by browser", e);
                alert("🛎️ NEW ORDER RECEIVED! 🛎️ (Audio blocked by browser, please click anywhere on the page first)");
              });
            }
            await setDoc(prefRef, { lastSeenOrderTime: latestOrderTime }, { merge: true });
          }
        } catch (err) {
          console.error("Firebase admin_preferences error", err);
        }
      };
      
      checkAndRing();
    }, [orders]);`;

if (adminContent.includes(oldAdminEffect)) {
    adminContent = adminContent.replace(oldAdminEffect, newAdminEffect);
    fs.writeFileSync(adminFile, adminContent);
    console.log("Patched AdminDashboard.tsx");
} else {
    console.log("Could not find AdminDashboard.tsx effect to replace");
}

// Patch 2: CartView.tsx (Split shippingAddress into 5 fields)
const cartFile = 'components/public/CartView.tsx';
let cartContent = fs.readFileSync(cartFile, 'utf8');

cartContent = cartContent.replace(
    'const [shippingAddress, setShippingAddress] = useState("");',
    `const [shippingStreet, setShippingStreet] = useState("");
  const [shippingApt, setShippingApt] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const derivedShippingAddress = deliveryOption === "Pickup"
    ? "Alexandria Showroom Pickup: 3260 Duke St, Alexandria, VA 22314"
    : \`\${shippingStreet} \${shippingApt ? "Apt/Suite " + shippingApt : ""}, \${shippingCity}, \${shippingState} \${shippingZip}\`.trim();`
);

cartContent = cartContent.replace(
    'setBillingAddress(shippingAddress);',
    'setBillingAddress(derivedShippingAddress);'
);

cartContent = cartContent.replace(
    'if (!name || !phone || !email || !shippingAddress) return;',
    'if (!name || !phone || !email || (!shippingStreet || !shippingCity || !shippingState || !shippingZip) && deliveryOption === "Delivery") return;'
);

cartContent = cartContent.replace(
    'shippingAddress,',
    'shippingAddress: derivedShippingAddress,'
);

const oldAddressUI = `                      <div className="space-y-1 animate-fadeIn">
                        <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Physical Shipping Address *</label>
                        <input
                          type="text"
                          required
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="783 Park Avenue, Apt 14B, New York NY"
                          className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent"
                        />
                        <p className="text-sm text-gray-400 mt-1">
                          Est. total shipping weight: <strong>{totalWeightLbs.toFixed(1)} lbs</strong>. Shipping cost applies: {totalWeightLbs <= 1.9 ? "$8 (under 2 lbs)" : totalWeightLbs >= 2 && totalWeightLbs <= 5 ? "$16 (2-5 lbs)" : "$45 (premium insured)"}.
                        </p>
                      </div>`;

const newAddressUI = `                      <div className="space-y-3 animate-fadeIn">
                        <div>
                          <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Street Address *</label>
                          <input type="text" required value={shippingStreet} onChange={(e) => setShippingStreet(e.target.value)} placeholder="783 Park Avenue" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                        </div>
                        <div>
                          <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Apt, Suite, Bldg (optional)</label>
                          <input type="text" value={shippingApt} onChange={(e) => setShippingApt(e.target.value)} placeholder="Apt 14B" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">City *</label>
                            <input type="text" required value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="New York" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">State *</label>
                              <input type="text" required value={shippingState} onChange={(e) => setShippingState(e.target.value)} placeholder="NY" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                            </div>
                            <div>
                              <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Zip *</label>
                              <input type="text" required value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} placeholder="10021" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          Est. total shipping weight: <strong>{totalWeightLbs.toFixed(1)} lbs</strong>. Shipping cost applies: {totalWeightLbs <= 1.9 ? "$8 (under 2 lbs)" : totalWeightLbs >= 2 && totalWeightLbs <= 5 ? "$16 (2-5 lbs)" : "$45 (premium insured)"}.
                        </p>
                      </div>`;

if (cartContent.includes(oldAddressUI)) {
    cartContent = cartContent.replace(oldAddressUI, newAddressUI);
} else {
    console.log("Could not find CartView UI to replace");
}

cartContent = cartContent.replace(
    'setShippingAddress("");',
    'setShippingStreet(""); setShippingApt(""); setShippingCity(""); setShippingState(""); setShippingZip("");'
);
cartContent = cartContent.replace(
    'setShippingAddress("Alexandria Showroom Pickup: 3260 Duke St, Alexandria, VA 22314");',
    '// Delivery option set to pickup, derived address handles it automatically.'
);

cartContent = cartContent.replace(
    'disabled={!name || !phone || !email || !shippingAddress}',
    'disabled={!name || !phone || !email || ((!shippingStreet || !shippingCity || !shippingState || !shippingZip) && deliveryOption === "Delivery")}'
);

fs.writeFileSync(cartFile, cartContent);
console.log("Patched CartView.tsx");
