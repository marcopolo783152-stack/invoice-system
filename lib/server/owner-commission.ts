import 'server-only';
import {caller,serverDb} from './firebase-admin';
import {OWNER_UID,OWNER_EMAIL} from '@/lib/access-policy';
import {assertOwnerStepUp,assertOwnerEnrollment} from '@/lib/retail/owner-gate.mjs';
export async function requireCommissionOwner(req:Request,maxAge=300){const user=await caller(req);const expiresAt=assertOwnerStepUp(user,{uid:OWNER_UID,email:OWNER_EMAIL},Math.floor(Date.now()/1000),maxAge);const role=(await serverDb().doc('showroom_roles/'+user.uid).get()).data();if(!role||role.active===false||role.role!=='admin'||role.email?.toLowerCase()!==OWNER_EMAIL)throw Error('OWNER_ONLY');return {user,expiresAt};}

export async function requireOwnerAuthenticatorSetup(req:Request){
 const user=await caller(req);assertOwnerEnrollment(user,{uid:OWNER_UID,email:OWNER_EMAIL});
 const role=(await serverDb().doc('showroom_roles/'+user.uid).get()).data();
 if(!role||role.active===false||role.role!=='admin'||role.email?.toLowerCase()!==OWNER_EMAIL)throw Error('OWNER_ONLY');
 return user;
}
