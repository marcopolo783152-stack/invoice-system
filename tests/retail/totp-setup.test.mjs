import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertOwnerEnrollment,assertOwnerStepUp,totpEnablePatch} from '../../lib/retail/owner-gate.mjs';
const identity={uid:'owner',email:'owner@example.com'};
const user={uid:'owner',email:'owner@example.com',email_verified:true,auth_time:1000,firebase:{sign_in_provider:'password'}};
test('provider bootstrap requires primary owner identity and a fresh password',()=>{
 assert.doesNotThrow(()=>assertOwnerEnrollment(user,identity,1050));
 for(const patch of [{uid:'manager'},{email:'other@example.com'},{email_verified:false},{auth_time:800},{firebase:{sign_in_provider:'google.com'}}])assert.throws(()=>assertOwnerEnrollment({...user,...patch},identity,1050));
});
test('bootstrap approval cannot unlock private commission data without TOTP',()=>{
 assert.doesNotThrow(()=>assertOwnerEnrollment(user,identity,1050));
 assert.throws(()=>assertOwnerStepUp(user,identity,1050),/OWNER_REAUTH_REQUIRED/);
});
test('enabling TOTP preserves the existing SMS state and other provider settings',()=>{
 const config={multiFactorConfig:{state:'ENABLED',factorIds:['phone'],providerConfigs:[{state:'ENABLED',otherProviderConfig:{unchanged:true}}]},unrelated:'keep'};
 const saved=structuredClone(config),patch=totpEnablePatch(config);
 assert.equal(patch.multiFactorConfig.state,'ENABLED');assert.deepEqual(patch.multiFactorConfig.factorIds,['phone']);assert.equal(patch.multiFactorConfig.providerConfigs[0].otherProviderConfig.unchanged,true);
 assert.deepEqual(patch.multiFactorConfig.providerConfigs[1],{state:'ENABLED',totpProviderConfig:{adjacentIntervals:1}});
 assert.deepEqual(config,saved);assert.equal('unrelated' in patch,false);
});
test('enabled TOTP is idempotent; re-enabling keeps the existing interval policy',()=>{
 assert.equal(totpEnablePatch({multiFactorConfig:{providerConfigs:[{state:'ENABLED',totpProviderConfig:{adjacentIntervals:2}}]}}),null);
 const patch=totpEnablePatch({multiFactorConfig:{state:'ENABLED',providerConfigs:[{state:'DISABLED',totpProviderConfig:{adjacentIntervals:2}}]}});
 assert.equal(patch.multiFactorConfig.providerConfigs.length,1);assert.equal(patch.multiFactorConfig.providerConfigs[0].totpProviderConfig.adjacentIntervals,2);
});