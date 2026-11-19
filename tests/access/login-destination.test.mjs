import test from 'node:test';
import assert from 'node:assert/strict';
import {loginDestination} from '../../lib/login-destination.mjs';
const user={uid:'u',email:'person@example.com',emailVerified:true},role={email:user.email,role:'general_manager',active:true};
test('one login distinguishes customers, verified staff, owner, and unverified accounts',()=>{
 assert.equal(loginDestination(user,null),'/account');
 for(const r of ['general_manager','seller','custom'])assert.equal(loginDestination(user,{...role,role:r}),'/admin');
 assert.equal(loginDestination(user,{...role,role:'admin'}),'/account');
 assert.equal(loginDestination(user,{...role,role:'admin'},'',user.uid,user.email),'/admin');
 assert.equal(loginDestination({...user,emailVerified:false},role),'/verify-email');
 for(const r of [{...role,active:false},{...role,email:'other@example.com'},{...role,role:'unknown'}])assert.equal(loginDestination(user,r),'/account');
});
test('customer cannot route into staff pages and staff return paths cannot escape the site',()=>{
 assert.equal(loginDestination(user,null,'/admin/invoices'),'/account');
 assert.equal(loginDestination(user,role,'/admin/invoices'),'/admin/invoices');
 for(const next of ['//evil.example','https://evil.example','/admin/\\evil','/admin/\nunsafe'])assert.equal(loginDestination(user,role,next),'/admin');
});
