import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { app, browserSessionReady } from './firebase';

const auth = getAuth(app);

export async function login(email: string, password: string) {
  await browserSessionReady;
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export async function signup(email: string, password: string) {
  await browserSessionReady;
  return createUserWithEmailAndPassword(auth, email, password);
}

export function onUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export { auth };
