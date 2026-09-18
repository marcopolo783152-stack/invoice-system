// One inactivity clock shared by same-account tabs. Firebase remains the authority.
export function monitorStaffIdle({win, userId, timeoutMs, onExpire, now = Date.now}) {
  const key = `marcopolo-staff-activity:${userId}`;
  let last = now(), stopped = false;
  const read = () => { try { const value = Number(win.localStorage.getItem(key)); if (value > last && value <= now()) last = value; } catch {} };
  const record = () => { last = now(); try { win.localStorage.setItem(key, String(last)); } catch {} };
  const check = () => {
    if (stopped) return;
    read();
    if (now() - last >= timeoutMs) { stopped = true; onExpire(); }
  };
  const activity = () => { check(); if (!stopped && now() - last >= 1000) record(); };
  record();
  const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => win.addEventListener(event, activity, {passive:true, capture:true}));
  win.addEventListener('focus', check);
  win.addEventListener('storage', read);
  const timer = win.setInterval(check, 15000);
  return () => {
    stopped = true;
    win.clearInterval(timer);
    events.forEach(event => win.removeEventListener(event, activity, true));
    win.removeEventListener('focus', check);
    win.removeEventListener('storage', read);
  };
}
