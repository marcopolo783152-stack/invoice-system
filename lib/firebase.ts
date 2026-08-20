/**
 * FIREBASE CONFIGURATION
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCtSukPxCXfHl3jBPg5JC6dF5AvbG8nX0Y",
  authDomain: "marcopolo-invoice.firebaseapp.com",
  projectId: "marcopolo-invoice",
  storageBucket: "marcopolo-invoice.firebasestorage.app",
  messagingSenderId: "257585608766",
  appId: "1:257585608766:web:6309ba28477926e86c796f",
  measurementId: "G-BMPL0XNPQ4"
};

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== '');
}

// Initialize immediately to ensure const exports are bound correctly!
let appInstance: FirebaseApp;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

if (typeof window !== 'undefined' && isFirebaseConfigured()) {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  dbInstance = getFirestore(appInstance);
  try {
    storageInstance = getStorage(appInstance);
  } catch(e) {}
  
  try {
    const auth = getAuth(appInstance);
    signInAnonymously(auth).catch(e => console.warn("Anon Auth failed:", e));
  } catch(e) {}
} else if (isFirebaseConfigured()) {
  // SSR Database Init
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  dbInstance = getFirestore(appInstance);
} else {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

export const app = appInstance;
export const db = dbInstance;
export const storage = storageInstance;

export function checkFirebaseQuotaError(error: any) {
  if (!error) return false;
  const errStr = String(error.message || error.code || error).toLowerCase();
  if (errStr.includes('quota') || errStr.includes('resource-exhausted')) {
    if (typeof window !== 'undefined') alert("FIREBASE QUOTA EXCEEDED");
    return true;
  }
  return false;
}
