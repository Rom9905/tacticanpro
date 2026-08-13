// charge-due-subscriptions: cron-invoked biller for token-based subscriptions
// (the 7-day free-trial flow). Finds every subscription whose next_charge_at
// has arrived and charges its saved HYP card token server-to-server
// (action=soft, Token=True).
//
// Per billing key:
//   monthly        → 199₪ now, then again every month (open-ended)
//   season_monthly → 150₪ now, then monthly until the season ends (June 1)
//   season_full    → one charge of 150₪ × months remaining, then done
//
// On success: status=active, end_date extended, next charge scheduled.
// On failure: retry daily up to 3 attempts, then status=past_due (blocked).
//
// Auth: requires the x-cron-secret header to match the CRON_SECRET secret.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const HYP_BASE = 'https://pay.hyp.co.il/p/';
const PRICE_PER_MONTH = 150; // season price per month
const MONTHLY_PRICE = 199; // open-ended monthly plan
const MAX_ATTEMPTS = 3;
const GRACE_DAYS = 3; // access buffer beyond the paid period, mirrors hyp-callback

// Current year/month in Israel time (mirrors hyp-payment).
function israelYearMonth(now: Date): { year: number; month: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: 'numeric' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { year: Number(parts.year), month: Number(parts.month) - 1 }; // 0-based month
}

// Whole months from now (Israel time) until June 1, partial month rounds UP.
function monthsUntilSeasonEnd(now: Date): number {
  const { year, month } = israelYearMonth(now);
  const endYear = month >= 5 ? year + 1 : year;
  return Math.max(1, (endYear - year) * 12 + (5 - month));
}

// Season pass is valid until June 1st (Israel-time season year).
function seasonEndDate(now: Date): Date {
  const { year, month } = israelYearMonth(now);
  return new Date(Date.UTC(month >= 5 ? year + 1 : year, 5, 1));
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

type Sub = {
  user_id: string;
  billing_key: string;
  card_token: string;
  card_tokef: string; // YYMM
  charge_attempts: number;
  next_charge_at: string | null;
  start_date: string | null;
  trial_started_at: string | null;
  // The exact sum the customer authorized at trial start (see hyp-callback).
  trial_authorized_amount: number | null;
};

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const masof = Deno.env.get('HYP_MASOF');
  const apiKey = Deno.env.get('HYP_API_KEY');
  const passp = Deno.env.get('HYP_PASSP');
  if (!masof || !apiKey || !passp) return json({ ok: false, error: 'HYP credentials not configured' }, 500);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const nowIso = new Date().toISOString();

  // ── Lapse sweep: end access for subscriptions whose paid coverage is over
  //    and nothing will renew them. Two families:
  //    1. Cancelled subs (any kind) — cancel-subscription froze end_date and
  //       stopped future charges; once end_date passes, access ends.
  //    2. Finished non-renewing subs — no HK agreement and no pending token
  //       charge (upfront season pass, or a token sub after its final
  //       season charge); end_date is the season end and nothing extends it.
  //    Uncancelled HK subs are deliberately NOT expired: HYP renews them
  //    autonomously and our end_date does not advance (no webhook), so
  //    expiring them by date would cut off paying customers.
  const { data: lapsedCancelled, error: lapse1Error } = await admin
    .from('subscriptions')
    .update({ status: 'inactive' })
    .in('status', ['active', 'trial'])
    .not('cancelled_at', 'is', null)
    .lt('end_date', nowIso)
    .select('user_id');
  if (lapse1Error) console.error('Cancelled-lapse sweep failed:', lapse1Error);

  const { data: lapsedFinished, error: lapse2Error } = await admin
    .from('subscriptions')
    .update({ status: 'inactive' })
    .eq('status', 'active')
    .is('cancelled_at', null)
    .is('hk_id', null)
    .is('next_charge_at', null)
    .lt('end_date', nowIso)
    .select('user_id');
  if (lapse2Error) console.error('Finished-lapse sweep failed:', lapse2Error);

  const lapsed = (lapsedCancelled?.length || 0) + (lapsedFinished?.length || 0);
  if (lapsed > 0) console.log(`Lapsed to inactive: ${lapsed} subscription(s)`);

  const { data: due, error: dueError } = await admin
    .from('subscriptions')
    .select('user_id, billing_key, card_token, card_tokef, charge_attempts, next_charge_at, start_date, trial_started_at, trial_authorized_amount')
    .in('status', ['trial', 'active', 'past_due'])
    .is('cancelled_at', null)
    .not('card_token', 'is', null)
    .lte('next_charge_at', nowIso)
    .limit(50);

  if (dueError) {
    console.error('Due-subscriptions query failed:', dueError);
    return json({ ok: false, error: 'query failed' }, 500);
  }

  const results: Record<string, string> = {};
  for (const sub of (due || []) as Sub[]) {
    try {
      results[sub.user_id] = await chargeOne(admin, sub, { masof, apiKey, passp });
    } catch (e) {
      console.error(`Charge crashed for user=${sub.user_id}:`, e);
      results[sub.user_id] = 'error';
    }
  }
  return json({ ok: true, processed: (due || []).length, lapsed, results });
});

async function chargeOne(
  admin: ReturnType<typeof createClient>,
  sub: Sub,
  creds: { masof: string; apiKey: string; passp: string },
): Promise<string> {
  const now = new Date();

  // The SEASON the customer bought is the one that was current when they
  // subscribed — anchored to trial/subscription start, never to charge time.
  // Re-deriving it from `now` re-priced trials that crossed June 1st: a
  // season_full picked in late May (authorized 150₪ for 1 month) was charged
  // 150×12 when the trial ended in June.
  const anchor = sub.trial_started_at
    ? new Date(sub.trial_started_at)
    : sub.start_date ? new Date(sub.start_date) : now;
  const seasonEnd = seasonEndDate(anchor);

  // The bought season is already over — there is nothing left to charge for.
  // Lapse instead of taking money for zero coverage.
  const seasonOver = seasonEnd <= now;

  // Amount + coverage for this charge (initialized for the season-over path,
  // which returns before any of these are used)
  let amount = 0;
  let info = '';
  let endDate: Date = now;
  let nextChargeAt: Date | null = null;

  switch (sub.billing_key) {
    case 'monthly':
      amount = MONTHLY_PRICE;
      info = 'TacticanPro - מנוי חודשי מתחדש';
      endDate = addDays(addMonths(now, 1), GRACE_DAYS);
      nextChargeAt = addMonths(now, 1);
      break;
    case 'season_monthly': {
      if (seasonOver) break;
      amount = PRICE_PER_MONTH;
      info = 'TacticanPro - מנוי עונתי (תשלום חודשי)';
      const monthEnd = addDays(addMonths(now, 1), GRACE_DAYS);
      endDate = monthEnd > seasonEnd ? seasonEnd : monthEnd;
      const next = addMonths(now, 1);
      nextChargeAt = next < seasonEnd ? next : null; // last charge of the season
      break;
    }
    case 'season_full': {
      if (seasonOver) break;
      // Charge exactly what the customer authorized at trial start; recompute
      // from the anchor only for legacy rows that predate the column.
      amount = sub.trial_authorized_amount || PRICE_PER_MONTH * monthsUntilSeasonEnd(anchor);
      const n = Math.max(1, Math.round(amount / PRICE_PER_MONTH));
      info = `TacticanPro - מנוי עונתי (תשלום מלא, ${n} חודשים)`;
      endDate = seasonEnd;
      nextChargeAt = null;
      break;
    }
    default:
      console.error(`Unknown billing_key '${sub.billing_key}' for user=${sub.user_id}`);
      return 'bad-billing-key';
  }

  if (seasonOver && sub.billing_key !== 'monthly') {
    const { error } = await admin.from('subscriptions').update({
      status: 'inactive',
      next_charge_at: null,
    }).eq('user_id', sub.user_id);
    if (error) console.error(`Season-over lapse failed for user=${sub.user_id}:`, error);
    console.log(`Season over — lapsed without charging: user=${sub.user_id} billing=${sub.billing_key} season_end=${seasonEnd.toISOString()}`);
    return 'season-ended';
  }

  // ── Pre-charge claim: charging is the irreversible step, so the billing
  //    period must be claimed BEFORE money moves. Without this, overlapping
  //    cron runs (pg_net retry, manual invoke) or a charge whose follow-up
  //    UPDATE failed would bill the same period twice — the audit insert
  //    after the charge can't protect anything because each HYP charge gets
  //    a fresh transaction id. The claim key is user+period; a failed charge
  //    reschedules to a new period (+1 day), so retries mint a new key.
  const periodKey = (sub.next_charge_at || now.toISOString()).slice(0, 10);
  const claimId = `cron:${sub.user_id}:${periodKey}`;
  const { error: claimError } = await admin
    .from('hyp_processed_transactions')
    .insert({ transaction_id: claimId, user_id: sub.user_id, billing_key: sub.billing_key, amount });
  if (claimError) {
    if ((claimError as { code?: string }).code === '23505') {
      console.warn(`Period already claimed, skipping: ${claimId}`);
      return 'already-claimed';
    }
    console.error(`Claim insert failed for ${claimId}:`, claimError);
    return 'claim-failed';
  }

  // Token expiry: Tokef is YYMM
  const tmonth = sub.card_tokef?.slice(2, 4) || '';
  const tyear = sub.card_tokef?.slice(0, 2) || '';

  const chargeParams = new URLSearchParams({
    action: 'soft',
    Masof: creds.masof,
    PassP: creds.passp,
    KEY: creds.apiKey,
    Amount: String(amount),
    CC: sub.card_token,
    Tmonth: tmonth,
    Tyear: tyear,
    Token: 'True',
    Info: info,
    Order: `${sub.user_id}|${sub.billing_key}|cron|${amount}`,
    UserId: '000000000',
    ClientName: 'TacticanPro',
    Coin: '1',
    UTF8: 'True',
    UTF8out: 'True',
    MoreData: 'True',
    sendemail: 'True',
    SendHesh: 'True',
  });

  const res = await fetch(`${HYP_BASE}?${chargeParams.toString()}`);
  const text = await res.text();
  const out = new URLSearchParams(text);
  const ccode = out.get('CCode');
  const txId = out.get('Id') || '';

  if (ccode === '0' && txId) {
    // Audit trail (same table the callback uses for replay protection).
    await admin.from('hyp_processed_transactions')
      .insert({ transaction_id: txId, user_id: sub.user_id, billing_key: sub.billing_key, amount })
      .then(({ error }) => { if (error && (error as { code?: string }).code !== '23505') console.error('Audit insert failed:', error); });

    const { error } = await admin.from('subscriptions').update({
      status: 'active',
      end_date: endDate.toISOString(),
      next_charge_at: nextChargeAt ? nextChargeAt.toISOString() : null,
      charge_attempts: 0,
    }).eq('user_id', sub.user_id);
    if (error) {
      console.error(`Charged but update failed for user=${sub.user_id} tx=${txId}:`, error);
      return 'charged-update-failed';
    }
    console.log(`Charged: user=${sub.user_id} billing=${sub.billing_key} amount=${amount} tx=${txId} until=${endDate.toISOString()}`);
    return 'charged';
  }

  // Charge declined/failed — retry daily, then block.
  const attempts = (sub.charge_attempts || 0) + 1;
  const givingUp = attempts >= MAX_ATTEMPTS;
  console.error(`Charge failed (CCode=${ccode}) user=${sub.user_id} attempt=${attempts}${givingUp ? ' — giving up' : ''}: ${text.slice(0, 200)}`);
  const { error } = await admin.from('subscriptions').update({
    charge_attempts: attempts,
    ...(givingUp
      ? { status: 'past_due', next_charge_at: null }
      : { next_charge_at: addDays(now, 1).toISOString() }),
  }).eq('user_id', sub.user_id);
  if (error) console.error(`Failure update failed for user=${sub.user_id}:`, error);
  return givingUp ? 'past-due' : 'retry-scheduled';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
