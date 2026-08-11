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

// Billing keys (carried in the Order field) → the DB plan the subscriptions
// table stores (CHECK allows only monthly|annual) and whether the coverage rolls
// monthly (HK recurring) or runs to the end of the season.
// `amount` is only a FALLBACK for legacy orders created before the exact amount
// was embedded in the Order; current orders carry their signed season-adjusted
// amount and that value is authoritative.
const BILLING: Record<string, { amount: number; dbPlan: 'monthly' | 'annual'; rolling: boolean }> = {
  monthly: { amount: 199, dbPlan: 'monthly', rolling: true },
  season_monthly: { amount: 150, dbPlan: 'annual', rolling: true },
  season_full: { amount: 1800, dbPlan: 'annual', rolling: false }, // legacy fallback (old flat price)
  annual: { amount: 1800, dbPlan: 'annual', rolling: false }, // legacy alias
};

// Season pass ("annual") is valid until June 1st. The season year is decided
// in Israel time (mirrors hyp-payment) so a purchase near midnight on the
// month boundary lands in the same season the user was shown.
function seasonEndDate(now: Date): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: 'numeric' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  const month = Number(parts.month) - 1; // 0-based; month 5 = June
  const year = month >= 5 ? Number(parts.year) + 1 : Number(parts.year);
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

    // ── Parse Order early ──
    // HYP strips non-alphanumeric characters when echoing Order back (pipes
    // vanish), so the current format is pure alphanumeric with FIXED-WIDTH
    // parts (see hyp-payment): uuid32 + plan char + trial flag + ts36(9) +
    // amount digits. The legacy pipe format is still parsed as a fallback in
    // case a pipe-preserving path (e.g. a server notification) delivers it.
    const PLAN_CODES: Record<string, string> = { m: 'monthly', s: 'season_monthly', f: 'season_full' };
    let userId = '';
    let billingKey = '';
    let signedAmountRaw = '';
    let isTrial = false;
    const fixedWidth = order.match(/^([0-9a-fA-F]{32})([msf])([TN])([0-9a-z]{9})(\d+)$/);
    if (fixedWidth) {
      const u = fixedWidth[1];
      userId = `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20)}`;
      billingKey = PLAN_CODES[fixedWidth[2]];
      isTrial = fixedWidth[3] === 'T';
      signedAmountRaw = fixedWidth[5];
    } else {
      const orderParts = order.split('|');
      userId = orderParts[0] || '';
      billingKey = orderParts[1] || '';
      signedAmountRaw = orderParts[3] || '';
      isTrial = orderParts[4] === 'trial' || orderParts[4] === 'T';
    }

    // Trial orders are Postpone transactions: HYP returns CCode=800 ("held,
    // awaiting finalization"), NOT 0. We never commit the held transaction —
    // the card is only verified, and billing happens later via the saved token.
    if (ccode !== '0' && !(isTrial && ccode === '800')) {
      // Payment failed or was cancelled at HYP — nothing to activate. The raw
      // Order is logged so a mangled/truncated field is diagnosable.
      console.error(`Payment not completed: ccode=${ccode} trial=${isTrial} order="${order}" tx=${transactionId}`);
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
    if (verifyCode !== '0' && !(isTrial && ccode === '800')) {
      console.error('HYP VERIFY failed:', verifyText.slice(0, 300));
      return json({ ok: false, error: 'אימות התשלום נכשל — פנה לתמיכה' }, 400);
    }
    if (verifyCode !== '0') {
      // Postponed (CCode=800) trial transaction: APISign VERIFY is documented
      // for COMPLETED transactions and fails on held ones. Authenticity is
      // proven by getToken below instead — only a transaction that really
      // exists on OUR terminal can yield a card token, and a forged trial
      // moves no money (nothing is charged, one trial per user ever).
      console.warn(`VERIFY non-zero for held trial tx ${transactionId} — relying on getToken proof:`, verifyText.slice(0, 200));
    }

    // The signed amount is the season-adjusted sum computed at payment time
    // (150₪ × monthsRemaining for the full pass). It rides inside the Order,
    // which HYP echoes back and includes in the signature we just verified.
    const billing = BILLING[billingKey];
    if (!userId || !billing) {
      console.error('Bad Order field:', order);
      return json({ ok: false, error: 'הזמנה לא מזוהה — פנה לתמיכה עם מספר עסקה ' + transactionId }, 400);
    }

    // Expected amount: the signed amount from the Order (falls back to the
    // static price for any legacy order created before amounts were embedded).
    const expectedAmount = signedAmountRaw ? Math.round(parseFloat(signedAmountRaw)) : billing.amount;
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      console.error('Bad signed amount in Order:', order);
      return json({ ok: false, error: 'הזמנה לא תקינה — פנה לתמיכה' }, 400);
    }
    // The amount HYP actually charged must match the signed expected amount.
    if (Math.round(parseFloat(amount)) !== expectedAmount) {
      console.error(`Amount mismatch: got ${amount}, expected ${expectedAmount} for ${billingKey}`);
      return json({ ok: false, error: 'סכום לא תואם — פנה לתמיכה' }, 400);
    }

    // ── Activate subscription (service role — bypasses RLS) ──
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Replay protection: claim this transaction id atomically. If it was
    //    already processed, do not re-activate — return the existing result.
    const { error: claimError } = await admin
      .from('hyp_processed_transactions')
      .insert({ transaction_id: transactionId, user_id: userId, billing_key: billingKey, amount: expectedAmount });
    if (claimError) {
      // Primary-key conflict → already handled. Idempotent success.
      if ((claimError as { code?: string }).code === '23505') {
        return json({ ok: true, plan: billing.dbPlan, transaction_id: transactionId, replay: true });
      }
      console.error('Transaction claim failed:', claimError);
      return json({ ok: false, error: 'שגיאה בעיבוד התשלום — פנה לתמיכה עם מספר עסקה ' + transactionId }, 500);
    }

    const now = new Date();

    if (isTrial) {
      // ── 7-day free trial: no money moved (Postpone transaction). Pull the
      //    card token from HYP so the cron biller can charge it at trial end.
      const tokenParams = new URLSearchParams({
        action: 'getToken',
        Masof: masof,
        PassP: passp,
        TransId: transactionId,
        // The trial transaction is held (CCode=800), not a completed charge —
        // allowFalse lets HYP return the token for non-completed transactions.
        allowFalse: 'True',
      });
      const tokenRes = await fetch(`${HYP_BASE}?${tokenParams.toString()}`);
      const tokenText = await tokenRes.text();
      const tokenOut = new URLSearchParams(tokenText);
      const cardToken = tokenOut.get('Token');
      const cardTokef = tokenOut.get('Tokef');
      if (!cardToken || !cardTokef) {
        console.error('HYP getToken failed:', tokenText.slice(0, 300));
        return json({ ok: false, error: 'שמירת אמצעי התשלום נכשלה — פנה לתמיכה עם מספר עסקה ' + transactionId }, 500);
      }

      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 7);
      // Access lasts a bit past the charge moment so an hourly cron / retry
      // never locks out a paying user mid-day.
      const accessEnd = new Date(trialEnd);
      accessEnd.setDate(accessEnd.getDate() + 2);

      const { error: trialUpsertError } = await admin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          status: 'trial',
          plan: billing.dbPlan,
          billing_key: billingKey,
          start_date: now.toISOString(),
          end_date: accessEnd.toISOString(),
          trial_started_at: now.toISOString(),
          next_charge_at: trialEnd.toISOString(),
          card_token: cardToken,
          card_tokef: cardTokef,
          charge_attempts: 0,
          hk_id: null,
          cancelled_at: null,
        }, { onConflict: 'user_id' });

      if (trialUpsertError) {
        console.error('Trial upsert failed:', trialUpsertError);
        return json({ ok: false, error: 'האימות הצליח אך פתיחת תקופת הניסיון נכשלה — פנה לתמיכה עם מספר עסקה ' + transactionId }, 500);
      }

      console.log(`Trial started: user=${userId} billing=${billingKey} tx=${transactionId} first charge=${trialEnd.toISOString()}`);
      return json({ ok: true, trial: true, plan: billing.dbPlan, trial_end: trialEnd.toISOString(), transaction_id: transactionId });
    }

    const endDate = billing.rolling ? monthlyEndDate(now) : seasonEndDate(now);

    // HYP returns the standing-order agreement id (HKId) on HK purchases.
    // We store it so the user can self-cancel later (HKStatus NewStat=1).
    const hkId = hypParams['HKId'] || hypParams['HkId'] || null;

    const { error: upsertError } = await admin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: 'active',
        plan: billing.dbPlan,
        billing_key: billingKey,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        hk_id: hkId,
        cancelled_at: null, // a fresh purchase always clears any past cancellation
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Subscription upsert failed:', upsertError);
      return json({ ok: false, error: 'התשלום התקבל אך עדכון המנוי נכשל — פנה לתמיכה עם מספר עסקה ' + transactionId }, 500);
    }

    console.log(`Subscription activated: user=${userId} billing=${billingKey} plan=${billing.dbPlan} tx=${transactionId} until=${endDate.toISOString()}`);
    return json({ ok: true, plan: billing.dbPlan, end_date: endDate.toISOString(), transaction_id: transactionId });
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
