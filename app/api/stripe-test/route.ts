import { NextRequest, NextResponse } from 'next/server';
import { caller } from '@/lib/server/firebase-admin';
import { OWNER_UID, OWNER_EMAIL } from '@/lib/access-policy';
import { classifyFirebaseFailure } from '@/lib/server/firebase-failure.mjs';
import { StripeTestError, testKey, returnOrigin, checkoutParams, sessionResult, stripeRequest } from '@/lib/server/stripe-test.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'no-store'}});
async function owner(req: NextRequest) {
  const user = await caller(req);
  if (!user.email_verified || user.uid !== OWNER_UID || user.email?.toLowerCase() !== OWNER_EMAIL) {
    throw new StripeTestError('Sign in with the verified website owner account to test payments.', 403);
  }
  return user;
}
function failure(error: unknown) {
  if (error instanceof StripeTestError) return json({error: error.message}, error.status);
  const problem = classifyFirebaseFailure(error);
  return json({error: problem.status === 401 ? 'Please sign in again before testing.' : 'The test connection could not be reached. Please try again.'}, problem.status);
}
export async function POST(req: NextRequest) {
  try {
    const user = await owner(req);
    const origin = returnOrigin(req.nextUrl.origin, process.env.NODE_ENV === 'production');
    if (req.headers.get('origin') !== origin) throw new StripeTestError('Please start the test from this website.', 403);
    const attempt = req.headers.get('x-test-attempt') || '';
    if (!/^[a-f0-9-]{36}$/.test(attempt)) throw new StripeTestError('Refresh the page and try again.');
    const session = await stripeRequest(process.env.STRIPE_TEST_SECRET_KEY, '', {
      method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': 'mp-test-' + user.uid + '-' + attempt},
      body: checkoutParams(user.uid, origin),
    });
    sessionResult(session, user.uid);
    const url = new URL(session.url);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new StripeTestError('Invalid Stripe checkout address.', 502);
    return json({url: url.href});
  } catch (error) { return failure(error); }
}
export async function GET(req: NextRequest) {
  try {
    const user = await owner(req);
    const key = testKey(process.env.STRIPE_TEST_SECRET_KEY);
    const id = req.nextUrl.searchParams.get('session_id');
    if (!id) return json({configured: true, test: true});
    if (!/^cs_test_[a-zA-Z0-9]{1,250}$/.test(id)) throw new StripeTestError('Invalid test session.');
    const session = await stripeRequest(key, '/' + encodeURIComponent(id));
    return json(sessionResult(session, user.uid));
  } catch (error) { return failure(error); }
}
