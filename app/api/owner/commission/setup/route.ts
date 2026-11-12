import {NextResponse} from 'next/server';
import {requireOwnerAuthenticatorSetup} from '@/lib/server/owner-commission';
import {serverAuth,serverDb} from '@/lib/server/firebase-admin';
import {totpEnablePatch} from '@/lib/retail/owner-gate.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(req:Request){
 try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw Error('Use the showroom website.');
 const user=await requireOwnerAuthenticatorSetup(req),raw=await req.text();
 if(raw.length>1000||JSON.parse(raw).action!=='enableTotp')throw Error('Invalid authenticator setup action.');
 const auth=serverAuth(),account=await auth.getUser(user.uid);
 if(account.multiFactor?.enrolledFactors.some(f=>f.factorId==='totp')&&user.firebase?.sign_in_second_factor!=='totp')throw Error('Verify your existing authenticator before changing its setup.');
 const manager=auth.projectConfigManager(),config=await manager.getProjectConfig(),patch=totpEnablePatch(config);
 if(patch){await manager.updateProjectConfig(patch);await serverDb().collection('owner_commission_setup_audit').add({action:'TOTP provider enabled',by:user.uid,at:new Date().toISOString()});}
 return NextResponse.json({success:true,supportEnabled:true},{headers});
 }catch(e:any){
 const forbidden=['OWNER_ONLY','SIGN_IN_REQUIRED'].includes(e.message),reauth=e.message==='OWNER_REAUTH_REQUIRED';
 const error=forbidden?'Only the primary website owner can set up this authenticator.':reauth?'Re-enter your owner password before connecting the authenticator.':['auth/insufficient-permission','auth/invalid-credential'].includes(e.code)?'The website Firebase service account needs permission to read and update Authentication configuration. Authenticator support could not be enabled.':e.message||'Authenticator setup could not complete.';
 return NextResponse.json({error},{status:forbidden?403:reauth?401:400,headers});
 }
}
