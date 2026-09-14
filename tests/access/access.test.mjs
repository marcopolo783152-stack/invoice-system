import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,writeBatch,Timestamp} from 'firebase/firestore';
import ts from 'typescript';
const ownerUid='msQJKLOsWceWK5A75V6ZBLQRvsl2';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-marcopolo-access',firestore:{rules:await readFile('../../firestore.rules','utf8')}});});
after(async()=>{await env?.cleanup();});
const identity=(uid,email=uid+'@example.com',verified=true)=>env.authenticatedContext(uid,{email,email_verified:verified}).firestore();
const role=(email,kind='seller',permissions={})=>({email,name:'Test Staff',role:kind,permissions,active:true});
const seed=async(path,data)=>env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),path),data));
beforeEach(async()=>{
 await env.clearFirestore();
 await seed('showroom_roles/'+ownerUid,{email:'marcopolo783152@gmail.com',role:'admin'});
 await seed('showroom_roles/gm',role('gm@example.com','general_manager'));
 await seed('showroom_roles/seller',role('seller@example.com'));
 await seed('showroom_roles/custom',role('custom@example.com','custom',{'messages.read':true}));
 await seed('invoices/example',{invoiceNumber:'MP1'});
 await seed('employees/example',{name:'Private payroll'});
 await seed('showroom_chat/message',{ownerUid:'customer',sender:'customer',text:'Help',isAutomated:false});
});
test('owner and General Manager have the same business and staff-management access',async()=>{
 for(const db of [identity(ownerUid,'marcopolo783152@gmail.com'),identity('gm')]){
  await assertSucceeds(getDocs(collection(db,'employees')));
  await assertSucceeds(updateDoc(doc(db,'invoices/example'),{totalAmount:1}));
  await assertSucceeds(setDoc(doc(db,'showroom_roles/new'),role('new@example.com')));
 }
});
test('owner cannot be demoted, deleted or impersonated through an email shortcut',async()=>{
 const gm=identity('gm');
 await assertFails(updateDoc(doc(gm,'showroom_roles/'+ownerUid),{role:'seller'}));
 await assertFails(deleteDoc(doc(gm,'showroom_roles/'+ownerUid)));
 await assertFails(getDoc(doc(identity('outsider','marcopolo783152@gmail.com'),'employees/example')));
 await assertFails(getDoc(doc(identity('outsider','marcopolorugs@aol.com'),'employees/example')));
 await assertFails(getDoc(doc(identity(ownerUid,'someone@example.com'),'employees/example')));
});
test('unverified and disabled staff cannot read protected data',async()=>{
 await assertFails(getDoc(doc(identity('gm','gm@example.com',false),'invoices/example')));
 await seed('showroom_roles/gm',{...role('gm@example.com','general_manager'),active:false});
 await assertFails(getDoc(doc(identity('gm'),'invoices/example')));
});
test('seller can sell but cannot see payroll, delete invoices or grant themselves privileges',async()=>{
 const db=identity('seller');
 await assertSucceeds(getDoc(doc(db,'invoices/example')));
 await assertSucceeds(setDoc(doc(db,'invoices/new'),{invoiceNumber:'MP2'}));
 await assertFails(getDoc(doc(db,'employees/example')));
 await assertFails(deleteDoc(doc(db,'invoices/example')));
 await assertFails(updateDoc(doc(db,'showroom_roles/seller'),{role:'general_manager'}));
 await assertFails(getDocs(collection(db,'showroom_roles')));
 await assertFails(getDoc(doc(db,'users/legacy')));
});
test('custom read permission is not write permission; users permission cannot be delegated',async()=>{
 const db=identity('custom');
 await assertSucceeds(getDoc(doc(db,'showroom_chat/message')));
 await assertFails(updateDoc(doc(db,'showroom_chat/message'),{text:'changed'}));
 await assertFails(getDoc(doc(db,'invoices/example')));
 await seed('showroom_roles/custom',role('custom@example.com','custom',{'users.write':true}));
 await assertFails(setDoc(doc(db,'showroom_roles/new'),role('new@example.com')));
});
test('disabling a user invalidates subsequent reads and old invites cannot reactivate the role',async()=>{
 const db=identity('seller');
 await assertSucceeds(getDoc(doc(db,'invoices/example')));
 await assertSucceeds(updateDoc(doc(identity('gm'),'showroom_roles/seller'),{active:false}));
 await assertFails(getDoc(doc(db,'invoices/example')));
 await assertFails(updateDoc(doc(db,'showroom_roles/seller'),{active:true}));
});
const invitation=(email,extra={})=>({...role(email),acceptedUid:'',expiresAt:Timestamp.fromMillis(Date.now()+86400000),...extra});
const accept=async(db,uid,email,alter={})=>{
 const batch=writeBatch(db);
 batch.set(doc(db,'showroom_roles/'+uid),{...role(email),...alter});
 batch.update(doc(db,'showroom_staff_invites/'+email),{active:false,acceptedUid:uid});
 return batch.commit();
};
test('verified invite acceptance is atomic and preserves the assigned role',async()=>{
 await seed('showroom_staff_invites/invited@example.com',invitation('invited@example.com'));
 await assertSucceeds(accept(identity('invited'),'invited','invited@example.com'));
 await assertSucceeds(getDoc(doc(identity('invited'),'invoices/example')));
});
test('invite cannot be used unverified, by a different email, after expiry or for an upgraded role',async()=>{
 const email='invited@example.com';
 await seed('showroom_staff_invites/'+email,invitation(email));
 await assertFails(accept(identity('invited',email,false),'invited',email));
 await assertFails(accept(identity('attacker'),'attacker',email));
 await assertFails(accept(identity('invited'),'invited',email,{role:'general_manager'}));
 await assertFails(accept(identity('invited'),'invited',email,{permissions:{'employees.read':true}}));
 await seed('showroom_staff_invites/'+email,invitation(email,{expiresAt:Timestamp.fromMillis(Date.now()-60000)}));
 await assertFails(accept(identity('invited'),'invited',email));
});
test('public users can read catalog but cannot read private data or other customer messages',async()=>{
 const db=env.unauthenticatedContext().firestore();
 await assertSucceeds(getDocs(collection(db,'showroom_rugs')));
 for(const c of ['invoices','employees','showroom_roles','showroom_orders','showroom_chat','signatureTokens'])
  await assertFails(getDocs(collection(db,c)));
 await assertSucceeds(getDoc(doc(identity('customer'),'showroom_chat/message')));
 await assertFails(getDoc(doc(identity('other'),'showroom_chat/message')));
 await assertFails(setDoc(doc(identity('customer'),'showroom_chat/fake-staff'),{ownerUid:'customer',sender:'admin',isAutomated:false,text:'Fake team member'}));
});
const booking=(id,staff='nazif',time='13:00')=>({id,ownerUid:'customer',staffId:staff,manager:staff,name:'Test Customer',email:'customer@example.com',phone:'7035550100',date:'2026-12-15',time,slotTime:time,slotId:staff+'_2026-12-15_'+time,notes:'',status:'pending',createdAt:new Date().toISOString()});
const reserve=(db,b)=>{
 const batch=writeBatch(db);
 batch.set(doc(db,'showroom_appointments/'+b.id),b);
 batch.set(doc(db,'showroom_appointment_slots/'+b.slotId),{staffId:b.staffId,date:b.date,time:b.slotTime,appointmentId:b.id});
 return batch.commit();
};
test('one slot per employee; separate employees can take the same time; lunch is blocked',async()=>{
 const db=identity('customer');
 await assertSucceeds(reserve(db,booking('first')));
 await assertFails(reserve(db,booking('duplicate')));
 await assertSucceeds(reserve(db,booking('other-employee','farid')));
 await assertFails(reserve(db,booking('lunch','farid','13:30')));
 await assertFails(setDoc(doc(db,'showroom_appointments/no-lock'),booking('no-lock','farid','14:00')));
});
test('UI permission policy denies unknown sections and matches role presets',async()=>{
 const source=await readFile('../../lib/access-policy.ts','utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};new Function('exports',js)(exports);
 const staff={uid:'seller',email:'seller@example.com',name:'Seller',role:'seller',active:true,permissions:{'employees.read':true}};
 assert.equal(exports.canAccess(staff,'invoices','write'),true);
 assert.equal(exports.canAccess(staff,'invoices','delete'),false);
 assert.equal(exports.canAccess(staff,'employees'),false);
 assert.equal(exports.canAccess({...staff,active:false},'invoices'),false);
 assert.equal(exports.canAccess({...staff,role:'general_manager'},'users','write'),true);
 assert.equal(exports.canAccess({...staff,role:'general_manager'},'unknown'),false);
 assert.equal(exports.sectionForTab('messages'),'messages');
 assert.equal(exports.sectionForTab('untrusted-tab'),null);
});
