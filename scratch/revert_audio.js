const fs = require('fs');

const routeFile = 'components/public/AdminDashboard.tsx';
let content = fs.readFileSync(routeFile, 'utf8').replace(/\r\n/g, '\n');

const currentEffect = `  const localLastSeenOrder = useRef<number>(0);
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
        alert("\uD83D\uDD14\uD83D\uDD14 NEW ORDER RECEIVED! \uD83D\uDD14\uD83D\uDD14 (Audio blocked by browser, please click anywhere on the page first)");
      });
    }
  }, [orders]);`;

const oldEffect = `  useEffect(() => {
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
              alert("\uD83D\uDECE\uFE0F NEW ORDER RECEIVED! \uD83D\uDECE\uFE0F (Audio blocked by browser, please click anywhere on the page first)");
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

if (content.includes('const localLastSeenOrder = useRef')) {
    // Regex replace to handle any whitespace differences
    const regex = /const localLastSeenOrder = useRef<number>\(0\);[\s\S]*?}, \[orders\]\);/;
    content = content.replace(regex, oldEffect);
    fs.writeFileSync(routeFile, content);
    console.log('Successfully reverted order notification logic to original firebase implementation');
} else {
    console.log('Could not find current effect');
}
