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
// The season pass can be paid either monthly (150₪ recurring) or in full (1,800₪).
const PLANS: Record<string, { amount: number; info: string; hk: boolean }> = {
  monthly: { amount: 199, info: 'TacticanPro - מנוי חודשי מתחדש', hk: true },
  season_monthly: { amount: 150, info: 'TacticanPro - מנוי עונתי (תשלום חודשי)', hk: true },
  season_full: { amount: 1800, info: 'TacticanPro - מנוי עונתי (תשלום מלא)', hk: false },
};

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
    const planDef = PLANS[plan];
    if (!planDef) {
      return json({ error: 'מסלול לא תקין' }, 400);
    }

    // Order carries user + plan so the callback knows what to activate.
    const order = `${user.id}|${plan}|${Date.now()}`;

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
      // הוראת קבע — monthly recurring charge (requires HK enabled on the terminal)
      payParams.set('HK', 'True');
      payParams.set('freq', 'monthly');
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
