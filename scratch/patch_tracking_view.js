const fs = require('fs');

const trackFile = 'components/public/TrackingView.tsx';
let content = fs.readFileSync(trackFile, 'utf8').replace(/\r\n/g, '\n');

if (!content.includes('new URLSearchParams(window.location.search)')) {
  // Add useEffect to TrackingView imports
  if (!content.includes('import React, { useState, useEffect }')) {
    content = content.replace('import React, { useState }', 'import React, { useState, useEffect }');
  }

  const hookInject = `  const [recoveredOrders, setRecoveredOrders] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && orders && orders.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const trackId = urlParams.get("track");
      if (trackId && !searched) {
        setSearchId(trackId);
        setSearched(true);
        const idClean = trackId.trim().toUpperCase();
        const foundOrder = orders.find((o: any) => o.id === idClean);
        const foundCleaning = cleaningBookings.find((b: any) => b.id === idClean);
        setActiveOrder(foundOrder || null);
        setActiveCleaning(foundCleaning || null);
      }
    }
  }, [orders, cleaningBookings, searched]);`;

  content = content.replace('  const [recoveredOrders, setRecoveredOrders] = useState<any[]>([]);', hookInject);
  fs.writeFileSync(trackFile, content);
  console.log('Patched TrackingView.tsx to read URL parameter');
}
