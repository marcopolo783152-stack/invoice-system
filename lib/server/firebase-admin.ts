import 'server-only';
import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
export function adminApp(){
 if(getApps().length)return getApps()[0];
 const projectId=process.env.FIREBASE_PROJECT_ID?.trim()||process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
 if(projectId?.startsWith('demo-')&&process.env.FIRESTORE_EMULATOR_HOST&&process.env.FIREBASE_AUTH_EMULATOR_HOST)return initializeApp({projectId});
 const publicProjectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
 if(publicProjectId&&projectId!==publicProjectId)throw Error('FIREBASE_PROJECT_MISMATCH');
 const clientEmail=process.env.FIREBASE_CLIENT_EMAIL?.trim();
 const privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');
 if(!projectId||!clientEmail||!privateKey)throw Error('SERVER_NOT_CONFIGURED');
 return initializeApp({credential:cert({projectId,clientEmail,privateKey})});
}
export const serverDb=()=>getFirestore(adminApp());
export const serverAuth=()=>getAuth(adminApp());
export async function caller(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw Error('SIGN_IN_REQUIRED');
 return serverAuth().verifyIdToken(token,true);
}
