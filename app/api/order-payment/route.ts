import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {caller,serverDb} from '@/lib/server/firebase-admin';
import {canAccess,OWNER_UID,OWNER_EMAIL,StaffAccess} from '@/lib/access-policy';
import {classifyFirebaseFailure} from '@/lib/server/firebase-failure.mjs';
export const runtime='nodejs';
export async function DELETE(req:NextRequest){
 try{
  const user=await caller(req);
  if(!user.email_verified)return NextResponse.json({error:'Verify your email first.'},{status:403});
  const db=serverDb(),role=(await db.doc('showroom_roles/'+user.uid).get()).data();
  const owner=user.uid===OWNER_UID&&user.email?.toLowerCase()===OWNER_EMAIL;
  const staff:StaffAccess|null=role&&role.email?.toLowerCase()===user.email?.toLowerCase()&&(role.active===true||(owner&&role.active!==false))&&(role.role!=='admin'||owner)?{uid:user.uid,email:user.email||'',name:role.name||'',role:role.role,active:true,permissions:role.permissions||{}}:null;
  if(!canAccess(staff,'orders','delete'))return NextResponse.json({error:'You do not have permission to remove payment details.'},{status:403});
  const orderId=req.nextUrl.searchParams.get('orderId')||'';
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(orderId))return NextResponse.json({error:'Invalid order.'},{status:400});
  const ref=db.doc('showroom_orders/'+orderId);
  const exists=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);if(!snap.exists)return false;
   tx.update(ref,{paymentDetails:FieldValue.delete(),paymentDetailsRemovedAt:new Date().toISOString()});return true;
  });
  return NextResponse.json(exists?{ok:true}:{error:'Order not found.'},{status:exists?200:404,headers:{'Cache-Control':'no-store'}});
 }catch(error){const failure=classifyFirebaseFailure(error);console.error('[order-payment-delete]',failure.diagnostic);return NextResponse.json({error:'Payment details could not be removed. Please try again.'},{status:failure.status});}
}
