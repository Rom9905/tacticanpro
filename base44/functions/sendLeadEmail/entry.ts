import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let userEmail = 'משתמש לא מחובר';
    try {
      const user = await base44.auth.me();
      if (user) userEmail = user.email;
    } catch {}

    const body = await req.json();

    // Sanitize: strip control chars (header/body injection) and cap length.
    const clean = (v: unknown, max: number) =>
      String(v ?? '').replace(/[\r\n\t\x00-\x1f\x7f]/g, ' ').trim().slice(0, max);

    const name = clean(body.name, 120);
    const phone = clean(body.phone, 40);
    const plan = clean(body.plan, 40) || 'לא צוין';

    if (!name || !phone) {
      return Response.json({ error: 'חסרים פרטים' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'taactican@gmail.com',
      subject: `ליד חדש — ${name} (מסלול ${plan})`,
      body: `שם: ${name}\nטלפון: ${phone}\nמסלול: ${plan}\nאימייל משתמש: ${userEmail}`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});