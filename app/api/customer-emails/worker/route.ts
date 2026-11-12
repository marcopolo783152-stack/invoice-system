import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {runCustomerEmailWorker} from '@/lib/server/customer-emails';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET?.trim(),expected=Buffer.from('Bearer '+(secret||'')),actual=Buffer.from(request.headers.get('authorization')||'');
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:'Scheduler authorization required.'},{status:401});
 try{return NextResponse.json(await runCustomerEmailWorker(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Email processing failed. Saved events are retained.'},{status:503});}
}
