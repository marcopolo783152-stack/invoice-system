/**
 * FIREBASE CONFIGURATION
 * 
 * Cloud database for syncing invoices across all devices
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration - these will be replaced at build time
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
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

export { db };
