import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutInput} from '../../lib/server/rug-checkout.mjs';
const contact={name:'Test customer',email:'test@example.com',phone:'703-555-0100',shippingAddress:'3260 Duke St, Alexandria, Virginia 22314',billingAddress:'3260 Duke St, Alexandria, VA 22314',billingCountry:'US',shippingCountry:'US',deliveryAddress:{street1:'3260 Duke St',city:'Alexandria',state:'Virginia',zip:' 22314 ',street2:''}};
const input=c=>({items:[{id:'rug-1',quantity:1}],deliveryOption:'Delivery',customerInfo:c});
test('full state names and typed lowercase abbreviations reach checkout with canonical shipping details',()=>{
 for(const state of ['Virginia','virginia',' va ']){const c=checkoutInput(input({...contact,deliveryAddress:{...contact.deliveryAddress,state}})).customerInfo;assert.equal(c.deliveryAddress.state,'VA');assert.equal(c.deliveryAddress.zip,'22314');assert.equal(c.shippingAddress,'3260 Duke St, Alexandria, VA 22314');}
});
test('incomplete contact details identify the field before any order can be created',()=>{
 for(const [key,label] of [['name','full name'],['phone','phone number'],['email','email address'],['billingAddress','billing address']])assert.throws(()=>checkoutInput(input({...contact,[key]:''})),new RegExp(label));
 assert.throws(()=>checkoutInput(input({...contact,deliveryAddress:{...contact.deliveryAddress,state:'invalid'}})),/delivery state/);
 assert.throws(()=>checkoutInput(input({...contact,deliveryAddress:{...contact.deliveryAddress,zip:'123'}})),/ZIP code/);
 assert.throws(()=>checkoutInput(input({...contact,billingCountry:'IR'})),/requires U.S./);
});
