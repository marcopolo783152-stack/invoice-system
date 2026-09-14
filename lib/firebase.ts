import {initializeApp,getApps} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';
import {getAuth,signInAnonymously,connectAuthEmulator} from 'firebase/auth';
const configured=!!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const config={
 apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'preview-not-configured',
 authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-marcopolo-preview.firebaseapp.com',
 projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-marcopolo-preview',
 storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
 messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
 appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
export const app=getApps()[0] || initializeApp(config);
export const db=getFirestore(app);
export const storage=getStorage(app);
if((typeof window!=='undefined'||process.env.FIRESTORE_EMULATOR_HOST) && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS==='true' && config.projectId.startsWith('demo-')){
 const state=globalThis as typeof globalThis & {__marcopoloEmulatorsConnected?:boolean};
 if(!state.__marcopoloEmulatorsConnected){
  connectFirestoreEmulator(db,'127.0.0.1',8080);
  connectAuthEmulator(getAuth(app),'http://127.0.0.1:9099',{disableWarnings:true});
  state.__marcopoloEmulatorsConnected=true;
 }
}
export function isFirebaseConfigured(){return configured;}
if(typeof window!=='undefined' && configured){
 const auth=getAuth(app);
 auth.authStateReady().then(()=>{if(!auth.currentUser)return signInAnonymously(auth);}).catch(()=>console.warn('Guest connection unavailable.'));
}
export function checkFirebaseQuotaError(error:any){
 return /quota|resource-exhausted/i.test(String(error?.code||error?.message||''));
}
