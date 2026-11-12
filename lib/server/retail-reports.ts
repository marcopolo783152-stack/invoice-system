import 'server-only';
import {serverDb} from './firebase-admin';
import {calculateInvoice} from '@/lib/calculations';
import {buildRetailRows} from '@/lib/retail/report.mjs';
export async function retailRows(){
 const db=serverDb();async function all(collection:string){const result=await db.collection(collection).limit(20001).get();if(result.size>20000)throw Error('This report exceeds 20,000 records in a source. Request a full accounting export before using totals.');return result.docs.map(d=>({...d.data(),id:d.id}));}
 const [invoices,archived,online,legacy,split]=await Promise.all(['invoices','deletedInvoices','showroom_live_orders','showroom_orders','retail_refund_allocations'].map(all));
 const seen=new Set(invoices.map(i=>i.id)),combined:any[]=[...invoices];for(const i of (archived as any[]).sort((a,b)=>(b.deletedAt?.toMillis?.()||0)-(a.deletedAt?.toMillis?.()||0))){const id=i.originalId||i.id;if(!seen.has(id)){seen.add(id);combined.push({...i,id,archived:true});}}
 return buildRetailRows({invoices:combined,online,legacy,allocations:Object.fromEntries(split.map((s:any)=>[s.id,s]))},calculateInvoice);
}
