import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { teamId } = await req.json();
    if (!teamId) return Response.json({ error: 'Missing teamId' }, { status: 400 });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Get upcoming events for this team
    const events = await base44.entities.GameSchedule.filter({ team_id: teamId, status: 'scheduled' });

    const now = new Date();
    const upcoming = events.filter(e => new Date(e.game_date) > now);

    let synced = 0;
    const errors = [];

    for (const event of upcoming) {
      let parsedNotes = null;
      try { parsedNotes = event.notes ? JSON.parse(event.notes) : null; } catch {}
      const isTraining = parsedNotes?.type === 'training';

      const startTime = new Date(event.game_date);
      const durationMinutes = isTraining ? (parsedNotes?.duration || 90) : 90;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      const title = isTraining
        ? `🏃 אימון${parsedNotes?.emphases?.length ? ` — ${parsedNotes.emphases.join(', ')}` : ''}`
        : `⚽ משחק מול ${event.opponent}`;

      const description = isTraining
        ? `סוג: אימון\nמשך: ${durationMinutes} דקות${parsedNotes?.freeNote ? `\nהערות: ${parsedNotes.freeNote}` : ''}`
        : `יריבה: ${event.opponent}\nמסגרת: ${event.context || ''}\nמיקום: ${event.location || ''}\nחשיבות: ${event.importance || 'בינונית'}`;

      const gcEvent = {
        summary: title,
        description,
        location: event.venue || '',
        start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Jerusalem' },
        end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Jerusalem' },
      };

      // Check if already synced (stored gcal_event_id in notes)
      const gcalId = parsedNotes?.gcal_event_id;

      let res;
      if (gcalId) {
        // Update existing
        res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gcEvent),
        });
      } else {
        // Create new
        res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gcEvent),
        });
      }

      if (res.ok) {
        const created = await res.json();
        // Save the gcal_event_id back to notes
        await base44.entities.GameSchedule.update(event.id, {
          notes: JSON.stringify({ ...(parsedNotes || {}), gcal_event_id: created.id }),
        });
        synced++;
      } else {
        const err = await res.text();
        console.error('Google Calendar error:', err);
        errors.push(err);
      }
    }

    return Response.json({ ok: true, synced, errors });
  } catch (error) {
    console.error('syncToGoogleCalendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});