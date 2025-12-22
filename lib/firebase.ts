/**
 * FIREBASE CONFIGURATION
 * 
 * Cloud database for syncing invoices across all devices
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration - hardcoded for static export compatibility
// These values are safe to expose publicly (they're client-side credentials)
const firebaseConfig = {
  apiKey: "AIzaSyCT5ukPxCXfMI3j8PgJCGdF5AvN6RnX0Y8",
  authDomain: "marcopolo-invoice.firebaseapp.com",
  projectId: "marcopolo-invoice",
  storageBucket: "marcopolo-invoice.firebasestorage.app",
  messagingSenderId: "257585408766",
  appId: "1:257585408766:web:6309ba28477926e86c796f"
};

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  const hasConfig = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== ''
  );
  
  console.log('Firebase configured:', hasConfig);
  console.log('Firebase config:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    projectId: firebaseConfig.projectId
  });
  
  return hasConfig;
}

// Initialize Firebase only if configured
let app: FirebaseApp | undefined;
let db: Firestore | undefined;

try {
  if (isFirebaseConfigured() && typeof window !== 'undefined') {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
  } else {
    console.log('Firebase not configured - using localStorage only');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { app };

export { db };
