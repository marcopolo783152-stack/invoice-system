import test from 'node:test';
import assert from 'node:assert/strict';
import {queueEmailRecord,emailDetailRows} from '../../lib/customer-email-queue.mjs';
import {customerEmailEvents,renderCustomerEmail} from '../../lib/customer-email.mjs';
function validateFirestore(value,inArray=false){
 if(Array.isArray(value)){assert.equal(inArray,false,'Firestore cannot store an array directly inside an array');value.forEach(v=>validateFirestore(v,true));}
 else if(value&&typeof value==='object')Object.values(value).forEach(v=>validateFirestore(v,false));
 else assert.notEqual(value,undefined,'Firestore rejects undefined fields');
}
test('real appointment events use Firestore-safe maps and preserve rendered customer details',()=>{
 const now=Date.parse('2026-10-13T16:00:00Z');const current={collection:'showroom_appointments',name:'Customer',email:'c@example.com',createdAt:now,date:'2026-10-14',time:'11:00',manager:'Nazif',address:'3260 Duke Street',status:'confirmed'};
 const events=customerEmailEvents(current,{...current,status:'pending'},now-1000,now);
 assert.equal(events.length,2);
 for(const event of events){assert.throws(()=>validateFirestore(event),/array directly inside/);const queued=queueEmailRecord(event);validateFirestore(queued);assert.deepEqual(emailDetailRows(queued.details),event.details);assert.equal(renderCustomerEmail(queued),renderCustomerEmail(event));}
});
test('refund and service rows retain amounts, ordering and escaping through storage',()=>{
 const message={title:'Your refund',intro:'Confirmed',name:'<Customer>',details:[['This refund','$100.00'],['Total refunded','$250.00'],['Rugs','MPW001 & MPW002']],paragraphs:['Thank you']};const queued=queueEmailRecord(message);validateFirestore(queued);assert.equal(renderCustomerEmail(queued),renderCustomerEmail(message));assert.equal(queued.details[0].value,'$100.00');
});
test('optional detail values become safe empty strings instead of undefined',()=>{const record=queueEmailRecord({details:[['Optional',undefined]]});validateFirestore(record);assert.equal(record.details[0].value,'');});
