import test from 'node:test';
import assert from 'node:assert/strict';
import {isRugOnReviewHold} from '../../lib/catalog-visibility.mjs';
import {checkoutInput, priceCart, rugSessionParams} from '../../lib/server/rug-checkout.mjs';
const customerInfo = {name:'Test',email:'test@example.test',phone:'7034610207',shippingAddress:'3260 Duke St, Alexandria, VA 22314, USA',billingAddress:'3260 Duke St, Alexandria, VA 22314, USA',shippingCountry:'US',billingCountry:'US'};
const input = {items:[{id:'rug-test',quantity:1}],deliveryOption:'Delivery',customerInfo};
const rug = {id:'rug-test',sku:'fixture',name:'Persian design rug',origin:'Turkey',availability:'In Stock',price:100};
test('all three newly reported IDs and SKUs stay held even after origin is changed',()=>{
 for(const id of ['rug-1783796651385','rug-1783796624127','rug-1783796404975']) assert.equal(isRugOnReviewHold({...rug,id}),true);
 for(const sku of ['9224261','197919','2812574']) assert.equal(isRugOnReviewHold({...rug,sku}),true);
});
test('restricted origins and known misspelling blocked; style does not determine origin',()=>{
 for(const origin of ['Iran','Persian','persin','Cuba','North Korea','DPRK','Syria','Crimea','Donetsk','Luhansk','Lugansk','ایران']) {
  assert.equal(isRugOnReviewHold({...rug,origin}),true,origin);
  assert.throws(()=>priceCart(input,[{...rug,origin}]));
 }
 assert.equal(isRugOnReviewHold(rug),false);
 assert.equal(priceCart(input,[rug]).subtotal,10000);
});
test('missing or ambiguous origin fails closed at server pricing',()=>{
 for(const origin of ['',undefined,'Unknown','pure silk','wool']) assert.throws(()=>priceCart(input,[{...rug,origin}]));
});
test('non-US or missing countries rejected for delivery AND pickup before session creation',()=>{
 for(const deliveryOption of ['Delivery','Pickup']) for(const field of ['billingCountry','shippingCountry']) for(const value of [undefined,'','IR','CU','KP','SY','UA','RU','CA']) {
  const c={...customerInfo,[field]:value};
  assert.throws(()=>checkoutInput({...input,deliveryOption,customerInfo:c}));
  assert.throws(()=>rugSessionParams({customerInfo:c},'https://marcopolorugs.com'));
 }
 assert.equal(checkoutInput(input).customerInfo.billingCountry,'US');
});
test('restricted address text rejected even with a US country declaration',()=>{
 for(const field of ['shippingAddress','billingAddress']) for(const address of ['Tehran Iran','Havana Cuba','North Korea','Damascus Syria','Crimea','Donetsk','Luhansk']) {
  assert.throws(()=>checkoutInput({...input,customerInfo:{...customerInfo,[field]:address}}));
 }
});
