import {NextResponse} from 'next/server';
// Intentionally no payment or database call. Approval alone must not flip this live.
export async function POST(){return NextResponse.json({error:'Public bidding is not open. Payment approval and launch checks are pending.'},{status:423});}
