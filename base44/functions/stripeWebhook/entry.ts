import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_TO_PLAN = {
  'price_1T2ceeRYeucxdL3H7arllXPc': 'starter',
  'price_1T2ceeRYeucxdL3Hqsu7Lmlp': 'pro',
  'price_1T2ceeRYeucxdL3Hwqmduba3': 'club',
};

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_email || session.customer_details?.email;
      
      // Get the price ID from line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      const planName = PRICE_TO_PLAN[priceId] || 'starter';

      if (customerEmail) {
        // Find the user and update their subscription_plan
        const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_plan: planName,
            subscription_status: 'active',
            stripe_customer_id: session.customer,
          });
          console.log(`Updated subscription for ${customerEmail} to ${planName}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Find user by stripe_customer_id
      const users = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: customerId });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          subscription_plan: null,
          subscription_status: 'cancelled',
        });
        console.log(`Cancelled subscription for customer ${customerId}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});