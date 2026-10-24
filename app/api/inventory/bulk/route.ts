import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
import {bulkInput,validateProfiles,previewInventoryBatch,applyInventoryBatch} from '@/lib/server/inventory-bulk.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(value:any,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){try{await requireStaff(request,'inventory','read');const d=await serverDb().doc('showroom_settings/inventoryWeights').get();return reply({profiles:d.data()?.profiles||{}});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw Error('Please use the showroom website.');
 const user=await requireStaff(request,'inventory','write'),raw=await request.text();if(raw.length>100000)throw Error('Request too large.');const b=JSON.parse(raw),db=serverDb();
 if(b.action==='profiles'){const profiles=validateProfiles(b.profiles);await db.doc('showroom_settings/inventoryWeights').set({profiles,updatedBy:user.uid,updatedAt:new Date().toISOString()});return reply({profiles});}
 bulkInput(b);if(b.operation==='auction')await requireStaff(request,'settings','write');
 if(b.action==='preview')return reply(await previewInventoryBatch(db,b));
 if(b.action!=='apply')throw Error('Choose preview or apply.');
 return reply(await applyInventoryBatch(db,b,user.uid));
 }catch(e){return failure(e);}}
function failure(e:any){const forbidden=e?.message==='FORBIDDEN',signin=/SIGN_IN_REQUIRED|auth\//.test(e?.message||'');return reply({error:forbidden?'You need permission for this action.':signin?'Please sign in as staff.':e?.code?'Could not save inventory. Please retry.':e.message||'Inventory request failed.'},forbidden?403:signin?401:400);}
