import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
function subscription(){
 const exports={},events=[],roles=[];let authListener,authStopped=false;
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/staff-access.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,JSON,Date,require:n=>n==='firebase/auth'?{onIdTokenChanged:(auth,fn)=>{authListener=fn;return ()=>{authStopped=true;};}}:n==='firebase/firestore'?{doc:(db,c,id)=>({id}),onSnapshot:(ref,next,error)=>{const r={id:ref.id,next,error,stopped:false};roles.push(r);return()=>{r.stopped=true;};}}:n.includes('access-policy')?{OWNER_UID:'owner',OWNER_EMAIL:'owner@example.com'}:{auth:{},db:{}}});
 const stop=exports.subscribeStaff((staff,user,error,loading)=>events.push({staff,user,error,loading}));
 return {events,roles,auth:user=>authListener(user),role:(data,index=roles.length-1)=>roles[index].next({data:()=>data}),fail:(index=roles.length-1)=>roles[index].error(),stop,authStopped:()=>authStopped};
}
const user=(id='worker',extra={})=>({uid:id,email:id+'@example.com',emailVerified:true,isAnonymous:false,displayName:'Worker',...extra});
const role=(id='worker',extra={})=>({email:id+'@example.com',active:true,role:'general_manager',permissions:{},...extra});
test('routine token renewal keeps staff and workspace mounted without a new loading state or role listener',()=>{
 const s=subscription();s.auth(user());s.role(role());const n=s.events.length;
 for(let i=0;i<6;i++)s.auth({...user(),getIdToken:()=>Promise.resolve('fresh-token-'+i)});
 assert.equal(s.events.length,n);assert.equal(s.roles.length,1);assert.equal(s.roles[0].stopped,false);assert.equal(s.events.at(-1).staff.uid,'worker');
});
test('sign-out and account changes immediately clear access and replace the subscription',()=>{
 const s=subscription();s.auth(user());s.role(role());s.auth(user('other'));assert.equal(s.roles[0].stopped,true);assert.equal(s.events.at(-1).loading,true);assert.equal(s.events.at(-1).staff,null);s.role(role('other'));s.auth(null);assert.equal(s.events.at(-1).staff,null);assert.equal(s.events.at(-1).user,null);assert.equal(s.roles[1].stopped,true);
});
test('email verification transitions still load staff access',()=>{
 const s=subscription();s.auth(user('worker',{emailVerified:false}));assert.equal(s.roles.length,0);s.auth(user());assert.equal(s.roles.length,1);s.role(role());assert.equal(s.events.at(-1).staff.uid,'worker');
});
test('live role revocation and permissions changes remain effective between token renewals',()=>{
 const s=subscription();s.auth(user());s.role(role());s.auth(user());s.role(role('worker',{permissions:{orders:'read'}}));assert.equal(s.events.at(-1).staff.permissions.orders,'read');s.role(role('worker',{active:false}));assert.equal(s.events.at(-1).staff,null);
});
test('invalid privileged role is denied and stale role callbacks cannot restore a previous account',()=>{
 const s=subscription();s.auth(user());s.role(role('worker',{role:'admin'}));assert.equal(s.events.at(-1).staff,null);s.auth(user('other'));const n=s.events.length;s.role(role(),0);assert.equal(s.events.length,n);s.stop();assert.equal(s.authStopped(),true);assert.equal(s.roles[1].stopped,true);
});
