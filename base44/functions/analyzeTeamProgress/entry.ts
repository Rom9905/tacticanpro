import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * analyzeTeamProgress
 * 
 * Call this after a new ProfessionalSummary is saved.
 * It:
 *   1. Scans recent summaries for recurring issues (issues_found + tactical_topics)
 *   2. Creates or updates TacticalGoal records for detected patterns
 *   3. Updates progress_pct on existing goals based on recent summaries
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { teamId } = body;
    if (!teamId) return Response.json({ error: 'Missing teamId' }, { status: 400 });

    // Confirm the caller owns this team via the user-scoped client (RLS)
    // before any asServiceRole write can touch its goals.
    const ownedTeams = await base44.entities.Team.filter({ id: teamId });
    if (!ownedTeams || ownedTeams.length === 0) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load recent summaries (last 20)
    const summaries = await base44.entities.ProfessionalSummary.filter(
      { team_id: teamId }, '-event_date', 20
    );

    // Load existing goals
    const existingGoals = await base44.entities.TacticalGoal.filter(
      { team_id: teamId }, '-created_date', 50
    );

    const today = new Date().toISOString().split('T')[0];

    // ── Step 1: Count how often each tactical topic appears in issues ──
    const topicIssueCount = {};   // topic -> count in issues_found
    const topicTrainingCount = {}; // topic -> count in training (positively worked on)

    for (const s of summaries) {
      const topics = s.tactical_topics || [];
      const hasIssue = !!(s.issues_found || '').trim();

      topics.forEach(t => {
        if (hasIssue) {
          topicIssueCount[t] = (topicIssueCount[t] || 0) + 1;
        } else {
          topicTrainingCount[t] = (topicTrainingCount[t] || 0) + 1;
        }
      });

      // Also scan free-text issues_found for recurring phrases
      if (s.issues_found) {
        const text = s.issues_found.toLowerCase();
        KEYWORDS.forEach(kw => {
          if (text.includes(kw.term)) {
            topicIssueCount[kw.label] = (topicIssueCount[kw.label] || 0) + 1;
          }
        });
      }
    }

    const created = [];
    const updated = [];

    // ── Step 2: If a topic appears 2+ times in issues → create/update goal ──
    for (const [topic, count] of Object.entries(topicIssueCount)) {
      if (count < 2) continue;

      const existing = existingGoals.find(g =>
        (g.linked_topics || []).includes(topic) ||
        g.title.toLowerCase().includes(topic.toLowerCase())
      );

      const lastSummaryWithTopic = summaries.find(s =>
        (s.tactical_topics || []).includes(topic) && s.issues_found
      );

      if (existing) {
        // Update occurrence count and last_seen
        const newOccurrence = Math.max(existing.occurrence_count || 0, count);
        const patch = {
          occurrence_count: newOccurrence,
          last_seen_date: lastSummaryWithTopic?.event_date || today,
        };
        await base44.asServiceRole.entities.TacticalGoal.update(existing.id, patch);
        updated.push(existing.title);
      } else {
        // Auto-create a new goal
        // Determine source from the summary type
        const sourceSummaries = summaries.filter(s => (s.tactical_topics || []).includes(topic));
        const hasMatch = sourceSummaries.some(s => s.event_type === 'match');
        const autoSource = hasMatch ? 'match' : 'training';

        const newGoal = await base44.asServiceRole.entities.TacticalGoal.create({
          team_id: teamId,
          title: topic,
          description: `זוהתה אוטומטית — הופיעה ${count} פעמים בסיכומים`,
          category: guessCategoryFromTopic(topic),
          priority: count >= 4 ? 'critical' : count >= 3 ? 'high' : 'medium',
          status: 'active',
          source: autoSource,
          progress_pct: 0,
          linked_topics: [topic],
          occurrence_count: count,
          last_seen_date: lastSummaryWithTopic?.event_date || today,
          source_summaries: sourceSummaries.map(s => s.id),
        });
        created.push(newGoal.title);
        existingGoals.push(newGoal); // so we don't double-create in this run
      }
    }

    // ── Step 3: Update progress on existing active goals ──
    for (const goal of existingGoals.filter(g => g.status === 'active')) {
      const linked = goal.linked_topics || [];
      if (linked.length === 0) continue;

      // Count recent training sessions that address this topic (positively)
      const trainingSessions = summaries.filter(s =>
        s.event_type === 'training' &&
        linked.some(t => (s.tactical_topics || []).includes(t))
      ).length;

      // Count recent summaries where issue still appears
      const issueStillPresent = summaries.filter(s =>
        linked.some(t => (s.tactical_topics || []).includes(t)) &&
        (s.issues_found || '').trim().length > 0
      ).length;

      const issueReduced = summaries.filter(s =>
        linked.some(t => (s.tactical_topics || []).includes(t)) &&
        !(s.issues_found || '').trim()
      ).length;

      // Simple formula: base on ratio of clean sessions vs issue sessions
      const total = issueStillPresent + issueReduced + trainingSessions;
      if (total === 0) continue;

      const progressFactor = (issueReduced + trainingSessions * 0.5) / total;
      const newPct = Math.round(Math.min(90, Math.max(goal.progress_pct || 0, progressFactor * 100)));

      let note = '';
      if (trainingSessions > 0) note += `${trainingSessions} אימונים טיפלו בנושא. `;
      if (issueStillPresent > 0) note += `עדיין מופיעה ב-${issueStillPresent} סיכונים. `;
      if (issueReduced > 0) note += `${issueReduced} סיכומים ללא הבעיה.`;

      if (newPct !== (goal.progress_pct || 0)) {
        await base44.asServiceRole.entities.TacticalGoal.update(goal.id, {
          progress_pct: newPct,
          progress_note: note.trim(),
        });
        updated.push(`${goal.title} → ${newPct}%`);
      }
    }

    return Response.json({ ok: true, created, updated });
  } catch (error) {
    console.error('analyzeTeamProgress error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Keyword list for issue detection in free text
const KEYWORDS = [
  { term: 'לחץ', label: 'בנייה מהלחץ' },
  { term: 'מעבר', label: 'מעברים התקפיים' },
  { term: 'הגנ', label: 'תיאום הגנתי' },
  { term: 'מרחקים', label: 'תיאום הגנתי' },
  { term: 'בנייה', label: 'בנייה מהגנה' },
  { term: 'נייח', label: 'מצבים נייחים' },
  { term: 'מרכז', label: 'שליטה במרכז' },
];

function guessCategoryFromTopic(topic) {
  if (['לחץ גבוה', 'בנייה מהלחץ', 'יציאה מלחץ'].includes(topic)) return 'לחץ';
  if (['בנייה מהגנה', 'תיאום הגנתי', 'הגנה ארגונית', 'שחקן נגד שחקן'].includes(topic)) return 'הגנה';
  if (['מעברים התקפיים', 'מעברים הגנתיים'].includes(topic)) return 'מעברים';
  if (['מצבים נייחים'].includes(topic)) return 'מצבים נייחים';
  if (['שליטה במרכז', 'משחק אורכי', 'כדורים גבוהים'].includes(topic)) return 'התקפה';
  return 'כללי';
}