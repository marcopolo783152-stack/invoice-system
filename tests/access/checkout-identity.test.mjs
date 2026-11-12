import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutIdentity} from '../../lib/server/checkout-identity.mjs';
test('guest access requires an authenticated anonymous session and explicit guest intent',()=>{
 const anon={uid:'guest-1',firebase:{sign_in_provider:'anonymous'}};
 assert.equal(checkoutIdentity(anon,false),null);
 assert.equal(checkoutIdentity(anon,true).uid,'guest-1');
 assert.equal(checkoutIdentity(null,true),null);
});
test('verified Google login proceeds without another verification; password signup must verify',()=>{
 assert.equal(checkoutIdentity({uid:'google',email:'a@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}},false).uid,'google');
 assert.equal(checkoutIdentity({uid:'password',email:'a@example.com',email_verified:false,firebase:{sign_in_provider:'password'}},true),null);
 assert.equal(checkoutIdentity({uid:'password',email:'a@example.com',email_verified:true,firebase:{sign_in_provider:'password'}},false).uid,'password');
});
