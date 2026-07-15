// hyp-callback: receives HYP (Yaad Pay) payment result parameters, verifies the
// signature server-to-server against HYP, and on success activates the user's
// subscription. Called by the success page (browser redirect params forwarded)
// and can also be set as the terminal's server notification URL.
//
// Accepts GET (query params from HYP) or POST { params: { ...allHypParams } }.
// → { ok: true, plan, end_date } | { ok: false, error }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const HYP_BASE = 'https://pay.hyp.co.il/p/';

// Season pass ("annual") is valid until June 1st. If we're already past June 1,
// the pass covers the season ending next year.
function seasonEndDate(now: Date): Date {
  const year = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear(); // month 5 = June
  return new Date(Date.UTC(year, 5, 1)); // June 1
}

function monthlyEndDate(now: Date): Date {
  const d = new Date(now);
  d.setMonth(d.getMonth() + 1);
  d.setDate(d.getDate() + 3); // grace days for HK charge processing
  return d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const masof = Deno.env.get('HYP_MASOF');
    const apiKey = Deno.env.get('HYP_API_KEY');
    const passp = Deno.env.get('HYP_PASSP');
    if (!masof || !apiKey || !passp) return json({ ok: false, error: 'HYP credentials not configured' }, 500);

    // Collect the HYP result params from GET query or POST body
    let hypParams: Record<string, string> = {};
    if (req.method === 'GET') {
      new URL(req.url).searchParams.forEach((v, k) => { hypParams[k] = v; });
    } else {
      const body = await req.json().catch(() => ({}));
      hypParams = body?.params || {};
    }

    const ccode = hypParams['CCode'];
    const order = hypParams['Order'] || '';
    const transactionId = hypParams['Id'] || '';
    const amount = hypParams['Amount'] || '';

    if (!transactionId || ccode === undefined) {
      return json({ ok: false, error: 'חסרים נתוני תשלום' }, 400);
    }
    if (ccode !== '0') {
      // Payment failed or was cancelled at HYP — nothing to activate
      return json({ ok: false, error: `התשלום לא הושלם (קוד ${ccode})`, ccode }, 200);
    }

    // ── Verify signature with HYP (server-to-server) ──
    // Send back every param HYP gave us, with APISign VERIFY. CCode=0 → authentic.
    const verifyParams = new URLSearchParams({
      action: 'APISign',
      What: 'VERIFY',
      KEY: apiKey,
      PassP: passp,
      Masof: masof,
    });
    for (const [k, v] of Object.entries(hypParams)) {
      if (!['action', 'What', 'KEY', 'PassP', 'Masof'].includes(k)) verifyParams.append(k, v);
    }
    const verifyRes = await fetch(`${HYP_BASE}?${verifyParams.toString()}`);
    const verifyText = await verifyRes.text();
    const verifyCode = new URLSearchParams(verifyText).get('CCode');
    if (verifyCode !== '0') {
      console.error('HYP VERIFY failed:', verifyText.slice(0, 300));
      return json({ ok: false, error: 'אימות התשלום נכשל — פנה לתמיכה' }, 400);
    }

    // ── Parse Order: userId|plan|timestamp ──
    const [userId, plan] = order.split('|');
    if (!userId || !['monthly', 'annual'].includes(plan)) {
      console.error('Bad Order field:', order);
      return json({ ok: false, error: 'הזמנה לא מזוהה — פנה לתמיכה עם מספר עסקה ' + transactionId }, 400);
    }

    // Amount sanity check against server-side pricing
    const expected = plan === 'monthly' ? 199 : 1800;
    if (Math.round(parseFloat(amount)) !== expected) {
      console.error(`Amount mismatch: got ${amount}, expected ${expected} for ${plan}`);
      return json({ ok: false, error: 'סכום לא תואם — פנה לתמיכה' }, 400);
    }

    // ── Activate subscription (service role — bypasses RLS) ──
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const endDate = plan === 'monthly' ? monthlyEndDate(now) : seasonEndDate(now);

    const { error: upsertError } = await admin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: 'active',
        plan,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Subscription upsert failed:', upsertError);
      return json({ ok: false, error: 'התשלום התקבל אך עדכון המנוי נכשל — פנה לתמיכה עם מספר עסקה ' + transactionId }, 500);
    }

    console.log(`Subscription activated: user=${userId} plan=${plan} tx=${transactionId} until=${endDate.toISOString()}`);
    return json({ ok: true, plan, end_date: endDate.toISOString(), transaction_id: transactionId });
  } catch (e) {
    console.error('hyp-callback error:', e);
    return json({ ok: false, error: 'שגיאה פנימית' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
