import {NextResponse} from 'next/server';
import {createHash} from 'crypto';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {assertRepayment,assertReversal,loanStatus,safeIdempotencyKey,toCents} from '@/lib/loan-ledger.mjs';

export const dynamic='force-dynamic';
const validId=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
const clean=(v:unknown,max=200)=>String(v||'').trim().slice(0,max);
const fail=(e:unknown)=>NextResponse.json({error:e instanceof Error?e.message:'Could not process loan request.'},{status:/FORBIDDEN/.test(String(e))?403:/SIGN_IN_REQUIRED/.test(String(e))?401:400});

export async function GET(request:Request){
 try{
  await requireStaff(request,'loans','read');
  const db=serverDb(), params=new URL(request.url).searchParams, id=params.get('id');
  if(id){
   if(!validId(id)) throw new Error('INVALID_LOAN');
   const ref=db.collection('showroom_loans').doc(id), [loanSnap,paySnap]=await Promise.all([ref.get(),ref.collection('payments').orderBy('createdAt','desc').limit(250).get()]);
   if(!loanSnap.exists)return NextResponse.json({error:'Loan not found.'},{status:404});
   const loanData=loanSnap.data()!;return NextResponse.json({loan:{id:loanSnap.id,...loanData,status:loanStatus(loanData.balanceCents,loanData.dueDate)},payments:paySnap.docs.map(d=>({id:d.id,...d.data()}))},{headers:{'Cache-Control':'no-store'}});
  }
  const snap=await db.collection('showroom_loans').orderBy('createdAt','desc').limit(200).get();
  return NextResponse.json({loans:snap.docs.map(d=>{const x=d.data();return {id:d.id,...x,status:loanStatus(x.balanceCents,x.dueDate)};})},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e);}
}

export async function POST(request:Request){
 try{
  const actor=await requireStaff(request,'loans','write');
  const raw=await request.text(); if(raw.length>16000)throw new Error('REQUEST_TOO_LARGE');
  const input=JSON.parse(raw), action=input?.action, db=serverDb();
  if(action==='create'){
   const requestId=safeIdempotencyKey(input.requestId), principalCents=toCents(input.amount), borrowerName=clean(input.borrowerName,120);
   if(borrowerName.length<2)throw new Error('BORROWER_REQUIRED');
   const ref=db.collection('showroom_loans').doc(requestId), fingerprint=createHash('sha256').update(raw).digest('hex');
   await db.runTransaction(async tx=>{
    const old=await tx.get(ref);
    if(old.exists){if(old.data()?.fingerprint!==fingerprint)throw new Error('REQUEST_CONFLICT');return;}
    const dueDate=clean(input.dueDate,20)||null, now=Date.now();
    tx.create(ref,{borrowerName,borrowerEmail:clean(input.borrowerEmail,160),borrowerPhone:clean(input.borrowerPhone,60),principalCents,balanceCents:principalCents,interestRate:0,status:'active',issuedDate:clean(input.issuedDate,20)||new Date().toISOString().slice(0,10),dueDate,notes:clean(input.notes,1000),createdAt:now,updatedAt:now,createdBy:actor.uid,fingerprint});
    tx.create(ref.collection('events').doc('created'),{type:'loan_created',amountCents:principalCents,at:now,actor:actor.uid});
   });
   return NextResponse.json({id:requestId,saved:true});
  }
  if(!validId(input.loanId))throw new Error('INVALID_LOAN');
  const loanRef=db.collection('showroom_loans').doc(input.loanId);
  if(action==='repay'){
   const requestId=safeIdempotencyKey(input.requestId), amountCents=toCents(input.amount), paymentRef=loanRef.collection('payments').doc(requestId), fingerprint=createHash('sha256').update(raw).digest('hex');
   await db.runTransaction(async tx=>{
    const [loan,payment]=await Promise.all([tx.get(loanRef),tx.get(paymentRef)]); if(!loan.exists)throw new Error('LOAN_NOT_FOUND');
    if(payment.exists){if(payment.data()?.fingerprint!==fingerprint)throw new Error('REQUEST_CONFLICT');return;}
    const data=loan.data()!, next=assertRepayment(data.balanceCents,amountCents), now=Date.now();
    tx.create(paymentRef,{kind:'repayment',amountCents,date:clean(input.date,20)||new Date().toISOString().slice(0,10),method:clean(input.method,80),notes:clean(input.notes,500),createdAt:now,createdBy:actor.uid,reversed:false,fingerprint});
    tx.update(loanRef,{balanceCents:next,status:loanStatus(next,data.dueDate),updatedAt:now});
    tx.create(loanRef.collection('events').doc('payment_'+requestId),{type:'repayment',paymentId:requestId,amountCents,at:now,actor:actor.uid});
   });
   return NextResponse.json({paymentId:requestId,saved:true});
  }
  if(action==='reverse'){
   const target=String(input.paymentId||''); if(!validId(target))throw new Error('INVALID_PAYMENT');
   const reason=clean(input.reason,500); if(reason.length<5)throw new Error('REVERSAL_REASON_REQUIRED');
   const paymentRef=loanRef.collection('payments').doc(target), reversalRef=loanRef.collection('events').doc('reversal_'+target);
   await db.runTransaction(async tx=>{
    const [loan,payment,reversal]=await Promise.all([tx.get(loanRef),tx.get(paymentRef),tx.get(reversalRef)]);
    if(!loan.exists||!payment.exists)throw new Error('PAYMENT_NOT_FOUND'); if(reversal.exists)return;
    const l=loan.data()!, p=payment.data()!; if(p.kind!=='repayment'||p.reversed)throw new Error('PAYMENT_ALREADY_REVERSED');
    const next=assertReversal(p.amountCents,l.balanceCents,l.principalCents), now=Date.now();
    tx.update(paymentRef,{reversed:true,reversedAt:now,reversedBy:actor.uid,reversalReason:reason});
    tx.update(loanRef,{balanceCents:next,status:loanStatus(next,l.dueDate),updatedAt:now});
    tx.create(reversalRef,{type:'repayment_reversed',paymentId:target,amountCents:p.amountCents,reason,at:now,actor:actor.uid});
   });
   return NextResponse.json({reversed:true});
  }
  throw new Error('INVALID_ACTION');
 }catch(e){return fail(e);}
}
