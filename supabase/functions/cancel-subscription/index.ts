// cancel-subscription: lets an authenticated user cancel their own subscription.
//
// Behavior (per the cancellation policy):
//   - Recurring plans (monthly 199 / season_monthly 150): stops the HYP standing
//     order (HKStatus NewStat=1) so the already-billed month is the last charge.
//     Access remains until end_date and simply stops being extended.
//   - Upfront season pass (no HK): nothing to stop at HYP — we record the
//     cancellation so the pass will not renew for the next season. Access
//     remains until the end of the season.
//   - Legacy subscriptions purchased before hk_id was stored: we record the
//     cancellation and return manual=true so the UI tells the user we'll stop
//     the charge manually.
//
// POST (no body needed) → { ok, end_date, manual? , already? } | { ok:false, error }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const HYP_BASE = 'https://pay.hyp.co.il/p/';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const masof = Deno.env.get('HYP_MASOF');
    const passp = Deno.env.get('HYP_PASSP');
    if (!masof || !passp) return json({ ok: false, error: 'HYP credentials not configured' }, 500);

    // Authenticate the user from the JWT
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ ok: false, error: 'לא מחובר — יש להתחבר כדי לבטל מנוי' }, 401);
    }

    // Service role — read + update the user's subscription row
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('status, plan, end_date, hk_id, cancelled_at, card_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('Subscription lookup failed:', subError);
      return json({ ok: false, error: 'שגיאה בשליפת המנוי — נסה שוב' }, 500);
    }
    if (!sub || (sub.status !== 'active' && sub.status !== 'trial')) {
      return json({ ok: false, error: 'לא נמצא מנוי פעיל לביטול' }, 400);
    }
    if (sub.cancelled_at) {
      // Idempotent: already cancelled — return the existing state.
      return json({ ok: true, already: true, end_date: sub.end_date });
    }

    // Stop the standing order at HYP if we have its agreement id.
    // CCode=0 → stopped; 906 → agreement doesn't exist (already stopped) — both fine.
    let manual = false;
    if (sub.hk_id) {
      const stopParams = new URLSearchParams({
        action: 'HKStatus',
        Masof: masof,
        PassP: passp,
        HKId: sub.hk_id,
        NewStat: '1',
      });
      const stopRes = await fetch(`${HYP_BASE}?${stopParams.toString()}`);
      const stopText = await stopRes.text();
      const stopCode = new URLSearchParams(stopText).get('CCode');
      if (stopCode !== '0' && stopCode !== '906') {
        console.error('HYP HKStatus stop failed:', stopRes.status, stopText.slice(0, 300));
        return json({ ok: false, error: 'עצירת החיוב מול חברת הסליקה נכשלה — פנה לתמיכה' }, 502);
      }
    } else if (sub.card_token) {
      // Token-billed subscription (trial flow): all charges are made by our
      // cron — clearing next_charge_at below stops billing. No HYP call needed.
    } else {
      // No hk_id stored: either an upfront season pass (no HK exists) or a
      // legacy recurring subscription (HK exists but id unknown → manual stop).
      manual = true;
    }

    const { error: updateError } = await admin
      .from('subscriptions')
      .update({ cancelled_at: new Date().toISOString(), next_charge_at: null })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Cancellation update failed:', updateError);
      return json({ ok: false, error: 'החיוב נעצר אך רישום הביטול נכשל — פנה לתמיכה' }, 500);
    }

    console.log(`Subscription cancelled: user=${user.id} plan=${sub.plan} hk=${sub.hk_id || 'none'} manual=${manual}`);
    return json({ ok: true, end_date: sub.end_date, manual });
  } catch (e) {
    console.error('cancel-subscription error:', e);
    return json({ ok: false, error: 'שגיאה פנימית' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
