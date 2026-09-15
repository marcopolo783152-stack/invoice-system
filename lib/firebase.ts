import {initializeApp,getApps} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';
import {getAuth,signInAnonymously,connectAuthEmulator} from 'firebase/auth';
const configured=!!process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
const config={
 apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || 'preview-not-configured',
 authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || 'demo-marcopolo-preview.firebaseapp.com',
 projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || 'demo-marcopolo-preview',
 storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
 messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
 appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim()
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

export function signInErrorMessage(error:unknown){
 const message=error instanceof Error?error.message:String(error||'');
 if(/api-key-not-valid|invalid-api-key|api-key-invalid|API_KEY_INVALID|CONFIGURATION_NOT_FOUND/i.test(message))
  return 'Website sign-in is temporarily unavailable because its Firebase connection is not configured correctly. Please contact the showroom. Changing your password will not fix this connection problem.';
 if(/unauthorized-domain/i.test(message))return 'Sign-in is not enabled for this website address yet. Please contact the showroom.';
 if(/invalid-credential|wrong-password|user-not-found/i.test(message))return 'The email or password was not accepted. Try again or use Forgot password.';
 if(/popup-closed-by-user|cancelled-popup-request/i.test(message))return 'Google sign-in was closed. Please try again.';
 return message||'Please try again.';
}
