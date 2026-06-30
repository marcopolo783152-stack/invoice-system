const fs = require('fs');

const file = 'components/public/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const orderNotificationCode = `  // Order notification alert
  const prevOrdersCount = useRef(-1);
  useEffect(() => {
    if (prevOrdersCount.current !== -1 && orders.length > prevOrdersCount.current) {
      // Play a mario coin sound using the Web Audio API!
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.type = 'sine';
          
          // Start at B5
          oscillator.frequency.setValueAtTime(987.77, audioCtx.currentTime);
          // Jump to E6
          oscillator.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.5);
        }
      } catch (e) {
        console.error("Audio playback failed", e);
      }
      
      // Also show a temporary visual toast or alert
      // We will use a standard alert for now, similar to the review one.
      // alert("💰 NEW ORDER RECEIVED! 💰"); // commented out so we don't block the audio thread, audio alone is enough or we could use custom toast
    }
    prevOrdersCount.current = orders.length;
  }, [orders.length]);

`;

const hookTarget = `  const prevUnapprovedCount = useRef(unapprovedReviewsCount);`;

if (content.includes(hookTarget) && !content.includes('prevOrdersCount.current')) {
  content = content.replace(hookTarget, orderNotificationCode + hookTarget);
  fs.writeFileSync(file, content);
  console.log("Successfully injected order audio notification!");
} else {
  console.log("Could not find the target hook or already injected.");
}
