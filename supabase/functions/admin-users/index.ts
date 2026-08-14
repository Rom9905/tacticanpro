// admin-users: privileged admin console operations. Everything here runs with
// the service role (bypassing RLS), so the FIRST thing it does is verify the
// caller is an admin — a regular user's JWT must never reach the actions.
//
// POST { action, ... } with the admin's bearer token. Actions:
//   list                                     → all users merged with real access state
//   set_access { userId|email, grant }       → grant/revoke access via subscriptions
//   create_user { email, password, grant }   → create a confirmed account (+access)
//   set_role { userId, role }                → promote/demote an admin
//   set_password { userId, password }        → set a new password for the user
//   delete_user { userId }                   → delete the user and all their data
//
// "Access" is the subscriptions.status the whole app gates on — NOT
// profiles.access_status, which nothing reads. A manual grant is an 'active'
// row with billing_key='manual' and no end_date/token, so no biller or lapse
// sweep ever touches it.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPER_ADMIN = 'romfranko99@gmail.com';
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // ── Authenticate the caller from their JWT ──
    const authHeader = req.headers.get('Authorization') || '';
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await caller.auth.getUser();
    if (userErr || !user) return json({ error: 'לא מחובר' }, 401);

    const admin = createClient(url, serviceKey);

    // ── Gate: caller MUST be an admin (role=admin, or the super-admin email) ──
    const { data: me } = await admin.from('profiles').select('role, email').eq('id', user.id).maybeSingle();
    const isAdmin = me?.role === 'admin' || me?.email === SUPER_ADMIN || user.email === SUPER_ADMIN;
    if (!isAdmin) return json({ error: 'אין הרשאת אדמין' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ── list ──
    if (action === 'list') {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) return json({ error: 'שגיאה בשליפת המשתמשים' }, 500);
      const authUsers = list.users;
      const ids = authUsers.map((u) => u.id);
      const { data: profiles } = await admin.from('profiles').select('id, full_name, role').in('id', ids);
      const { data: subs } = await admin
        .from('subscriptions')
        .select('user_id, status, plan, billing_key, end_date, cancelled_at')
        .in('user_id', ids);
      const pMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      const sMap = Object.fromEntries((subs || []).map((s) => [s.user_id, s]));

      const users = authUsers
        .map((u) => {
          const s = sMap[u.id];
          return {
            id: u.id,
            email: u.email,
            full_name: pMap[u.id]?.full_name || (u.user_metadata as Record<string, string>)?.full_name || '',
            role: pMap[u.id]?.role || 'user',
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed: !!u.email_confirmed_at,
            status: s?.status || 'inactive',
            plan: s?.plan || null,
            billing_key: s?.billing_key || null,
            end_date: s?.end_date || null,
            cancelled_at: s?.cancelled_at || null,
          };
        })
        .sort((a, b) => new Date(b.last_sign_in_at || 0).getTime() - new Date(a.last_sign_in_at || 0).getTime());

      return json({ ok: true, users });
    }

    // Grant access with nothing but an email address. Picking a row out of a
    // long list is how an admin ends up granting access to a lookalike address
    // (mozangomof@ vs zangomof@) and then testing with the other one, so the
    // console also supports naming the account explicitly. If the person never
    // signed up, create the account for them.
    if (action === 'create_user') {
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '');
      if (!email.includes('@')) return json({ error: 'כתובת אימייל לא תקינה' }, 400);
      if (password.length < 6) return json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, 400);

      const existing = await findUserByEmail(admin, email);
      if (existing) return json({ error: 'כבר קיים חשבון עם האימייל הזה — השתמש בכפתור "תן גישה" בשורה שלו' }, 409);

      // email_confirm: the admin is vouching for this person, and without it
      // they would be stuck at the "email not confirmed" login wall.
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (createErr || !created?.user) {
        console.error('create_user failed:', createErr);
        return json({ error: 'יצירת החשבון נכשלה' }, 500);
      }
      if (body?.grant !== false) {
        const gErr = await grantAccess(admin, created.user.id);
        if (gErr) return json({ error: 'החשבון נוצר אך מתן הגישה נכשל' }, 500);
      }
      return json({ ok: true, created: true, userId: created.user.id, email });
    }

    // ── all remaining actions target a specific user, by id or by email ──
    let userId = body?.userId;
    if (!userId && body?.email) {
      const found = await findUserByEmail(admin, String(body.email).trim().toLowerCase());
      if (!found) return json({ error: 'לא נמצא משתמש עם האימייל הזה' }, 404);
      userId = found.id;
    }
    if (!userId || !UUID_RE.test(userId)) return json({ error: 'מזהה משתמש חסר או לא תקין' }, 400);

    const { data: target } = await admin.auth.admin.getUserById(userId);
    const targetEmail = target?.user?.email;
    if (!targetEmail) return json({ error: 'המשתמש לא נמצא' }, 404);

    if (action === 'set_access') {
      const grant = body?.grant === true;
      if (grant) {
        const err = await grantAccess(admin, userId);
        if (err) return json({ error: 'שגיאה במתן הגישה' }, 500);
        return json({ ok: true, status: 'active', email: targetEmail });
      }
      // Revoke: block access immediately.
      const { error } = await admin.from('subscriptions')
        .update({ status: 'inactive', cancelled_at: new Date().toISOString(), next_charge_at: null })
        .eq('user_id', userId);
      if (error) { console.error('revoke failed:', error); return json({ error: 'שגיאה בשלילת הגישה' }, 500); }
      return json({ ok: true, status: 'inactive', email: targetEmail });
    }

    if (action === 'set_role') {
      const role = body?.role === 'admin' ? 'admin' : 'user';
      if (targetEmail === SUPER_ADMIN && role !== 'admin') {
        return json({ error: 'אי אפשר להוריד את הרשאת האדמין הראשי' }, 400);
      }
      // NOTE: needs migration 20260814000000 — the profiles guard trigger used
      // to revert this write, because it treats a NULL auth.uid() (which is
      // what the service role has) as "not an admin" and pinned the column.
      const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
      if (error) { console.error('set_role failed:', error); return json({ error: 'שגיאה בעדכון התפקיד' }, 500); }
      const { data: check } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (check?.role !== role) {
        return json({ error: 'עדכון התפקיד נחסם במסד הנתונים — יש להריץ את המיגרציה האחרונה' }, 500);
      }
      return json({ ok: true, role });
    }

    if (action === 'set_password') {
      const password = String(body?.password || '');
      if (password.length < 6) return json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) { console.error('set_password failed:', error); return json({ error: 'שגיאה בעדכון הסיסמה' }, 500); }
      return json({ ok: true });
    }

    if (action === 'delete_user') {
      if (targetEmail === SUPER_ADMIN) return json({ error: 'אי אפשר למחוק את חשבון האדמין הראשי' }, 400);
      if (userId === user.id) return json({ error: 'אי אפשר למחוק את החשבון שאיתו אתה מחובר' }, 400);
      // Cascades through auth.users FKs → profiles, subscriptions, teams, and
      // all the coach's data. Irreversible; the UI gates it behind a confirm.
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) { console.error('delete_user failed:', error); return json({ error: 'שגיאה במחיקת המשתמש' }, 500); }
      return json({ ok: true });
    }

    return json({ error: 'פעולה לא מזוהה' }, 400);
  } catch (e) {
    console.error('admin-users error:', e);
    return json({ error: 'שגיאה פנימית' }, 500);
  }
});

// Look up an auth user by email (case-insensitive). supabase-js has no
// get-user-by-email, so page through the admin list.
async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error('listUsers failed:', error); return null; }
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 1000) return null;
  }
  return null;
}

// Grant permanent manual access: confirm the email (users who signed up before
// custom SMTP existed never got a confirmation link and are otherwise stuck at
// the login wall) and write an 'active' subscription with no end_date and no
// billing instrument, so neither the cron biller nor either lapse sweep can
// ever touch it. Returns an error, or null on success.
async function grantAccess(admin: ReturnType<typeof createClient>, userId: string) {
  const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (confirmErr) console.error('email_confirm on grant failed:', confirmErr);

  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    status: 'active',
    plan: 'monthly',
    billing_key: 'manual',
    start_date: new Date().toISOString(),
    end_date: null,
    cancelled_at: null,
    next_charge_at: null,
    card_token: null,
    card_tokef: null,
    hk_id: null,
  }, { onConflict: 'user_id' });
  if (error) console.error('grant failed:', error);
  return error;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
