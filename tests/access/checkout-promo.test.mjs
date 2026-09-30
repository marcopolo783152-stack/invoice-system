import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutPromo} from '../../lib/server/checkout-promo.mjs';
import {priceCart} from '../../lib/server/rug-checkout.mjs';
const promo={code:'123456',isActive:true,discountType:'fixed',discountValue:2};
test('valid code does not require a minimum cart amount',()=>{
  checkoutPromo(promo,'123456');
  for(const price of [3,19,100,10000]){
    const result=priceCart({items:[{id:'rug',quantity:1}],promoCode:'123456',deliveryOption:'Pickup'},[{id:'rug',price,origin:'Afghanistan',availability:'In Stock'}],promo);
    assert.equal(result.discount,200);
    assert.ok(result.total>=0);
  }
});
test('inactive, expired and consumed codes fail without exposing customer information',()=>{
  for(const p of [null,{...promo,isActive:false},{...promo,validUntil:'2020-01-01'},{...promo,oneTimeUse:true,usedCount:1}])assert.throws(()=>checkoutPromo(p,'123456'));
  const result=checkoutPromo({...promo,usedBy:'private',id:'private'},'123456');assert.equal(result.usedBy,undefined);assert.equal(result.id,undefined);
});
