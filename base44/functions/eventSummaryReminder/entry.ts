import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Only the scheduler may invoke this mass-email job. Without this gate
    // anyone could hit the URL and spam every coach.
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // This function is called as a scheduled task (service role)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all scheduled/past events that are not yet completed
    const allEvents = await base44.asServiceRole.entities.GameSchedule.filter({ status: 'scheduled' });

    const users = await base44.asServiceRole.entities.User.list();

    for (const event of allEvents) {
      const eventDate = new Date(event.game_date);

      // Parse notes to get type
      let parsedNotes = null;
      try { parsedNotes = event.notes ? JSON.parse(event.notes) : null; } catch {}
      const isTraining = parsedNotes?.type === 'training';
      const label = isTraining ? 'האימון' : `המשחק מול ${event.opponent}`;

      const ownerUser = users.find(u => u.email === event.created_by);
      if (!ownerUser?.email) continue;

      // First reminder: event ended 1 hour ago (within the last 5 min window)
      if (eventDate >= twentyFiveHoursAgo && eventDate <= oneHourAgo) {
        const alreadySent = parsedNotes?.reminder1_sent;
        if (!alreadySent) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: ownerUser.email,
            subject: `סיכום ${isTraining ? 'אימון' : 'משחק'} — ממתין לך`,
            body: `שלום ${ownerUser.full_name || ''},\n\n${label} הסתיים. מומלץ למלא סיכום קצר (3 דקות) כדי לשמור את ההתרשמות טרייה.\n\nהיכנס למערכת כדי לסכם.\n\nבהצלחה,\nTacticanPRO`,
          });

          // Mark reminder sent
          await base44.asServiceRole.entities.GameSchedule.update(event.id, {
            notes: JSON.stringify({ ...(parsedNotes || {}), reminder1_sent: true }),
          });
        }
      }

      // Second reminder: 24 hours after event, still not completed
      if (eventDate >= twentyFiveHoursAgo && eventDate <= twentyFourHoursAgo) {
        const r2sent = parsedNotes?.reminder2_sent;
        if (!r2sent) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: ownerUser.email,
            subject: `תזכורת: סיכום ${isTraining ? 'אימון' : 'משחק'} עדיין ממתין`,
            body: `שלום ${ownerUser.full_name || ''},\n\nלפני 24 שעות ${isTraining ? 'התקיים אימון' : `התקיים משחק מול ${event.opponent}`}. עדיין לא סיכמת אותו.\n\nאל תשכח — כניסה קצרה לסיכום עוזרת לך לשמור על רצף הניתוח.\n\nבהצלחה,\nTacticanPRO`,
          });

          await base44.asServiceRole.entities.GameSchedule.update(event.id, {
            notes: JSON.stringify({ ...(parsedNotes || {}), reminder1_sent: true, reminder2_sent: true }),
          });
        }
      }
    }

    return Response.json({ ok: true, processed: allEvents.length });
  } catch (error) {
    console.error('eventSummaryReminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});