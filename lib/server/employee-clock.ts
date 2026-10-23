import {createHash} from 'crypto';
import {NextResponse} from 'next/server';
import {serverDb} from './firebase-admin';
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export async function clockAccess(req:Request){const token=req.headers.get('x-clock-key')||'';if(!/^[a-f0-9]{64}$/.test(token))throw Error('INVALID_KIOSK');const db=serverDb(),key=digest(token),snap=await db.doc('employee_clock_keys/'+key).get();const data=snap.data();if(!snap.exists||data?.active!==true)throw Error('INVALID_KIOSK');if(data.storeId&&!/^[\w-]{1,100}$/.test(data.storeId))throw Error('INVALID_KIOSK');return {db,key,storeId:data.storeId||'',prefix:data.storeId?data.storeId+'_':''};}
export function clockFailure(e:unknown){const m=e instanceof Error?e.message:'';if(m==='INVALID_KIOSK')return NextResponse.json({error:'This QR code needs to be updated. Ask your manager to print the new Shop QR. No account login is needed.'},{status:403});if(/FORBIDDEN|SIGN_IN_REQUIRED/.test(m))return NextResponse.json({error:'Employee management access is required.'},{status:403});return NextResponse.json({error:'Attendance could not be saved or loaded. Please retry; success has not been recorded.'},{status:503});}
export const clockHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
