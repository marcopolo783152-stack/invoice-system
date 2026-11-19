import test from 'node:test';import assert from 'node:assert/strict';import {packingWeight,shipmentWeight,packageLabels} from '../../lib/packing-weight.mjs';
test('adds pounds, kilograms, and quantities',()=>{assert.deepEqual(packingWeight([{weight:'10 lb',qty:2},{weight:'2 kg',qty:1}]),{pounds:24.41,missing:0});});
test('marks missing or unknown weights',()=>{assert.deepEqual(packingWeight([{weight:'10 lb',qty:1},{weight:'',qty:1},{weight:'20',qty:1}]),{pounds:10,missing:2});});
test('total applies to entire shipment once',()=>{assert.deepEqual(shipmentWeight({weightMode:'total',totalWeight:'400',weightUnit:'lb',items:[{weight:'10 lb',qty:5}]}),{label:'400 lb',missing:0});});
test('legacy documents keep item weights and missing information',()=>{assert.deepEqual(shipmentWeight({items:[{weight:'12 lb',qty:2},{weight:'',qty:1}]}),{label:'Known weight: 24 lb',missing:1});});
test('package labels are bounded and reflect package count',()=>{assert.deepEqual(packageLabels(4),['4-1','4-2','4-3','4-4']);assert.deepEqual(packageLabels(1),['1-1']);assert.deepEqual(packageLabels(101),[]);});
