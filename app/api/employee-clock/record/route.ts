import {NextResponse} from 'next/server';
import {Timestamp} from 'firebase-admin/firestore';
import {clockAccess,clockFailure,clockHeaders,digest} from '@/lib/server/employee-clock';
import {exactEmployee,matchFace,checkLocation} from '@/lib/employee-clock.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid origin.'},{status:403});
 const access=await clockAccess(req),{db,prefix,key}=access;const raw=await req.text();if(raw.length>12000)return NextResponse.json({error:'Request too large.'},{status:400});let b:any;try{b=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
 if(!/^[\w-]{10,100}$/.test(b.requestId||'')||!['IN','OUT'].includes(b.type)||!['face','pin'].includes(b.method))return NextResponse.json({error:'Invalid clock request.'},{status:400});
 let location;try{location=checkLocation(b.location);}catch(e){return NextResponse.json({error:(e as Error).message},{status:400});}
 const fingerprint=digest(raw),op=db.doc('employee_clock_operations/'+digest(key+'|'+b.requestId)),rate=db.doc('employee_clock_limits/'+key);
 try{const result=await db.runTransaction(async tx=>{
 const [prior,lim,enabled,staff]=await Promise.all([tx.get(op),tx.get(rate),tx.get(db.doc('employee_clock_keys/'+key)),tx.get(db.collection(prefix+'employees').limit(501))]);
 if(enabled.data()?.active!==true)throw Error('This kiosk QR has been replaced. Ask the manager for the current QR.');
 if(prior.exists){if(prior.data()?.fingerprint!==fingerprint)throw Error('Operation conflict.');return prior.data()!.result;}
 const now=Date.now(),previous=lim.data();if(previous?.until>now&&previous?.count>=20)throw Error('Too many attempts. Please wait a minute.');
 if(staff.size>500)throw Error('Kiosk configuration needs review.');
 const employees=staff.docs.map(d=>({...d.data(),id:d.id}));
 const employee=b.method==='face'?matchFace(b.descriptor,employees)?.employee:exactEmployee(b.identifier,employees);
 if(!employee||b.method==='face'&&employee.id!==b.employeeId||b.expectedEmpId&&employee.empId!==b.expectedEmpId){tx.set(rate,{until:previous?.until>now?previous!.until:now+60000,count:previous?.until>now?(previous!.count||0)+1:1});return {error:'Identity could not be confirmed. Use your exact employee ID / PIN or ask your manager to update your face registration.'};}
 if(employee.status===b.type)throw Error('You are already clocked '+b.type.toLowerCase()+'. Refresh before trying again.');
 const last=Date.parse(employee.lastAction||'');if(Number.isFinite(last)&&now-last<30000)throw Error('Your last clock action was just saved. Please wait 30 seconds.');
 const timestamp=new Date(now).toISOString(),logId=digest(key+'|'+b.requestId),logRef=db.doc(prefix+'timelogs/'+logId);
 const result={employee:{id:employee.id,name:employee.name,empId:employee.empId,status:b.type},log:{id:logId,type:b.type,timestamp}};
 tx.create(logRef,{employeeId:employee.id,employeeName:employee.name,type:b.type,timestamp:Timestamp.fromMillis(now),location,synced:true,device:'QR kiosk',verificationMethod:b.method});
 tx.update(db.doc(prefix+'employees/'+employee.id),{status:b.type,lastAction:timestamp});
 tx.create(op,{fingerprint,result,at:now});tx.set(rate,{until:previous?.until>now?previous!.until:now+60000,count:previous?.until>now?(previous!.count||0)+1:1});return result;
 });return NextResponse.json(result,{status:result.error?400:200,headers:clockHeaders});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not save attendance.'},{status:409,headers:clockHeaders});}
 }catch(e){return clockFailure(e);}}
