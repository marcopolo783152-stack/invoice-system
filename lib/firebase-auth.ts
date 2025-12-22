import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function signup(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function onUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export { auth };
