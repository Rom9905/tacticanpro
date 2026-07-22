import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// The client picks a PLAN, never a raw price. Prices are resolved
// server-side so a caller can't checkout at an arbitrary Stripe price.
const PLAN_TO_PRICE = {
  starter: 'price_1T2ceeRYeucxdL3H7arllXPc',
  pro: 'price_1T2ceeRYeucxdL3Hqsu7Lmlp',
  club: 'price_1T2ceeRYeucxdL3Hwqmduba3',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();
    const priceId = PLAN_TO_PRICE[plan];

    if (!priceId) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Redirect targets are pinned to our own origin — never trust a
    // client-supplied success/cancel URL (open-redirect / phishing).
    const origin = req.headers.get('origin') || '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/`,
      cancel_url: `${origin}/`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});