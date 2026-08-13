// hyp-payment: creates a signed HYP (Yaad Pay) payment URL for the authenticated user.
// The HYP credentials live only in Supabase secrets — never in client code.
//
// POST { plan: 'monthly' | 'season_monthly' | 'season_full' }
// → { url: 'https://pay.hyp.co.il/p/?action=pay&...signed...' }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const HYP_BASE = 'https://pay.hyp.co.il/p/';

// Server-side source of truth for pricing — the client never sends amounts.
const PRICE_PER_MONTH = 150; // season price per month
const MONTHLY_PRICE = 199; // open-ended monthly plan

// Current year/month in Israel time. Customers see prices computed in their
// local (Israel) timezone — the server must count months the same way, or a
// purchase made around midnight on the 1st charges more than was displayed.
function israelYearMonth(now: Date): { year: number; month: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: 'numeric' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { year: Number(parts.year), month: Number(parts.month) - 1 }; // 0-based month
}

// Whole months from now (Israel time) until June 1 (month 5, exclusive).
// A partial current month rounds UP to a full month.
function monthsUntilSeasonEnd(now: Date): number {
  const { year, month } = israelYearMonth(now);
  const endYear = month >= 5 ? year + 1 : year;
  const months = (endYear - year) * 12 + (5 - month);
  return Math.max(1, months);
}

// Build the plan definition for the current moment. Season amounts scale by the
// number of months left until the end of the season:
//   season_full    → one payment of 150₪ × monthsRemaining
//   season_monthly → 150₪/month recurring, limited to monthsRemaining charges (Tash)
function planFor(plan: string, now: Date):
  | { amount: number; info: string; hk: boolean; tash: number; months: number }
  | null {
  const n = monthsUntilSeasonEnd(now);
  switch (plan) {
    case 'monthly':
      return { amount: MONTHLY_PRICE, info: 'TacticanPro - מנוי חודשי מתחדש', hk: true, tash: 999, months: 0 };
    case 'season_monthly':
      return { amount: PRICE_PER_MONTH, info: `TacticanPro - מנוי עונתי (תשלום חודשי, ${n} חודשים)`, hk: true, tash: n, months: n };
    case 'season_full':
      return { amount: PRICE_PER_MONTH * n, info: `TacticanPro - מנוי עונתי (תשלום מלא, ${n} חודשים)`, hk: false, tash: 0, months: n };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const masof = Deno.env.get('HYP_MASOF');
    const apiKey = Deno.env.get('HYP_API_KEY');
    const passp = Deno.env.get('HYP_PASSP');
    if (!masof || !apiKey || !passp) {
      return json({ error: 'HYP credentials not configured' }, 500);
    }

    // Authenticate the user from the JWT
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'לא מחובר — יש להתחבר כדי לרכוש מנוי' }, 401);
    }

    const { plan } = await req.json().catch(() => ({}));
    const planDef = planFor(plan, new Date());
    if (!planDef) {
      return json({ error: 'מסלול לא תקין' }, 400);
    }

    // 7-day free trial: first-time subscribers get their card verified (HYP
    // Postpone — no charge) and saved as a token; the cron biller charges it
    // when the trial ends. One trial per user, and never on top of an active
    // subscription. RLS lets the authed client read only the user's own row.
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('status, trial_started_at')
      .eq('user_id', user.id)
      .maybeSingle();
    const trial = !existingSub?.trial_started_at
      && existingSub?.status !== 'active'
      && existingSub?.status !== 'trial';

    // Order carries user + plan + the signed amount so the callback can verify
    // the exact (season-adjusted) sum HYP charged, without recomputing it.
    // HYP STRIPS NON-ALPHANUMERIC CHARACTERS from Order when echoing it back
    // (pipes vanished in production redirects), so the field is encoded as
    // pure alphanumeric with FIXED-WIDTH parts — no separators:
    //   [0..31]  user uuid, dashes removed
    //   [32]     plan: m=monthly s=season_monthly f=season_full
    //   [33]     trial flag: T=trial N=normal
    //   [34..42] timestamp, base36 padded to 9
    //   [43..]   signed amount, digits
    const PLAN_CODES: Record<string, string> = { monthly: 'm', season_monthly: 's', season_full: 'f' };
    const ts36 = Date.now().toString(36).padStart(9, '0');
    const order = `${user.id.replace(/-/g, '')}${PLAN_CODES[plan]}${trial ? 'T' : 'N'}${ts36}${planDef.amount}`;

    // Record the minted Order server-side. Trial callbacks can't rely on
    // APISign VERIFY (it fails for held/Postpone transactions), so hyp-callback
    // instead requires the Order to exist here and match the user — otherwise
    // a forged Order string could re-point a real held transaction at another
    // account's subscription row.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error: mintError } = await adminClient
      .from('hyp_minted_orders')
      .insert({ order_id: order, user_id: user.id, plan, trial, amount: planDef.amount });
    if (mintError) {
      console.error('Order mint record failed:', mintError);
      return json({ error: 'שגיאה ביצירת עמוד התשלום — נסה שוב' }, 500);
    }

    // On a trial, HYP's hosted page is the last thing the customer sees before
    // entering a card — its button text can't be customized, so the trial terms
    // go into the transaction description (Info), which the page displays.
    let info = planDef.info;
    if (trial) {
      const firstCharge = new Date();
      firstCharge.setDate(firstCharge.getDate() + 7);
      const firstChargeStr = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', year: 'numeric' }).format(firstCharge);
      info = `${planDef.info} - 7 ימי ניסיון חינם, ללא חיוב היום. החיוב הראשון: ${firstChargeStr}`;
    }

    const payParams = new URLSearchParams({
      action: 'APISign',
      What: 'SIGN',
      KEY: apiKey,
      PassP: passp,
      Masof: masof,
      Action: 'pay',
      Amount: String(planDef.amount),
      Info: info,
      Order: order,
      UTF8: 'True',
      UTF8out: 'True',
      Coin: '1', // ILS
      MoreData: 'True',
      PageLang: 'HEB',
      sendemail: 'True',
      SendHesh: 'True',
      email: user.email || '',
      Sign: 'True',
      // Template 3: no address/city/zip fields (tested empirically) —
      // still collects first/last name + email, which the invoice needs.
      tmp: '3',
    });
    if (trial) {
      // Trial: verify + hold the transaction without charging (Postpone).
      // No HK — after the trial, all charges run server-side via the saved
      // token (charge-due-subscriptions), including monthly renewals.
      payParams.set('Postpone', 'True');
    } else if (planDef.hk) {
      // הוראת קבע — recurring charge (requires HK enabled on the terminal).
      // Tash caps the number of charges: 999 = open-ended (monthly plan),
      // or exactly monthsRemaining for the season plan so it stops at June.
      payParams.set('HK', 'True');
      payParams.set('freq', 'monthly');
      payParams.set('Tash', String(planDef.tash));
      payParams.set('OnlyOnApprove', 'True');
    }

    const signRes = await fetch(`${HYP_BASE}?${payParams.toString()}`);
    const signedQuery = await signRes.text();

    if (!signRes.ok || !signedQuery || signedQuery.includes('CCode=902') || signedQuery.includes('CCode=903')) {
      console.error('HYP sign failed:', signRes.status, signedQuery.slice(0, 300));
      return json({ error: 'שגיאה ביצירת עמוד התשלום — נסה שוב או פנה לתמיכה' }, 502);
    }

    const url = `${HYP_BASE}?action=pay&${signedQuery}`;
    return json({ url, trial });
  } catch (e) {
    console.error('hyp-payment error:', e);
    return json({ error: 'שגיאה פנימית' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
