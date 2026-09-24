import test from 'node:test';
import assert from 'node:assert/strict';
import {monitorStaffIdle} from '../../lib/staff-idle.mjs';
function setup(storage = new Map()) {
 let time=100000, tick, expired=0; const listeners=new Map();
 const win={localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
 addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k),
 setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;}};
 const stop=monitorStaffIdle({win,userId:'staff',timeoutMs:18000000,onExpire:()=>expired++,now:()=>time});
 return {advance:ms=>time+=ms,check:()=>tick?.(),activity:()=>listeners.get('pointerdown')?.(),stop,get expired(){return expired;},storage,win};
}
test('staff stays signed in until five hours, then expires once',()=>{
 const s=setup();s.advance(17999999);s.check();assert.equal(s.expired,0);
 s.advance(1);s.check();s.check();assert.equal(s.expired,1);
});
test('activity in another tab keeps an idle tab signed in',()=>{
 const s=setup();s.advance(17000000);s.storage.set('marcopolo-staff-activity:staff','17100000');
 s.advance(2000000);s.check();assert.equal(s.expired,0);
 s.advance(16000000);s.check();assert.equal(s.expired,1);
});
test('a resumed expired tab cannot revive the session with activity',()=>{
 const s=setup();s.advance(18000001);s.activity();assert.equal(s.expired,1);
});
test('storage unavailable still supports inactivity and cleanup',()=>{
 const s=setup();s.win.localStorage.getItem=()=>{throw Error('blocked');};s.win.localStorage.setItem=()=>{throw Error('blocked');};
 s.advance(10000);s.activity();s.stop();s.advance(18000000);s.check();assert.equal(s.expired,0);
});
