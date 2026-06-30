const fs = require('fs');
const file = 'components/public/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldAudioCode = `      try {
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
      }`;

const newAudioCode = `      try {
        const audio = new Audio("/coin.mp3");
        audio.play().catch(e => {
          console.error("Audio playback blocked by browser", e);
          // Fallback if browser blocks autoplay
          alert("💰 NEW ORDER RECEIVED! 💰 (Audio blocked by browser, please click anywhere on the page first)");
        });
      } catch (e) {
        console.error("Audio playback failed", e);
      }`;

if (content.includes(oldAudioCode)) {
  content = content.replace(oldAudioCode, newAudioCode);
  fs.writeFileSync(file, content);
  console.log("Replaced audio API with coin.mp3");
} else {
  console.log("Could not find old audio code");
}
