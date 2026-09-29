import test from 'node:test';import assert from 'node:assert/strict';
import {packedRug,upsRates} from '../../lib/server/shipping-package.mjs';
test('confirmed measurements apply only to exact SKU, persisted override wins',()=>{
 assert.equal(packedRug({sku:'H.17022'}).weight,'8');
 assert.throws(()=>packedRug({sku:'H.17023',weightLbs:8}),/missing/);
 assert.throws(()=>packedRug({sku:'H.17022',shippingPackage:null}),/missing/);
 assert.equal(packedRug({sku:'H.17022',shippingPackage:{length:30,width:8,height:8,weight:10}}).weight,'10');
});
test('invalid measurements and test/foreign carrier rates cannot reach live checkout',()=>{
 assert.throws(()=>packedRug({sku:'x',shippingPackage:{length:0,width:6,height:6,weight:8}}),/missing/);
 assert.throws(()=>upsRates({test:true,rates:[]}),/Live UPS/);
 const rate={provider:'UPS',currency:'USD',test:false,object_id:'rate1',amount:'12.34',servicelevel:{name:'Ground'}};
 assert.deepEqual(upsRates({test:false,rates:[rate,{...rate,test:true},{...rate,provider:'USPS'},{...rate,currency:'EUR'},{...rate,amount:'NaN'}]}),[{id:'rate1',amount:1234,service:'Ground',days:null}]);
});
