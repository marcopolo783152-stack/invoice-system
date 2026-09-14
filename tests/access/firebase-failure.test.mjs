import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFirebaseFailure as classify} from '../../lib/server/firebase-failure.mjs';
test('missing, expired and revoked credentials require sign-in',()=>{
 for(const error of [Error('SIGN_IN_REQUIRED'),{code:'auth/id-token-expired'},{code:'auth/id-token-revoked'}])assert.equal(classify(error).status,401);
});
test('server credentials and project configuration do not request a new login',()=>{
 for(const error of [{code:'auth/invalid-credential'},{code:'app/invalid-credential'},{code:'auth/insufficient-permission'},Error('SERVER_NOT_CONFIGURED'),Error('FIREBASE_PROJECT_MISMATCH')])assert.equal(classify(error).status,503);
});
test('diagnostics do not copy SDK messages, arbitrary codes or credentials',()=>{
 const secret='private-test-credential';
 for(const error of [{message:secret,code:secret},{message:secret,code:'auth/invalid-credential'},null,{code:'toString'}]){
  assert.ok(!JSON.stringify(classify(error)).includes(secret));
  assert.ok([401,503].includes(classify(error).status));
 }
});
