import 'server-only';
import Stripe from 'stripe';
import {NextRequest, NextResponse} from 'next/server';
import {requireStaff} from '@/lib/server/staff-permission';
import {orderFlags} from '@/lib/server/live-payment';
import {OWNER_UID, OWNER_EMAIL} from '@/lib/access-policy';
import {inspectLiveConnection, liveSecret, LiveConnectionError} from '@/lib/server/stripe-live-status.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const respond = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: {'Cache-Control': 'private, no-store', 'Vary': 'Authorization'},
});

export async function GET(req: NextRequest) {
  // Authenticate and authorize before reading secrets or contacting Stripe.
  try {
    const user = await requireStaff(req, 'settings', 'read');
    if (!user.email_verified || user.uid !== OWNER_UID || user.email?.toLowerCase() !== OWNER_EMAIL) {
      return respond({error: 'Only the Marco Polo Rugs owner can check payment setup.'}, 403);
    }
  } catch {
    return respond({error: 'Sign in with your authorized Marco Polo Rugs owner account.'}, 403);
  }
  try {
    const stripe = new Stripe(liveSecret(process.env.STRIPE_LIVE_SECRET_KEY), {maxNetworkRetries: 1, timeout: 10000});
    const status = await inspectLiveConnection(() => stripe.accounts.retrieve(null), process.env.STRIPE_LIVE_WEBHOOK_SECRET);
    return respond({...status, quotesEnabled: orderFlags().quotesEnabled, checkoutEnabled: orderFlags().paymentsEnabled && status.paymentsEnabled && status.payoutsEnabled});
  } catch (error) {
    return respond({error: error instanceof LiveConnectionError ? error.message : 'Payment setup could not be checked. Please retry.'}, 503);
  }
}
