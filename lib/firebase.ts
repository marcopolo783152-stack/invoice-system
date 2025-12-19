/**
 * FIREBASE CONFIGURATION
 * 
 * Cloud database for syncing invoices across all devices
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - REPLACE WITH YOUR VALUES
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}
