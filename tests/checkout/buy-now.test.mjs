import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as delivered from '../../lib/delivered-price.mjs';
const require=createRequire(import.meta.url);
let store;
const stub=()=>null;
const exports={};
const source=ts.transpileModule(fs.readFileSync('components/public/CartView.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
vm.runInNewContext(source,{exports,require:(name)=>{
 if(name==='react'||name==='lucide-react')return require(name);
 if(name==='@/context/StoreContext')return {useStore:()=>store};
 if(name==='@/lib/delivered-price.mjs')return delivered;
 if(name==='@/lib/auth')return {auth:{currentUser:null}};
 if(name==='@/lib/checkout-contact.mjs')return {checkoutContact:()=>({})};
 if(name.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
 if(name==='jspdf')return {jsPDF:class{}};
 return {__esModule:true,default:stub};
}});
const target={id:'target',name:'Selected floral rug',sku:'14537',price:149.99,weightLbs:3,sizeCategory:'Small',dimensions:'2 x 3',availability:'In Stock',images:[]};
const other={...target,id:'other',name:'Other rug already in cart',sku:'OTHER'};
function setup(open=false){const calls=[];store={cart:[{rug:other,quantity:1}],cartOpen:open,setCartOpen:v=>calls.push(['open',v]),removeFromCart:id=>calls.push(['remove',id]),updateCartQuantity:()=>{},checkout:()=>{throw Error('No payment should be made during rendering');},promoCodes:[],shopProfile:{},logoUrl:''};return calls;}
test('Buy Now starts contact details for only the selected rug without opening or changing the existing cart',()=>{
 const calls=setup(),before=JSON.stringify(store.cart);
 const html=renderToStaticMarkup(React.createElement(exports.CartView,{buyNowRug:target,inline:true,onClose:()=>{}}));
 assert.match(html,/Selected floral rug/);assert.doesNotMatch(html,/Other rug already in cart/);assert.match(html,/Contact details/);assert.match(html,/Continue to payment/);assert.match(html,/Apple Pay/);assert.match(html,/Google Pay/);
 assert.equal(JSON.stringify(store.cart),before);assert.deepEqual(calls,[]);assert.doesNotMatch(html,/role="dialog"/);
});
test('the product checkout shows shipping-inclusive price, 6% tax and total before payment',()=>{
 setup();const html=renderToStaticMarkup(React.createElement(exports.CartView,{buyNowRug:target,inline:true}));
 assert.match(html,/155\.99/);assert.match(html,/9\.36/);assert.match(html,/165\.35/);assert.match(html,/Free Shipping/);
});
test('normal cart keeps its own items and dialog and stays closed when requested',()=>{
 setup(false);assert.equal(renderToStaticMarkup(React.createElement(exports.CartView)), '');
 setup(true);const html=renderToStaticMarkup(React.createElement(exports.CartView));assert.match(html,/Other rug already in cart/);assert.doesNotMatch(html,/Selected floral rug/);assert.match(html,/role="dialog"/);assert.match(html,/Your cart/);
});
