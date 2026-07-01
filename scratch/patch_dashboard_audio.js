const fs = require('fs');

const routeFile = 'components/public/AdminDashboard.tsx';
let content = fs.readFileSync(routeFile, 'utf8').replace(/\r\n/g, '\n');

const targetEffect = `  useEffect(() => {
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
              alert("🔔🔔 NEW ORDER RECEIVED! 🔔🔔 (Audio blocked by browser, please click anywhere on the page first)");
            });
          }
          await setDoc(prefRef, { lastSeenOrderTime: latestOrderTime }, { merge: true });
        }
      } catch (err) {
        console.error("Failed to check order preferences", err);
      }
    };
    
    checkAndRing();
  }, [orders]);`;

const replacementEffect = `  const localLastSeenOrder = useRef<number>(0);
  useEffect(() => {
    if (orders.length === 0) return;

    const latestOrderTime = Math.max(...orders.map(o => new Date(o.createdAt).getTime()));
    
    // If this is the very first time the dashboard loads, just set the time silently
    if (localLastSeenOrder.current === 0) {
      localLastSeenOrder.current = latestOrderTime;
      return;
    }
    
    // If a brand new order arrives, play the sound locally on THIS device
    if (latestOrderTime > localLastSeenOrder.current) {
      localLastSeenOrder.current = latestOrderTime;
      
      const audio = new Audio("/coin.mp3");
      audio.play().catch(e => {
        console.error("Audio playback blocked by browser", e);
        // Browsers block auto-playing audio unless the user has clicked somewhere on the page first.
        alert("🔔🔔 NEW ORDER RECEIVED! 🔔🔔 (Audio blocked by browser, please click anywhere on the page first)");
      });
    }
  }, [orders]);`;

if (content.includes(targetEffect)) {
    content = content.replace(targetEffect, replacementEffect);
    fs.writeFileSync(routeFile, content);
    console.log('Successfully updated order notification logic for multi-device support');
} else {
    console.log('Could not find target effect');
}
