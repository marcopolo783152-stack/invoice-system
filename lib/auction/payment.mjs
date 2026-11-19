import {check} from './engine.mjs';
import {SANDBOX_INVOICES} from './settlement.mjs';
export const TEST_PAYMENT_PROFILES='auction_test_payment_profiles_v2';
export const TEST_PAYMENT_OPERATIONS='auction_test_payment_operations_v2';
export function assertTestInvoice(invoice,profile){
 check(invoice?.mode==='sandbox'&&Number.isSafeInteger(invoice.total)&&invoice.total>=50,'Choose a test invoice of at least $0.50.');
 check(profile?.mode==='test'&&profile.verified===true&&profile.buyerId===invoice.buyerId&&profile.customerId?.startsWith('cus_')&&profile.paymentMethodId?.startsWith('pm_'),'Complete Stripe test-card setup for this fictional buyer.');
 check(profile.acceptedPolicyVersion===invoice.policy.policyVersion&&profile.chargeConsent===true,'Test card charge consent does not match this invoice policy. Save the card again with the current policy.');
}
export function testIntentState(invoice,profile,intent){
 check(intent?.livemode===false&&intent.id?.startsWith('pi_')&&intent.currency==='usd'&&intent.amount===invoice.total&&intent.customer===profile.customerId&&intent.metadata?.purpose==='marcopolo_auction_test'&&intent.metadata?.invoiceId===invoice.id&&(!invoice.paymentIntentId||invoice.paymentIntentId===intent.id),'Provider payment does not match the test invoice.');
 if(intent.status==='succeeded'){check(intent.amount_received===invoice.total,'Received amount does not match the invoice.');return {paymentStatus:'paid',paymentFailure:'',paidAt:Date.now()};}
 if(intent.status==='processing')return {paymentStatus:'processing',paymentFailure:'Test payment is processing; do not release rugs.'};
 if(intent.status==='requires_action')return {paymentStatus:'requires_action',paymentFailure:'The bank requires customer authentication. Invoice remains unpaid.'};
 return {paymentStatus:'failed',paymentFailure:intent.last_payment_error?.decline_code?'Card declined: '+String(intent.last_payment_error.decline_code).slice(0,80):'Test payment is unpaid. Update the test card and reconcile before retrying.'};
}
export async function syncTestIntent(db,intent){
 const id=intent?.metadata?.invoiceId;check(typeof id==='string'&&/^TEST-AI-[a-f0-9]{24}$/.test(id),'Invalid invoice metadata.');
 return db.runTransaction(async tx=>{const ref=db.doc(SANDBOX_INVOICES+'/'+id),invoice=(await tx.get(ref)).data();check(invoice?.mode==='sandbox','Test invoice not found.');const profile=(await tx.get(db.doc(TEST_PAYMENT_PROFILES+'/'+invoice.buyerId))).data();check(profile,'Test card profile not found.');const update=testIntentState({...invoice,id},profile,intent);if(invoice.paymentStatus==='paid')return invoice;
 tx.update(ref,{...update,paymentIntentId:intent.id,version:invoice.version+1,updatedAt:Date.now()});return {...invoice,...update,paymentIntentId:intent.id};});
}
export async function chargeTestInvoice(db,stripe,id,actor){
 const ref=db.doc(SANDBOX_INVOICES+'/'+id),op=db.doc(TEST_PAYMENT_OPERATIONS+'/'+id);
 const saved=await db.runTransaction(async tx=>{const [snap,prior]=await tx.getAll(ref,op),invoice=snap.data();check(invoice?.mode==='sandbox','Test invoice not found.');if(invoice.paymentStatus==='paid')return {paid:true,invoice};
 const profile=(await tx.get(db.doc(TEST_PAYMENT_PROFILES+'/'+invoice.buyerId))).data();assertTestInvoice(invoice,profile);
 if(prior.exists){check(invoice.paymentIntentId,'A test payment already started. Reconcile in Stripe before any new attempt.');return {invoice,profile,existing:true};}
 check(!invoice.paymentIntentId&&invoice.paymentStatus!=='processing','An existing payment must be reconciled.');
 tx.create(op,{phase:'creating',invoiceId:id,amount:invoice.total,customerId:profile.customerId,paymentMethodId:profile.paymentMethodId,actor,at:Date.now()});tx.update(ref,{paymentStatus:'processing',paymentFailure:'Creating one Stripe test payment.',version:invoice.version+1});return {invoice:{...invoice,id},profile};});
 if(saved.paid)return saved.invoice;
 if(saved.existing){const intent=await stripe.paymentIntents.retrieve(saved.invoice.paymentIntentId);return syncTestIntent(db,intent);}
 const {invoice,profile}=saved;
 try{
  const setup=await stripe.setupIntents.retrieve(profile.setupIntentId),method=await stripe.paymentMethods.retrieve(profile.paymentMethodId);
  check(setup.livemode===false&&setup.status==='succeeded'&&setup.customer===profile.customerId&&setup.payment_method===profile.paymentMethodId&&setup.usage==='off_session'&&method.customer===profile.customerId,'Saved test card is no longer verified.');
  const intent=await stripe.paymentIntents.create({amount:invoice.total,currency:'usd',customer:profile.customerId,payment_method:profile.paymentMethodId,payment_method_types:['card'],metadata:{purpose:'marcopolo_auction_test',invoiceId:id},description:'TEST Marco Polo auction '+invoice.number},{idempotencyKey:'mp-auction-test-create-'+id});
  testIntentState(invoice,profile,intent);
  await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();check(current?.paymentStatus!=='paid'&&!current?.paymentIntentId,'Test invoice changed during payment creation.');tx.update(ref,{paymentIntentId:intent.id,paymentFailure:'',version:current.version+1});tx.update(op,{phase:'confirming',paymentIntentId:intent.id});});
  let confirmed;try{confirmed=await stripe.paymentIntents.confirm(intent.id,{off_session:true},{idempotencyKey:'mp-auction-test-confirm-'+id});}catch(error){confirmed=error?.payment_intent||await stripe.paymentIntents.retrieve(intent.id);}
  const result=await syncTestIntent(db,confirmed);await op.update({phase:'reconciled',providerStatus:confirmed.status});return result;
 }catch(error){await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.paymentStatus!=='paid')tx.update(ref,{paymentStatus:'needs_review',paymentFailure:'Test payment needs reconciliation in Stripe. Do not create another charge.',version:current.version+1});tx.update(op,{phase:'needs_review'});});throw error;}
}

export async function retryTestInvoice(db,stripe,id,actor){
 const ref=db.doc(SANDBOX_INVOICES+'/'+id),invoice=(await ref.get()).data();check(invoice?.mode==='sandbox'&&invoice.paymentIntentId&&invoice.paymentStatus==='failed','Only a reconciled declined test payment can be retried.');
 const profile=(await db.doc(TEST_PAYMENT_PROFILES+'/'+invoice.buyerId).get()).data();assertTestInvoice(invoice,profile);
 const before=await stripe.paymentIntents.retrieve(invoice.paymentIntentId);check(testIntentState({...invoice,id},profile,before).paymentStatus==='failed'&&before.status==='requires_payment_method','Reconcile the test payment before retrying.');
 const setup=await stripe.setupIntents.retrieve(profile.setupIntentId),method=await stripe.paymentMethods.retrieve(profile.paymentMethodId);check(setup.livemode===false&&setup.status==='succeeded'&&setup.customer===profile.customerId&&setup.payment_method===profile.paymentMethodId&&setup.usage==='off_session'&&method.customer===profile.customerId,'Verify the replacement test card first.');
 const op=db.doc(TEST_PAYMENT_OPERATIONS+'/'+id),attempt=await db.runTransaction(async tx=>{const [snap,operation]=await tx.getAll(ref,op),current=snap.data(),state=operation.data();check(current?.paymentIntentId===before.id&&current.paymentStatus==='failed'&&state?.phase==='reconciled','A retry is already running or needs reconciliation.');const attempt=(state.retryAttempts||0)+1;check(attempt<=5,'Test retries are capped at five; review the invoice.');tx.update(op,{phase:'retrying',retryAttempts:attempt,retriedBy:actor,retriedAt:Date.now()});tx.update(ref,{paymentStatus:'processing',version:current.version+1});return attempt;});
 try{
  await stripe.paymentIntents.update(before.id,{payment_method:profile.paymentMethodId},{idempotencyKey:'mp-auction-test-update-'+id+'-'+attempt});
  let result;try{result=await stripe.paymentIntents.confirm(before.id,{off_session:true},{idempotencyKey:'mp-auction-test-retry-'+id+'-'+attempt});}catch(error){result=error?.payment_intent||await stripe.paymentIntents.retrieve(before.id);}
  const updated=await syncTestIntent(db,result);await op.update({phase:'reconciled',providerStatus:result.status});return updated;
 }catch(error){await op.update({phase:'needs_review'});throw error;}
}
