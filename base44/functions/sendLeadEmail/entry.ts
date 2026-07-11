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
    const { name, phone, plan } = body;

    if (!name || !phone) {
      return Response.json({ error: 'חסרים פרטים' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'taactican@gmail.com',
      subject: `ליד חדש — ${name} (מסלול ${plan || 'לא צוין'})`,
      body: `שם: ${name}\nטלפון: ${phone}\nמסלול: ${plan || 'לא צוין'}\nאימייל משתמש: ${userEmail}`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});