import {NextResponse} from 'next/server';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {categorizeRug} from '@/lib/rug-categorization.mjs';
import {weightPatch} from '@/lib/inventory/weight.mjs';
export const runtime='nodejs';
const allowed='name sku price originalPrice sizeCategory categoryMode dimensions origin material style age condition colors shape availability construction description images shippingPackage weightLbs weightMode weightPerSqft isSpecialSale isFreeShipping manufacturingType type color uploadBatchId uploadBatchLabel'.split(' ');
export async function POST(request:Request){try{
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw Error('Please use the showroom website.');
 const user=await requireStaff(request,'inventory','write'),raw=await request.text();if(raw.length>5000000)throw Error('Rug record is too large.');const b=JSON.parse(raw);if(typeof b.id!=='string'||!/^[-\w]{8,100}$/.test(b.id))throw Error('Invalid rug reference.');
 const data:any=Object.fromEntries(allowed.filter(k=>b.rug?.[k]!==undefined).map(k=>[k,b.rug[k]]));if(!data.sku||!data.name||!Number.isFinite(data.price)||data.price<=0||data.price>1000000)throw Error('Enter a name, SKU and positive price.');
 const db=serverDb(),ref=db.doc('showroom_rugs/'+b.id),now=new Date().toISOString();
 const rug=await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(existing.exists){if(existing.data()?.createdBy!==user.uid)throw Error('Rug reference already exists.');return existing.data();}
 const duplicates=await tx.get(db.collection('showroom_rugs').where('sku','==',data.sku).limit(1));if(!duplicates.empty)throw Error('This SKU already exists. Edit the existing rug instead.');
 const setting=await tx.get(db.doc('showroom_settings/inventoryWeights'));const derived=weightPatch(data,setting.data()?.profiles||{}),uploadBatchId=data.uploadBatchId||b.id;
 const saved={...categorizeRug(data),...derived,id:b.id,rating:5,published:true,createdAt:now,uploadedAt:now,publishedAt:now,firstPublishedAt:now,createdBy:user.uid,uploadBatchId,uploadBatchLabel:String(data.uploadBatchLabel||'Single rug upload').slice(0,120),publishBatchId:uploadBatchId,publishBatchLabel:String(data.uploadBatchLabel||'Single rug publication').slice(0,120)};
 tx.create(ref,saved);return saved;});return NextResponse.json({rug});
 }catch(e:any){return NextResponse.json({error:e.message==='FORBIDDEN'?'You need inventory write permission.':e.code?'Could not publish the rug. Please retry.':e.message||'Could not publish the rug.'},{status:e.message==='FORBIDDEN'?403:400});}}
