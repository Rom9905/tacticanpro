/**
 * Syncs tactical problems (from match analysis) and professional summaries
 * into TacticalGoal records shown in the Training Center.
 * Idempotent: a match/summary is never counted twice for the same goal.
 */
import { base44 } from '@/api/base44Client';

const TOPIC_KEYWORDS = [
  { re: /לחץ/, topic: 'בנייה מהלחץ' },
  { re: /מעבר/, topic: 'מעברים התקפיים' },
  { re: /הגנ|מרחקים/, topic: 'תיאום הגנתי' },
  { re: /בנייה/, topic: 'בנייה מהגנה' },
  { re: /נייח|קורנר|קבוע/, topic: 'מצבים נייחים' },
  { re: /מרכז/, topic: 'שליטה במרכז' },
];

function priorityFromCount(count) {
  if (count >= 4) return 'critical';
  if (count >= 3) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

const SEVERITY_BUMP = { high: 'medium', medium: 'low', low: 'low' };

/**
 * Creates/updates TacticalGoals from a match's tactical problems.
 * One goal per problem category; occurrence counted once per match.
 */
export async function syncTacticalProblemsToGoals(analysis, problems) {
  if (!analysis?.team_id || !analysis?.id || !problems?.length) return;

  const goals = await base44.entities.TacticalGoal.filter({ team_id: analysis.team_id });

  // group problems by category — one goal per category
  const byCategory = new Map();
  for (const p of problems) {
    const cat = p.category || 'כללי';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(p);
  }

  for (const [category, catProblems] of byCategory) {
    const worst = catProblems.find(p => p.severity === 'high') || catProblems[0];
    const existing = goals.find(g =>
      g.status !== 'resolved' &&
      (g.title === category || (g.linked_topics || []).includes(category))
    );

    if (existing) {
      if ((existing.source_summaries || []).includes(analysis.id)) continue; // already counted
      const count = (existing.occurrence_count || 0) + 1;
      await base44.entities.TacticalGoal.update(existing.id, {
        occurrence_count: count,
        priority: priorityFromCount(count),
        description: `זוהתה אוטומטית — הופיעה ${count} פעמים. אחרונה: מול ${analysis.opponent || '?'}`,
        last_seen_date: analysis.date || null,
        source_summaries: [...(existing.source_summaries || []), analysis.id],
      }).catch(() => {});
    } else {
      await base44.entities.TacticalGoal.create({
        team_id: analysis.team_id,
        title: category,
        description: `זוהתה אוטומטית מהמשחק מול ${analysis.opponent || '?'}: ${worst.text?.slice(0, 180) || ''}`,
        category: 'general',
        source: 'match',
        status: 'active',
        priority: SEVERITY_BUMP[worst.severity] || 'low',
        progress_pct: 0,
        linked_topics: [category],
        occurrence_count: 1,
        last_seen_date: analysis.date || null,
        source_summaries: [analysis.id],
        source_match_id: analysis.id,
      }).catch(() => {});
    }
  }
}

/**
 * Scans recent professional summaries, creates/updates goals for recurring
 * topics, and recomputes progress for active goals. Runs after each summary save.
 */
export async function analyzeTeamProgress(teamId) {
  if (!teamId) return { success: false };

  const [summaries, goals] = await Promise.all([
    base44.entities.ProfessionalSummary.filter({ team_id: teamId }, '-event_date', 20),
    base44.entities.TacticalGoal.filter({ team_id: teamId }),
  ]);

  // topic → occurrences in issues_found (with summary ids)
  const topicIssues = new Map();
  const addIssue = (topic, s) => {
    if (!topicIssues.has(topic)) topicIssues.set(topic, []);
    if (!topicIssues.get(topic).some(x => x.id === s.id)) topicIssues.get(topic).push(s);
  };

  for (const s of summaries) {
    const hasIssues = !!(s.issues_found && s.issues_found.trim());
    if (!hasIssues) continue;
    for (const topic of s.tactical_topics || []) addIssue(topic, s);
    for (const { re, topic } of TOPIC_KEYWORDS) {
      if (re.test(s.issues_found)) addIssue(topic, s);
    }
  }

  // create/update goals for topics appearing 2+ times
  for (const [topic, hits] of topicIssues) {
    const existing = goals.find(g =>
      g.status !== 'resolved' &&
      (g.title === topic || (g.linked_topics || []).includes(topic))
    );
    const lastDate = hits[0]?.event_date || null;

    if (existing) {
      const newIds = hits.map(h => h.id).filter(id => !(existing.source_summaries || []).includes(id));
      if (newIds.length === 0) continue;
      const count = (existing.occurrence_count || 0) + newIds.length;
      await base44.entities.TacticalGoal.update(existing.id, {
        occurrence_count: count,
        priority: priorityFromCount(count),
        description: `זוהתה אוטומטית — הופיעה ${count} פעמים בסיכומים`,
        last_seen_date: lastDate,
        source_summaries: [...(existing.source_summaries || []), ...newIds],
      }).catch(() => {});
    } else if (hits.length >= 2) {
      await base44.entities.TacticalGoal.create({
        team_id: teamId,
        title: topic,
        description: `זוהתה אוטומטית — הופיעה ${hits.length} פעמים בסיכומים`,
        category: 'general',
        source: hits[0]?.event_type === 'training' ? 'training' : 'match',
        status: 'active',
        priority: priorityFromCount(hits.length),
        progress_pct: 0,
        linked_topics: [topic],
        occurrence_count: hits.length,
        last_seen_date: lastDate,
        source_summaries: hits.map(h => h.id),
      }).catch(() => {});
    }
  }

  // recompute progress for active goals:
  // progressFactor = (issueReduced + trainingSessions*0.5) / total, capped at 90
  const activeGoals = goals.filter(g => g.status === 'active');
  for (const goal of activeGoals) {
    const linked = goal.linked_topics?.length ? goal.linked_topics : [goal.title];
    const related = summaries.filter(s => (s.tactical_topics || []).some(t => linked.includes(t)));
    if (related.length === 0) continue;

    const trainingSessions = related.filter(s => s.event_type === 'training').length;
    const issueStillPresent = related.filter(s => s.issues_found && s.issues_found.trim()).length;
    const issueReduced = related.filter(s => !s.issues_found || !s.issues_found.trim()).length;
    const total = issueStillPresent + issueReduced + trainingSessions;
    if (total === 0) continue;

    const progressFactor = (issueReduced + trainingSessions * 0.5) / total;
    const newPct = Math.round(Math.min(90, Math.max(goal.progress_pct || 0, progressFactor * 100)));
    if (newPct !== (goal.progress_pct || 0)) {
      await base44.entities.TacticalGoal.update(goal.id, {
        progress_pct: newPct,
        progress_note: `${trainingSessions} אימונים טיפלו בנושא. עדיין מופיעה ב-${issueStillPresent} סיכומים. ${issueReduced} סיכומים ללא הבעיה.`,
      }).catch(() => {});
    }
  }

  return { success: true };
}
