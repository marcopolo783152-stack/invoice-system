import test from 'node:test';import assert from 'node:assert/strict';import {packingWeight} from '../../lib/packing-weight.mjs';
test('adds pounds, kilograms, and quantities',()=>{assert.deepEqual(packingWeight([{weight:'10 lb',qty:2},{weight:'2 kg',qty:1}]),{pounds:24.41,missing:0});});
test('does not present missing or unknown weights as complete',()=>{assert.deepEqual(packingWeight([{weight:'10 lb',qty:1},{weight:'',qty:1},{weight:'20',qty:1},{weight:'-4 lb',qty:1}]),{pounds:10,missing:3});});
