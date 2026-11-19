import {NextResponse} from 'next/server';
import {clockAccess,clockFailure,clockHeaders} from '@/lib/server/employee-clock';
import {validDescriptor} from '@/lib/employee-clock.mjs';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const {db,prefix}=await clockAccess(req);const s=await db.collection(prefix+'employees').limit(501).get();if(s.size>500)return NextResponse.json({error:'Too many staff records. Ask the manager to review the kiosk configuration.'},{status:409});return NextResponse.json({employees:s.docs.filter(d=>d.data().active!==false).map(d=>{const e=d.data();return {id:d.id,name:e.name||'Employee',empId:e.empId||'',status:e.status==='IN'?'IN':'OUT',...(validDescriptor(e.faceDescriptor)?{faceDescriptor:e.faceDescriptor}:{})};})},{headers:clockHeaders});}catch(e){return clockFailure(e);}}
