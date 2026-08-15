/**
 * Syncs tactical problems (from match analysis) and professional summaries
 * into TacticalGoal records shown in the Training Center.
 * Idempotent: a match/summary is never counted twice for the same goal.
 */
import { base44 } from '@/api/base44Client';
import { decayOpenProblems, refreshPlayerTrends, clearTeamMemoryCache } from '@/lib/teamMemory';

/**
 * Asks the LLM which of the newly detected problems are the SAME problem the
 * team already has open, and which are genuinely new. String comparison can't
 * do this — "מרחקים גדולים בין הקווים" and "הקווים מתפרקים בלחץ" are the same
 * problem in different words.
 *
 * Returns a Map(problemIndex → existing goal id). Any problem missing from the
 * map is treated as new. On any failure it returns an empty map, so the caller
 * falls back to the category matching that was here before.
 */
async function matchProblemsToOpenGoals(problems, openGoals) {
  if (!problems.length || !openGoals.length) return new Map();

  const problemList = problems
    .map((p, i) => `${i}. [${p.category || 'כללי'}] ${String(p.text || '').slice(0, 200)}`)
    .join('\n');
  const goalList = openGoals
    .map((g) => `- id=${g.id} | "${g.title}" (${g.category || 'כללי'}) | ${String(g.description || '').slice(0, 160)}`)
    .join('\n');

  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה עוזר לזהות אם בעיות שזוהו במשחק הן המשך של בעיות מוכרות או בעיות חדשות.

בעיות פתוחות של הקבוצה:
${goalList}

בעיות שזוהו במשחק הנוכחי:
${problemList}

לכל בעיה מהמשחק הנוכחי החזר התאמה: אם היא במהותה אותה בעיה כמו אחת הבעיות הפתוחות — החזר את ה-id שלה. אם היא באמת חדשה — החזר null.
התאם לפי המשמעות הכדורגלית, לא לפי מילים זהות. אל תתאים בכוח: בספק — null.`,
      // Pure id-matching: the coaching/format instructions have no bearing here.
      skipTeamContext: true,
      response_json_schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                problem_index: { type: 'number' },
                matches_existing_id: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    });

    const map = new Map();
    if (res?.__ai_error) return map;
    const validIds = new Set(openGoals.map((g) => g.id));
    for (const m of res?.matches || []) {
      const idx = Number(m?.problem_index);
      const id = m?.matches_existing_id;
      // Only trust ids we actually sent — the model must not invent one.
      if (Number.isInteger(idx) && id && validIds.has(id)) map.set(idx, id);
    }
    return map;
  } catch (e) {
    console.warn('semantic problem matching failed, falling back to categories:', e);
    return new Map();
  }
}

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

// spec part 3 step 5 — auto category classification
export function guessCategoryFromTopic(topic) {
  if (!topic) return 'כללי';
  if (/לחץ גבוה|בנייה מהלחץ|יציאה מלחץ|^לחץ$/.test(topic)) return 'לחץ';
  if (/בנייה מהגנה|בנייה מאחור|תיאום הגנתי|הגנה ארגונית|שחקן נגד שחקן/.test(topic)) return 'הגנה';
  if (/מעברים התקפיים|מעברים הגנתיים|מעבר התקפי|מעבר הגנתי|קונטרה|אובדן כדור/.test(topic)) return 'מעברים';
  if (/מצבים נייחים|כדור קבוע/.test(topic)) return 'מצבים נייחים';
  if (/שליטה במרכז|משחק אורכי|כדורים גבוהים|שליש אחרון/.test(topic)) return 'התקפה';
  return 'כללי';
}

// spec part 5 — progress note built only from non-zero parts
function buildProgressNote(trainingSessions, issueStillPresent, issueReduced) {
  let note = '';
  if (trainingSessions > 0) note += `${trainingSessions} אימונים טיפלו בנושא. `;
  if (issueStillPresent > 0) note += `עדיין מופיעה ב-${issueStillPresent} סיכומים. `;
  if (issueReduced > 0) note += `${issueReduced} סיכומים ללא הבעיה.`;
  return note.trim();
}

/**
 * Creates/updates TacticalGoals from a match's tactical problems.
 * One goal per problem category; occurrence counted once per match.
 */
// Matches whose problems have already been folded into the goals during this
// session. The caller is a component effect that re-fires whenever the coach
// re-opens a match, and without this guard every re-open would repeat the
// semantic-matching LLM call (cost + latency) for a match already processed.
// Cross-session correctness does not depend on this: the per-goal
// source_summaries check below and the data-derived decay are both idempotent.
const syncedMatchIds = new Set();

export async function syncTacticalProblemsToGoals(analysis, problems) {
  if (!analysis?.team_id || !analysis?.id || !problems?.length) return;
  if (syncedMatchIds.has(analysis.id)) return;
  syncedMatchIds.add(analysis.id);
  try {
    return await syncProblems(analysis, problems);
  } catch (e) {
    // A transient failure must not lock this match out for the session.
    syncedMatchIds.delete(analysis.id);
    throw e;
  }
}

async function syncProblems(analysis, problems) {
  const goals = await base44.entities.TacticalGoal.filter({ team_id: analysis.team_id });
  // 'active' only — a paused goal is one the coach deliberately set aside, and
  // binding a recurrence to it would hide the problem (the memory block lists
  // active goals) while decay, which also only handles active goals, never
  // maintains it.
  const openGoals = goals.filter(g => g.status === 'active');

  // Which of these problems is the team already carrying? Semantic first,
  // category matching as the fallback when the AI layer is unavailable.
  const semantic = await matchProblemsToOpenGoals(problems, openGoals);

  // group problems by category — one goal per category
  const byCategory = new Map();
  problems.forEach((p, i) => {
    const cat = p.category || 'כללי';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push({ ...p, _index: i });
  });

  const touchedGoalIds = [];

  for (const [category, catProblems] of byCategory) {
    const worst = catProblems.find(p => p.severity === 'high') || catProblems[0];

    // A semantic match on ANY problem in this category binds the group.
    const matchedId = catProblems.map(p => semantic.get(p._index)).find(Boolean);
    const existing = matchedId
      ? openGoals.find(g => g.id === matchedId)
      : openGoals.find(g =>
        (g.linked_topics || []).includes(category) ||
        (g.title || '').toLowerCase().includes(category.toLowerCase()));

    if (existing) {
      touchedGoalIds.push(existing.id);
      if ((existing.source_summaries || []).includes(analysis.id)) continue; // already counted
      const count = (existing.occurrence_count || 0) + 1;
      await base44.entities.TacticalGoal.update(existing.id, {
        occurrence_count: count,
        priority: priorityFromCount(count),
        description: `זוהתה אוטומטית — הופיעה ${count} פעמים. אחרונה: מול ${analysis.opponent || '?'}`,
        // Keep the previous date when this analysis carries none — nulling it
        // would make decay skip the goal forever (it can't age an undated one).
        last_seen_date: analysis.date || existing.last_seen_date || null,
        source_summaries: [...(existing.source_summaries || []), analysis.id],
        // Recurrence resets the decay clock.
        matches_since_seen: 0,
        fading_since: null,
      }).catch(() => {});
    } else {
      const created = await base44.entities.TacticalGoal.create({
        team_id: analysis.team_id,
        title: category,
        description: `זוהתה אוטומטית מהמשחק מול ${analysis.opponent || '?'}: ${worst.text?.slice(0, 180) || ''}`,
        category: guessCategoryFromTopic(category),
        source: 'match',
        status: 'active',
        priority: SEVERITY_BUMP[worst.severity] || 'low',
        progress_pct: 0,
        linked_topics: [category],
        occurrence_count: 1,
        last_seen_date: analysis.date || null,
        source_summaries: [analysis.id],
        source_match_id: analysis.id,
        // matches_since_seen is intentionally NOT sent: the column defaults to
        // 0, and sending an unknown column would make every goal creation fail
        // silently if the JS ships before the migration is applied.
      }).catch(() => null);
      if (created?.id) touchedGoalIds.push(created.id);
    }
  }

  // Everything that did NOT recur ages one match closer to being dropped,
  // and player trends are refreshed off this match's ratings.
  await decayOpenProblems(analysis.team_id, touchedGoalIds).catch(err =>
    console.warn('problem decay failed:', err));
  await refreshPlayerTrends(analysis.team_id).catch(err =>
    console.warn('player trend refresh failed:', err));
  // Occurrence counts, trends and resolutions just moved — the cached block
  // describes the world before this match, and the deep analysis that runs
  // moments later would otherwise be handed it.
  clearTeamMemoryCache(analysis.team_id);
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
    // Active only — same rule as the match path. Bumping a paused goal would
    // hide the recurrence (the memory block lists active goals) while decay,
    // which is also active-only, never maintains it.
    const existing = goals.find(g =>
      g.status === 'active' &&
      ((g.linked_topics || []).includes(topic) ||
        (g.title || '').toLowerCase().includes(topic.toLowerCase()))
    );
    const lastDate = hits[0]?.event_date || null;

    if (existing) {
      const newIds = hits.map(h => h.id).filter(id => !(existing.source_summaries || []).includes(id));
      if (newIds.length === 0) continue;
      const count = (existing.occurrence_count || 0) + newIds.length;
      // last_seen_date may only move FORWARD. The newest matching summary can
      // be older than the last match this problem appeared in, and writing it
      // back would make decay count every match since then and resolve a
      // problem that recurred days ago.
      const newest = [lastDate, existing.last_seen_date]
        .filter(Boolean)
        .sort((a, b) => String(b).localeCompare(String(a)))[0] || null;
      await base44.entities.TacticalGoal.update(existing.id, {
        occurrence_count: count,
        priority: priorityFromCount(count),
        description: `זוהתה אוטומטית — הופיעה ${count} פעמים בסיכומים`,
        last_seen_date: newest,
        source_summaries: [...(existing.source_summaries || []), ...newIds],
        // The problem just recurred — clear any fading state so the block
        // cannot claim "last seen today" and "hasn't recurred in 3 matches".
        matches_since_seen: 0,
        fading_since: null,
      }).catch(() => {});
    } else if (hits.length >= 2) {
      await base44.entities.TacticalGoal.create({
        team_id: teamId,
        title: topic,
        description: `זוהתה אוטומטית — הופיעה ${hits.length} פעמים בסיכומים`,
        category: guessCategoryFromTopic(topic),
        source: hits.some(h => h.event_type === 'match') ? 'match' : 'training',
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
        progress_note: buildProgressNote(trainingSessions, issueStillPresent, issueReduced),
      }).catch(() => {});
    }
  }

  // Player trajectories are memory too — refresh them whenever progress runs.
  await refreshPlayerTrends(teamId).catch(err =>
    console.warn('player trend refresh failed:', err));
  clearTeamMemoryCache(teamId);

  return { success: true };
}
