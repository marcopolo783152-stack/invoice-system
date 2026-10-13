import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {needsOrderAttention} from '../../lib/order-inbox.mjs';
function provider(orders=[]){
 const effects=[],states=[],sounds=[],listeners={};let index=0,oscillators=0,fetches=0;
 const react={createElement:()=>null,useRef:()=>({current:null}),useEffect:fn=>effects.push(fn),useState:initial=>{const n=index++;states[n]=initial;return [initial,v=>{states[n]=typeof v==='function'?v(states[n]):v;}];}};
 const staff={uid:'worker',role:'general_manager',permissions:{}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/GlobalNotificationProvider.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,{exports,URLSearchParams,Date,Math,Intl,Array,Promise,AbortSignal,encodeURIComponent,setTimeout:()=>1,clearTimeout:()=>{},setInterval:fn=>{listeners.interval=fn;return 1;},clearInterval:()=>{},sessionStorage:{getItem:()=>null,setItem:()=>{}},window:{location:{search:''},addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:()=>{},AudioContext:class{constructor(){oscillators++;}get state(){return 'suspended';}resume(){return Promise.resolve();}}},Audio:class{constructor(src){sounds.push(src);}play(){return Promise.resolve();}},fetch:async()=>{fetches++;return {ok:true,json:async()=>({today:'2026-10-06',alerts:[{id:'rug1',sku:'MPW1'}],planned:[{id:'rug2',updatedAt:'2026-10-06'}]})};},require:n=>n==='react'?{...react,default:react}:n==='firebase/firestore'?{collection:()=>({}),onSnapshot:()=>()=>{}}:n.includes('useStaffAccess')?{useStaffAccess:()=>({staff})}:n.includes('access-policy')?{canAccess:()=>true}:n.includes('StoreContext')?{useStore:()=>({orders,ordersLoading:false,orderLoadError:''})}:n.includes('order-inbox')?{needsOrderAttention}:n.includes('order-reference')?{orderReference:o=>o.orderNumber||o.id}:n.includes('auth')?{auth:{currentUser:{uid:'worker',getIdToken:async()=> 'token'}}}:{}});
 exports.GlobalNotificationProvider({children:null});effects.forEach(fn=>fn());
 return {states,sounds,listeners,oscillators:()=>oscillators,fetches:()=>fetches};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('washing return checks update counts silently across repeated polls without a popup or sound',async()=>{
 const p=provider();await flush();await p.listeners.focus();await flush();assert.ok(p.fetches()>=2);assert.deepEqual(p.sounds,[]);assert.equal(p.oscillators(),0);const summary=p.states.find(v=>v&&typeof v==='object'&&'urgent' in v);assert.equal(summary.urgent,1);assert.equal(summary.planned,1);assert.ok(p.states.filter(Array.isArray).every(v=>v.length===0));
});
test('new order plays the original cash audio and keeps the order toast',async()=>{
 const p=provider([{id:'order-1',orderNumber:'MP-TEST',status:'Confirmed',needsAttention:true,customerInfo:{name:'Buyer'}}]);await flush();assert.deepEqual(p.sounds,['/coin.mp3']);assert.equal(p.oscillators(),0);assert.ok(p.states.some(v=>Array.isArray(v)&&v.some(t=>t.type==='order')));
});
