import {Auth, onAuthStateChanged, signOut} from 'firebase/auth';
import {monitorStaffIdle} from './staff-idle.mjs';
import {STAFF_INACTIVITY_TIMEOUT_MS} from './session-policy';

// One session guard shared by every authenticated showroom and invoice route.
export function installBrowserSession(auth: Auth) {
  let cleanup = () => {}, previousUid = '';
  onAuthStateChanged(auth, user => {
    cleanup(); cleanup = () => {};
    if (previousUid && (!user || user.isAnonymous)) {
      try { localStorage.setItem('marcopolo-signout:' + previousUid, String(Date.now())); } catch {}
    }
    previousUid = user && !user.isAnonymous ? user.uid : '';
    if (!user || user.isAnonymous) return;
    let stopped = false, inFlight = false;
    const lock = (reason: string) => {
      if (stopped) return;
      stopped = true;
      try {
        localStorage.setItem('marcopolo-signout:' + user.uid, String(Date.now()));
        sessionStorage.setItem('showroom-logout', '1');
      } catch {}
      for (const storage of [localStorage, sessionStorage]) {
        for (const key of ['mp-invoice-auth','mp-invoice-user','marcopolo_current_user']) {
          try { storage.removeItem(key); } catch {}
        }
      }
      // Cover private content immediately, even if offline navigation cannot load.
      const shield = document.createElement('div');
      shield.id = 'session-security-lock'; shield.setAttribute('role', 'alert');
      shield.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#f7f5f0;color:#193f35;display:grid;place-content:center;padding:32px;text-align:center;font:18px Arial';
      shield.textContent = reason + ' Please reconnect and sign in again.';
      const style = document.createElement('style');
      style.textContent = 'body > * {visibility:hidden!important} body > #session-security-lock {visibility:visible!important}';
      document.head.appendChild(style); document.body.appendChild(shield);
      const redirect = () => window.location.replace('/staff-login?reason=session-ended');
      if (!navigator.onLine) window.addEventListener('online', redirect, {once:true});
      void signOut(auth).then(() => { if (navigator.onLine) redirect(); }).catch(() => {
        shield.textContent = 'Session locked. Close this tab and reconnect before signing in again.';
      });
    };
    const offline = () => lock('Your session ended because the connection was lost.');
    const storage = (event: StorageEvent) => {
      if (event.key === 'marcopolo-signout:' + user.uid && event.newValue) lock('You were signed out in another tab.');
    };
    const health = async () => {
      if (stopped || inFlight) return;
      if (!navigator.onLine) { offline(); return; }
      inFlight = true;
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch('/api/session-health', {cache:'no-store', signal:controller.signal});
        if (!response.ok) lock('Your session ended because the website connection could not be verified.');
      } catch { if (!stopped) offline(); }
      finally { clearTimeout(timer); inFlight = false; }
    };
    const stopIdle = monitorStaffIdle({win:window, userId:user.uid,
      timeoutMs:STAFF_INACTIVITY_TIMEOUT_MS,
      signedInAt:Date.parse(user.metadata.lastSignInTime || '') || Date.now(),
      onExpire:() => lock('Your session ended after five hours without activity.')});
    window.addEventListener('offline', offline); window.addEventListener('focus', health);
    window.addEventListener('storage', storage);
    const timer = setInterval(health, 30000); void health();
    cleanup = () => {
      stopped = true; stopIdle(); clearInterval(timer);
      window.removeEventListener('offline', offline); window.removeEventListener('focus', health);
      window.removeEventListener('storage', storage);
    };
  });
}
