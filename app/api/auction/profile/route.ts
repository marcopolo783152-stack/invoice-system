import {NextResponse} from 'next/server';
import {caller, serverAuth, serverDb} from '@/lib/server/firebase-admin';
import {validateProfile, bidderRequirements, PUBLIC_BIDDING_ENABLED} from '@/lib/auction/engine.mjs';
export const dynamic = 'force-dynamic';
async function identity(request: Request) {
  const user = await caller(request);
  if (!user.email || user.firebase?.sign_in_provider === 'anonymous') throw Error('SIGN_IN_REQUIRED');
  return serverAuth().getUser(user.uid);
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const unauthorized = /SIGN_IN_REQUIRED|auth\//.test(message);
  return NextResponse.json({error: unauthorized ? 'Please sign in to your customer account.' : 'Unable to load or save your bidder profile. Please try again.'}, {status: unauthorized ? 401 : 503});
}
export async function GET(request: Request) {
  try {
    const user = await identity(request);
    const profile = (await serverDb().doc(`auction_profiles/${user.uid}`).get()).data() || null;
    return NextResponse.json({profile, email: user.email, requirements: bidderRequirements(profile, user.emailVerified, user.phoneNumber, null), publicBiddingEnabled: PUBLIC_BIDDING_ENABLED}, {headers: {'Cache-Control':'no-store'}});
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const user = await identity(request);
    const text = await request.text();
    if (text.length > 5000) return NextResponse.json({error:'Profile is too large.'}, {status:400});
    let profile;
    try { profile = validateProfile(JSON.parse(text)); }
    catch(error) { return NextResponse.json({error: error instanceof Error ? error.message : 'Check the form.'}, {status:400}); }
    // Verification and policy acceptance can never be supplied by the browser.
    const record = {...profile, email:user.email, updatedAt:Date.now()};
    await serverDb().doc(`auction_profiles/${user.uid}`).set(record, {merge:true});
    return NextResponse.json({saved:true});
  } catch (error) { return failure(error); }
}
