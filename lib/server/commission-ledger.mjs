import {createHash} from 'node:crypto';
import {parseRate,paymentAmount,validMonth,DEFAULT_RATE,accrualFor} from '../retail/commission.mjs';
const configPath='owner_commission_private/config';
export async function reconcileAccruals(db,rows,now=new Date().toISOString()){
 const ref=db.doc(configPath);const config=(await ref.get()).data()||{version:0,rateBps:DEFAULT_RATE,locked:false,rates:[]};
 const snap=await db.collection('owner_commission_accruals').get(),prior=new Map(snap.docs.map(d=>[d.id,{...d.data(),id:d.id}]));const out=[];
 const eligible=rows.filter(r=>r.completed||prior.has(createHash('sha256').update(r.key).digest('hex')));
 for(let offset=0;offset<eligible.length;offset+=20){const results=await Promise.all(eligible.slice(offset,offset+20).map(async row=>{
 const id=createHash('sha256').update(row.key).digest('hex'),target=db.doc('owner_commission_accruals/'+id),saved=prior.get(id),candidate=accrualFor(row,saved,config.rates||[]),candidateHash=createHash('sha256').update(JSON.stringify(candidate)).digest('hex');
 if(saved?.fingerprint===candidateHash)return {id,a:candidate};
 const a=await db.runTransaction(async tx=>{const [c,p]=await tx.getAll(ref,target);const settings=c.data()||config,old=p.data(),next=accrualFor(row,old,settings.rates||[]);const fingerprint=createHash('sha256').update(JSON.stringify(next)).digest('hex');if(old?.fingerprint!==fingerprint){tx.set(target,{...next,fingerprint,updatedAt:now,...(!p.exists?{createdAt:now}:{})});tx.create(target.collection('audit').doc(),{at:now,before:old?{basis:old.basis,earned:old.earned,date:old.date}:null,after:{basis:next.basis,earned:next.earned,date:next.date},reason:'Sales reconciliation'});}return next;});return {id,a};}));for(const r of results){out.push(r.a);prior.delete(r.id);}}
 // Never silently erase accrued commission for a missing or deleted source.
 for(const old of prior.values())out.push({...old,issues:[...(old.issues||[]),'Source no longer appears in retail records; review before settling.']});
 return {config,accruals:out};
}
export async function changeCommission(db,input,uid,now=new Date().toISOString()){
 if(!/^[a-f0-9-]{36}$/.test(input.requestId||''))throw Error('Invalid action reference.');const op=db.doc('owner_commission_actions/'+input.requestId),ref=db.doc(configPath),fingerprint=createHash('sha256').update(JSON.stringify({uid,input})).digest('hex');
 const payment=input.paymentId?db.doc('owner_commission_payments/'+input.paymentId):db.doc('owner_commission_payments/'+input.requestId);
 return db.runTransaction(async tx=>{const [previous,c,p]=await tx.getAll(op,ref,payment);if(previous.exists){if(previous.data().fingerprint!==fingerprint)throw Error('This action changed. Start a new action.');return {success:true};}const settings=c.data()||{version:0,rateBps:DEFAULT_RATE,locked:false,rates:[]};
 if(['rate','lockRate','unlockRate'].includes(input.action)){
 if(input.version!==settings.version)throw Error('Rate settings changed. Refresh before saving.');
 let update;if(input.action==='rate'){if(settings.locked)throw Error('Unlock the rate before changing it.');const rateBps=parseRate(input.percent);update={rateBps,locked:input.lock===true,rates:[...settings.rates,{at:now,rateBps,by:uid}]};}else update={locked:input.action==='lockRate'};
 tx.set(ref,{...settings,...update,version:settings.version+1,updatedAt:now});
 }else if(input.action==='payment'){
 const amount=paymentAmount(input.amount),month=String(input.month||'');if(month&&!validMonth(month))throw Error('Choose the commission month or leave it unallocated.');if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||!Number.isFinite(Date.parse(input.date+'T12:00:00Z'))||new Date(input.date+'T12:00:00Z').toISOString().slice(0,10)!==input.date)throw Error('Choose a valid received date.');if(!['Cash','Check','Bank transfer','Card','Other'].includes(input.method))throw Error('Choose the payment method.');if(String(input.note||'').length>2000||String(input.reference||'').length>200)throw Error('Shorten the payment notes.');
 tx.create(payment,{amount,date:input.date,method:input.method,note:String(input.note||''),reference:String(input.reference||''),allocations:month?[{month,amount}]:[],version:1,createdAt:now,by:uid,voided:false});
 }else if(input.action==='allocate'||input.action==='voidPayment'){
 const saved=p.data();if(!saved||saved.voided||saved.version!==input.version)throw Error('Payment changed or is unavailable. Refresh first.');
 if(input.action==='allocate'){const amount=paymentAmount(input.amount);if(!validMonth(input.month)||amount>saved.amount-saved.allocations.reduce((n,a)=>n+a.amount,0))throw Error('Allocation exceeds the unallocated payment or the month is invalid.');tx.update(payment,{allocations:[...saved.allocations,{month:input.month,amount}],version:saved.version+1,updatedAt:now});}
 else{if(typeof input.reason!=='string'||input.reason.trim().length<5||input.reason.length>500)throw Error('Record why this payment entry is being voided.');tx.update(payment,{voided:true,voidReason:input.reason.trim(),voidedAt:now,version:saved.version+1});}
 }else throw Error('Unknown commission action.');
 tx.create(op,{fingerprint,action:input.action,at:now,by:uid,paymentId:payment.id,...(input.action==='rate'?{percent:input.percent}:{}),...(input.action==='voidPayment'?{reason:input.reason}:{}),before:input.action==='payment'?null:p.data()||null});return {success:true};});
}
