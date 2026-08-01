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

// The season runs until June 1st (exclusive). If we're already past June 1,
// the upcoming season is the one that ends next year. Mirrors hyp-callback.
function seasonEndDate(now: Date): Date {
  const year = now.getUTCMonth() >= 5 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(year, 5, 1)); // June 1
}

// Whole months from `now` until June 1. A partial current month rounds UP to a
// full month, so a coach joining mid-month still pays/commits for that month.
function monthsUntilSeasonEnd(now: Date): number {
  const end = seasonEndDate(now);
  const months = (end.getUTCFullYear() - now.getUTCFullYear()) * 12 + (end.getUTCMonth() - now.getUTCMonth());
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

    // Order carries user + plan + the signed amount so the callback can verify
    // the exact (season-adjusted) sum HYP charged, without recomputing it.
    const order = `${user.id}|${plan}|${Date.now()}|${planDef.amount}`;

    const payParams = new URLSearchParams({
      action: 'APISign',
      What: 'SIGN',
      KEY: apiKey,
      PassP: passp,
      Masof: masof,
      Action: 'pay',
      Amount: String(planDef.amount),
      Info: planDef.info,
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
    if (planDef.hk) {
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
    return json({ url });
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
