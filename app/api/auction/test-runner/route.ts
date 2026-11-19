import {NextResponse} from 'next/server';
import {requireStaff} from '@/lib/server/staff-permission';
import {runTestAuction} from '@/lib/auction/test-runner';
export const maxDuration=60;export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){try{await requireStaff(req,'settings','write');if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Use management.'},{status:403});return await runTestAuction(req);}catch{return NextResponse.json({error:'Staff processing permission required, or processing unavailable.'},{status:403});}}
