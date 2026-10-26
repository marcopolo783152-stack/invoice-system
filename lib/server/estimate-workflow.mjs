import {createHash} from 'node:crypto';
import {workflowFields,cleanContact,customerMatches,exactCustomer,normalizedPhone,normalizedEmail} from '../estimate-workflow.mjs';
import {pickupFields,PICKUPS,requireValue} from '../service-pickups.mjs';
export const ESTIMATES='showroom_estimates';
export async function customerCandidates(db,e){const snap=await db.collection('customers').limit(1001).get();return {candidates:snap.docs.slice(0,1000).map(d=>({...d.data(),id:d.id})).filter(c=>customerMatches(c,e)),limited:snap.size>1000};}
export async function saveWorkflow(db,input,actor,now=new Date().toISOString()){
 requireValue(/^[\w-]{1,100}$/.test(input.id||'')&&/^[\w-]{10,100}$/.test(input.requestId||''),'Invalid request reference.');
 requireValue(['contact','schedule','customer'].includes(input.action),'Choose an estimate action.');
 const ref=db.doc(ESTIMATES+'/'+input.id),event=ref.collection('contact_history').doc(input.requestId);
 const current=await ref.get();requireValue(current.exists,'Estimate request not found.');
 const contact=cleanContact({...current.data(),...(input.action==='schedule'?input.fields:{})});
 requireValue(contact.name&&contact.phone,'Customer name and phone are required.');
 const matches=await customerCandidates(db,contact);let customerId=input.customerId;
 if(!customerId||customerId==='auto'){
 const exact=matches.candidates.filter(c=>exactCustomer(c,contact));
 requireValue(exact.length<=1,'Several customer records match. Choose the correct record.');
 if(exact.length)customerId=exact[0].id;
 else{requireValue(!matches.limited,'Customer search is limited. Review the Customers area, then explicitly choose a customer or a separate new record.');requireValue(!matches.candidates.length,'A customer with matching contact information exists. Select that record or explicitly choose a new customer.');customerId='new';}
 }
 if(customerId==='new')customerId='estimate-'+createHash('sha256').update(normalizedEmail(contact.email)+'|'+normalizedPhone(contact.phone)+(input.customerId==='new'?'|'+input.id:'')).digest('hex').slice(0,32);
 requireValue(/^[\w-]{1,100}$/.test(customerId),'Invalid customer reference.');
 const customer=db.doc('customers/'+customerId),pickup=db.doc(PICKUPS+'/estimate-'+input.id);
 const fingerprint=createHash('sha256').update(JSON.stringify({input,actor:actor.uid})).digest('hex');
 return db.runTransaction(async tx=>{
 const [snapshot,previous,c,p]=await tx.getAll(ref,event,customer,pickup);const e=snapshot.data();
 if(previous.exists){requireValue(previous.data().fingerprint===fingerprint,'This action changed. Save it as a new action.');return {id:ref.id,pickupId:previous.data().pickupId||''};}
 requireValue(e&&(e.workflowVersion||0)===input.version,'This request changed. Close and reopen it before saving.');
 requireValue(!e.invoiceId,'This request already has an invoice. Manage the linked invoice.');
 if(c.exists)requireValue(customerMatches(c.data(),contact),'The selected customer does not match this request. Check the phone or email.');
 const nextVersion=(e.workflowVersion||0)+1;let patch={},entry={kind:input.action,actorId:actor.uid,actorName:actor.name,at:now,fingerprint};
 if(input.action==='schedule'){
 const fields=pickupFields(input.fields);requireValue(fields.assignedTo,'Assign an employee to the pickup.');
 requireValue(!p.exists||['scheduled','cancelled'].includes(p.data().status),'This pickup was already collected or invoiced. Use its existing record.');
 const booking={...fields,id:pickup.id,sourceEstimateId:ref.id,status:'scheduled',version:p.exists?p.data().version+1:1,updatedAt:Date.parse(now),updatedBy:actor.uid,...(!p.exists?{createdAt:Date.parse(now),createdBy:actor.uid}:{})};
 tx.set(pickup,booking,{merge:true});tx.create(pickup.collection('history').doc(input.requestId),{action:p.exists?'reschedule':'create',actor:actor.uid,at:Date.parse(now),fields});
 patch={...contact,status:'Pickup Scheduled',pickupId:pickup.id,pickupState:'scheduled',pickupDate:fields.date,pickupTime:fields.time,pickupEndTime:fields.endTime||'',assignedTo:fields.assignedTo,followUpDate:'',dropoffDate:'',dropoffTime:''};entry={...entry,notes:fields.notes,pickupId:pickup.id,pickupDate:fields.date,pickupTime:fields.time,assignedTo:fields.assignedTo};
 }else if(input.action==='contact'){
 const fields=workflowFields(input.fields,!!e.pickupId&&p.data()?.status==='scheduled');patch={status:fields.status,followUpDate:fields.followUpDate,dropoffDate:fields.dropoffDate,dropoffTime:fields.dropoffTime,...(fields.estimateAmount?{estimateAmount:fields.estimateAmount}:{})};entry={...entry,...fields};
 if(p.exists&&p.data().status==='scheduled'&&fields.status!=='Pickup Scheduled'){tx.update(pickup,{status:'cancelled',cancellationReason:'Estimate outcome changed to '+fields.status,version:p.data().version+1,updatedAt:Date.parse(now),updatedBy:actor.uid});tx.create(pickup.collection('history').doc(input.requestId),{action:'cancel',actor:actor.uid,at:Date.parse(now),reason:'Estimate outcome changed to '+fields.status});patch.pickupState='cancelled';}
 }else entry={...entry,notes:'Customer record saved for future service.'};
 tx.set(customer,{...(!c.exists?{...contact,id:customer.id,createdAt:now,source:'estimate request',marketingConsent:'not_recorded'}:Object.fromEntries(Object.entries(contact).filter(([k,v])=>v&&!String(c.data()?.[k]||'').trim()))),updatedAt:now},{merge:true});
 tx.set(customer.collection('estimate_requests').doc(ref.id),{requestId:ref.id,linkedAt:now},{merge:true});
 tx.update(ref,{...patch,customerId:customer.id,workflowVersion:nextVersion,statusUpdatedAt:now,lastContact:entry,updatedBy:actor.uid});tx.create(event,entry);
 return {id:ref.id,pickupId:patch.pickupId||''};
 });
}
export async function createEstimateInvoice(db,{id,data,total,actor,now=new Date()}){
 requireValue(/^[\w-]{1,100}$/.test(id||''),'Invalid estimate reference.');const ref=db.doc(ESTIMATES+'/'+id),invoice=db.doc('invoices/estimate-'+id),number=db.doc('counters/invoice-number-'+encodeURIComponent('invoices:'+data.invoiceNumber)),pickup=db.doc(PICKUPS+'/estimate-'+id);
 const original=(await ref.get()).data();requireValue(original,'Request not found.');let customerId=original.customerId;
 if(!customerId){const matches=await customerCandidates(db,original),exact=matches.candidates.filter(c=>exactCustomer(c,original));requireValue(exact.length<=1&&(exact.length===1||!matches.candidates.length&&!matches.limited),'Review and save the customer link in the estimate request before creating its invoice.');customerId=exact[0]?.id||'estimate-'+createHash('sha256').update(normalizedEmail(original.email)+'|'+normalizedPhone(original.phone)).digest('hex').slice(0,32);}
 const customer=db.doc('customers/'+customerId),fingerprint=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 return db.runTransaction(async tx=>{const [s,i,n,p,c]=await tx.getAll(ref,invoice,number,pickup,customer);const e=s.data();requireValue(e,'Request not found.');
 if(e.invoiceId){requireValue(e.invoiceId===invoice.id&&i.data()?.estimateFingerprint===fingerprint,'This request already has an invoice. Open its linked invoice.');return {id:invoice.id};}
 requireValue((e.workflowVersion||0)===data.sourceEstimateVersion,'Request changed. Reload the invoice from the request before saving.');requireValue(!i.exists&&!n.exists,'Invoice reference or number is already used.');
 if(p.exists)requireValue(!p.data().invoiceId,'This pickup already has an invoice. Open the linked invoice.');
 tx.create(number,{invoiceId:invoice.id,invoiceNumber:data.invoiceNumber,createdAt:now});tx.create(invoice,{invoiceNumber:data.invoiceNumber,customerName:data.soldTo.name,date:data.date,totalAmount:total,data,createdAt:now,updatedAt:now,estimateFingerprint:fingerprint});
 if(!c.exists)tx.create(customer,{...cleanContact(e),id:customer.id,createdAt:now.toISOString(),updatedAt:now.toISOString(),source:'estimate request',marketingConsent:'not_recorded'});tx.set(customer.collection('estimate_requests').doc(ref.id),{requestId:ref.id,linkedAt:now.toISOString()},{merge:true});
 tx.update(ref,{customerId:customer.id,status:'Converted to Invoice',invoiceId:invoice.id,invoiceNumber:data.invoiceNumber,invoiceCollection:'invoices',followUpDate:'',workflowVersion:(e.workflowVersion||0)+1,statusUpdatedAt:now.toISOString()});
 tx.create(ref.collection('contact_history').doc('invoice-created'),{kind:'invoice_created',actorId:actor.uid,actorName:actor.name,at:now.toISOString(),invoiceId:invoice.id,invoiceNumber:data.invoiceNumber});
 if(p.exists)tx.update(pickup,{status:'invoiced',invoiceId:invoice.id,invoiceNumber:data.invoiceNumber,invoiceCollection:'invoices',version:p.data().version+1,updatedAt:now.getTime()});
 return {id:invoice.id};});
}
