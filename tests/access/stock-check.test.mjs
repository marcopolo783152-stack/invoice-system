import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {stockRows,unsoldRow,stockPrint,stockExcelRows,safePhoto} from '../../lib/stock-check.mjs';
const require=createRequire(import.meta.url);
test('stock checklist retains every matching record across pages, sorted by SKU, and excludes only closed stock',()=>{
 const items=Array.from({length:155},(_,i)=>({id:'rug'+i,sku:'H'+(155-i),name:'Runner',availability:i===0?'Sold':i===1?'On Hold':'In Stock'}));
 const before=structuredClone(items),rows=stockRows(items,'Website');assert.equal(rows.length,155);assert.equal(rows[0].sku,'H1');assert.equal(rows.filter(unsoldRow).length,154);assert.ok(rows.filter(unsoldRow).some(r=>r.status==='On Hold'));assert.deepEqual(items,before);
});
test('store inventory includes dimensions, service status and location without internal costs',()=>{
 const rows=stockRows([{id:'1',sku:'MP10',description:'Wool rug',widthFeet:4,widthInches:6,lengthFeet:7,lengthInches:8,status:'OUT_FOR_SERVICE',zone:'A2',importCost:123}], 'Store');assert.equal(rows[0].size,'4\' 6" × 7\' 8"');assert.equal(rows[0].location,'A2');assert.equal(unsoldRow(rows[0]),true);assert.equal(rows[0].importCost,undefined);
});
test('print escapes inventory text and denies active image URLs while leaving check boxes blank',()=>{
 const rows=stockRows([{id:'x',sku:'<script>alert(1)</script>',name:'" onerror="bad',images:['javascript:alert(1)'],availability:'In Stock'}],'Store');const html=stockPrint(rows,'Store','Now');assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>'),false);assert.equal(html.includes('<img'),false);assert.ok(html.includes('Sold in person'));assert.equal(safePhoto('data:image/svg+xml,<svg/>'),'');assert.equal(safePhoto('https://example.com/rug.jpg'),'https://example.com/rug.jpg');
});
test('Excel worksheet has editable check fields, preserves SKU text and never executes formulas',()=>{
 const rows=stockRows([{id:'a',sku:'=HYPERLINK("evil")',name:'+123',status:'AVAILABLE',image:'data:image/png;base64,a'}],'Store');const data=stockExcelRows(rows),x=require('xlsx'),sheet=x.utils.json_to_sheet(data);assert.equal(data[0].Found,'');assert.equal(data[0]['Sold in person'],'');assert.equal(data[0]['Photo link'],'');assert.equal(sheet.B2.t,'s');assert.equal(sheet.B2.f,undefined);assert.equal(sheet.B2.v,rows[0].sku);
});
