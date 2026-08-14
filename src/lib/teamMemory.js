/**
 * Cumulative memory engine.
 *
 * Every analysis used to be generated in isolation, so it could only ever
 * reflect back what the coach had just typed. This module assembles the
 * season context — recurring problems and how often they have appeared,
 * problems that have gone away, the recent results trend, and which players
 * are trending up or down — into a Hebrew block that is prepended to the
 * analysis prompts.
 *
 * Rules that hold everywhere in here:
 *  - Built ONLY from stored records. Nothing is inferred or invented; a team
 *    with no history produces an explicit "first match" block.
 *  - Bounded: recent window + open problems only, so the prompt stays small.
 *  - Format-aware: youth squads lead with player development, 11v11 leads
 *    with collective problems (see Part Two of the spec).
 */
import { base44 } from '@/api/base44Client';
import { getFormat, isYouthFormat } from '@/lib/teamFormats';

// How many recent matches feed the memory block.
export const RECENT_MATCH_WINDOW = 8;
// A problem that has not recurred within this many analysed matches is
// auto-resolved; it is flagged as fading before that.
export const PROBLEM_DECAY_WINDOW = 5;
// Window used to decide whether a player is improving / stable / declining.
export const PLAYER_TREND_WINDOW = 5;

// Rating deltas smaller than this are noise, not a trend (ratings are 1-10).
const TREND_EPSILON = 0.4;
// Caps that keep the block from crowding out the match data itself. Goals are
// created faster than they resolve, so both the list and the whole block are
// bounded; the closing instructions are appended AFTER any truncation so the
// anti-hallucination guard is never the part that gets cut.
const MAX_PROBLEMS_IN_BLOCK = 12;
const MAX_BLOCK_CHARS = 4000;
// buildTeamMemoryBlock is called by several independent analysis paths within
// the same modal open; this keeps that from becoming 15 unbounded queries.
const CACHE_TTL_MS = 30_000;
const blockCache = new Map(); // teamId -> { at, block }

export function clearTeamMemoryCache(teamId) {
  if (teamId) blockCache.delete(teamId); else blockCache.clear();
}

const he = (n) => new Intl.NumberFormat('he-IL').format(n);

function scoreOf(match) {
  const our = match?.result?.our_score;
  const opp = match?.result?.opponent_score;
  if (our == null || opp == null) return null;
  return { our: Number(our), opp: Number(opp) };
}

function outcomeLabel(match) {
  const s = scoreOf(match);
  if (!s) return null;
  if (s.our > s.opp) return 'ניצחון';
  if (s.our < s.opp) return 'הפסד';
  return 'תיקו';
}

/**
 * Trend for one player from the rating time series the DB triggers maintain
 * on players.match_history ({ match_id, opponent, date, rating }).
 * Compares the older half of the window against the newer half.
 */
export function computeTrendFromHistory(matchHistory) {
  const rated = (matchHistory || [])
    .filter((h) => {
      // Guard the value itself: '' / false / [] all coerce to 0 and would drag
      // an average down into a false "declining".
      const n = Number(h?.rating);
      return Number.isFinite(n) && n > 0;
    })
    // match_history is appended in write order, never re-sorted (the rating
    // pipeline appends new match_ids and patches existing ones in place), so a
    // back-entered old match lands last. Order by date before taking the
    // window, or "most recent" is really "most recently typed".
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .slice(-PLAYER_TREND_WINDOW);
  // Fewer than four samples cannot separate a trend from noise.
  if (rated.length < 4) return null;

  const mid = Math.floor(rated.length / 2);
  const older = rated.slice(0, mid);
  const newer = rated.slice(rated.length - mid);
  const avg = (arr) => arr.reduce((sum, h) => sum + Number(h.rating), 0) / arr.length;
  const delta = avg(newer) - avg(older);

  if (delta >= TREND_EPSILON) return 'improving';
  if (delta <= -TREND_EPSILON) return 'declining';
  return 'stable';
}

/**
 * Recomputes every player's trend for a team and persists the ones that
 * changed. Returns the players with their current trend so a caller that
 * already needs them (the memory builder) does not re-query.
 */
export async function refreshPlayerTrends(teamId) {
  if (!teamId) return [];
  const players = await base44.entities.Player.filter({ team_id: teamId });
  await Promise.all(players.map(async (p) => {
    const trend = computeTrendFromHistory(p.match_history);
    if (!trend || trend === p.rating_trend) return;
    try {
      await base44.entities.Player.update(p.id, {
        rating_trend: trend,
        rating_trend_updated_at: new Date().toISOString(),
      });
      p.rating_trend = trend;
    } catch (e) {
      console.warn('trend update failed for player', p.id, e);
    }
  }));
  return players;
}

/**
 * Ages open problems and auto-resolves the ones that have gone quiet,
 * crediting the training action that was open against them (institutional
 * memory of what actually worked).
 *
 * "How long has this been quiet" is DERIVED from the match history — the
 * number of analysed matches played since the problem was last seen — rather
 * than incremented. That matters: this runs from a component effect that can
 * fire again whenever the coach re-opens a match, and an incrementing counter
 * would age a problem once per re-open and resolve it far too early. Computing
 * it from data makes re-runs idempotent.
 *
 * @param seenGoalIds ids of goals that DID recur in the match just analysed
 */
export async function decayOpenProblems(teamId, seenGoalIds = []) {
  if (!teamId) return;
  const [goals, matches] = await Promise.all([
    base44.entities.TacticalGoal.filter({ team_id: teamId }),
    base44.entities.MatchAnalysis.filter({ team_id: teamId }, '-date', RECENT_MATCH_WINDOW * 2),
  ]);
  // Only auto-resolve problems the engine detected itself. A goal the coach
  // created by hand (or one raised from a professional summary) must never
  // disappear from the Training Center without the coach doing anything.
  const open = goals.filter((g) => g.status === 'active' && g.source === 'match');
  const today = new Date().toISOString().split('T')[0];
  const seen = new Set(seenGoalIds.filter(Boolean));
  // Distinct match DATES — two analyses of the same fixture must not count as
  // two matches, or a problem ages twice as fast as it should.
  const matchDates = [...new Set((matches || []).map((m) => m.date).filter(Boolean))];

  await Promise.all(open.map(async (goal) => {
    if (seen.has(goal.id)) {
      // Recurred in this match — the clock is reset.
      if ((goal.matches_since_seen || 0) !== 0 || goal.fading_since) {
        await base44.entities.TacticalGoal.update(goal.id, {
          matches_since_seen: 0, fading_since: null,
        }).catch(() => {});
      }
      return;
    }

    // Matches played after the problem was last seen. No last_seen_date means
    // we cannot date it — leave it alone rather than guess.
    if (!goal.last_seen_date) return;
    const since = matchDates.filter((d) => String(d) > String(goal.last_seen_date)).length;
    if (since === (goal.matches_since_seen || 0) && since < PROBLEM_DECAY_WINDOW) return; // nothing changed

    if (since >= PROBLEM_DECAY_WINDOW) {
      // Credit the recommendation that was open against this problem.
      let resolvedBy = null;
      try {
        const actions = await base44.entities.TrainingAction.filter({ linked_goal_id: goal.id });
        resolvedBy = actions?.[0]?.id || null;
      } catch { /* linkage is optional */ }
      await base44.entities.TacticalGoal.update(goal.id, {
        status: 'resolved',
        resolved_at: today,
        resolved_by_action_id: resolvedBy,
        matches_since_seen: since,
        fading_since: goal.fading_since || today,
      }).catch(() => {});
    } else {
      await base44.entities.TacticalGoal.update(goal.id, {
        matches_since_seen: since,
        fading_since: since > 0 ? (goal.fading_since || today) : null,
      }).catch(() => {});
    }
  }));
}

// ── memory block sections ────────────────────────────────────────────────

function resultsSection(matches) {
  const withScore = matches.filter((m) => scoreOf(m));
  if (withScore.length === 0) return null;
  const parts = withScore.slice(0, RECENT_MATCH_WINDOW).map((m) => {
    const s = scoreOf(m);
    return `${outcomeLabel(m)} ${s.our}-${s.opp} מול ${m.opponent || 'יריבה'}`;
  });
  const wins = withScore.filter((m) => outcomeLabel(m) === 'ניצחון').length;
  const draws = withScore.filter((m) => outcomeLabel(m) === 'תיקו').length;
  const losses = withScore.filter((m) => outcomeLabel(m) === 'הפסד').length;
  return [
    `תוצאות ${he(withScore.length)} המשחקים האחרונים (מהאחרון לראשון): ${parts.join(' | ')}`,
    `מאזן בחלון זה: ${he(wins)} ניצחונות, ${he(draws)} תיקו, ${he(losses)} הפסדים.`,
  ].join('\n');
}

function problemsSection(goals) {
  const open = goals
    .filter((g) => g.status === 'active')
    .sort((a, b) => (b.occurrence_count || 0) - (a.occurrence_count || 0));
  if (open.length === 0) return null;

  // Goals accumulate faster than they resolve, so the list is capped at the
  // most-recurring ones. Without this the block can reach tens of KB and
  // crowd the actual match data out of the prompt.
  const shown = open.slice(0, MAX_PROBLEMS_IN_BLOCK);
  const lines = shown.map((g) => {
    const count = g.occurrence_count || 1;
    const times = count === 1 ? 'פעם אחת' : `${he(count)} פעמים`;
    const last = g.last_seen_date ? `, נראתה לאחרונה ב-${g.last_seen_date}` : '';
    const fading = (g.matches_since_seen || 0) > 0
      ? ` — לא חזרה ב-${he(g.matches_since_seen)} המשחקים האחרונים`
      : '';
    // No ids here: this text is fed to a model whose output is shown to the
    // coach verbatim, and a leaked UUID would surface in the analysis. The
    // semantic matcher has its own prompt where ids belong.
    return `- "${g.title}" (${g.category || 'כללי'}): הופיעה ${times}${last}${fading}.`;
  });
  const more = open.length > shown.length
    ? `\n(ועוד ${he(open.length - shown.length)} בעיות פתוחות בעדיפות נמוכה יותר)`
    : '';
  return `בעיות פתוחות שהמערכת עוקבת אחריהן:\n${lines.join('\n')}${more}`;
}

function resolvedSection(goals, actionsById) {
  const resolved = goals
    .filter((g) => g.status === 'resolved' && g.resolved_at)
    .sort((a, b) => String(b.resolved_at).localeCompare(String(a.resolved_at)))
    .slice(0, 5);
  if (resolved.length === 0) return null;

  const lines = resolved.map((g) => {
    const action = g.resolved_by_action_id ? actionsById.get(g.resolved_by_action_id) : null;
    const worked = action?.pattern_situation
      ? ` בפעם הקודמת שהבעיה הזו הופיעה, עבדתם על "${action.pattern_situation}" והיא נעלמה.`
      : '';
    return `- "${g.title}" נפתרה (${g.resolved_at}).${worked}`;
  });
  return `בעיות שנפתרו ולא חוזרות:\n${lines.join('\n')}`;
}

function playersSection(players) {
  const improving = players.filter((p) => p.rating_trend === 'improving');
  const declining = players.filter((p) => p.rating_trend === 'declining');
  if (improving.length === 0 && declining.length === 0) return null;

  const lines = [];
  if (improving.length) lines.push(`במגמת שיפור: ${improving.map((p) => p.name).join(', ')}.`);
  if (declining.length) lines.push(`במגמת ירידה: ${declining.map((p) => p.name).join(', ')}.`);
  return `מגמות שחקנים (על בסיס ${he(PLAYER_TREND_WINDOW)} המשחקים האחרונים):\n${lines.join('\n')}`;
}

function situationsSection(situations) {
  const open = situations.filter((s) => s.status === 'active' && (s.occurrence_count || 0) > 1);
  if (open.length === 0) return null;
  const lines = open.map((s) => {
    const last = s.last_seen ? `, אחרונה ב-${s.last_seen}` : '';
    return `- "${s.situation_name}": ${he(s.occurrence_count)} פעמים${last}.`;
  });
  return `מצבי משחק חוזרים:\n${lines.join('\n')}`;
}

/**
 * Builds the Hebrew memory block for a team.
 * Returns '' when there is genuinely nothing to remember.
 */
export async function buildTeamMemoryBlock(teamId, team = null) {
  if (!teamId) return '';

  const cached = blockCache.get(teamId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.block;

  let matches = [];
  let goals = [];
  let situations = [];
  let players = [];
  let actions = [];
  try {
    [matches, goals, situations, players, actions] = await Promise.all([
      base44.entities.MatchAnalysis.filter({ team_id: teamId }, '-date', RECENT_MATCH_WINDOW),
      base44.entities.TacticalGoal.filter({ team_id: teamId }),
      base44.entities.KeyMatchSituation.filter({ team_id: teamId }),
      base44.entities.Player.filter({ team_id: teamId }),
      base44.entities.TrainingAction.filter({ team_id: teamId }),
    ]);
  } catch (e) {
    // Memory is an enhancement — never block an analysis because history
    // failed to load.
    console.warn('team memory load failed:', e);
    return '';
  }

  const actionsById = new Map((actions || []).map((a) => [a.id, a]));
  const youth = isYouthFormat(team);

  const collective = [problemsSection(goals), situationsSection(situations)].filter(Boolean);
  const individual = [playersSection(players)].filter(Boolean);
  const shared = [resultsSection(matches), resolvedSection(goals, actionsById)].filter(Boolean);

  // Youth formats lead with player development; 11v11 leads with the
  // collective problems.
  const body = youth
    ? [...individual, ...shared, ...collective]
    : [...collective, ...shared, ...individual];

  const remember = (block) => {
    blockCache.set(teamId, { at: Date.now(), block });
    return block;
  };

  if (body.length === 0) {
    if ((matches || []).length <= 1) {
      return remember([
        '',
        '--- זיכרון הקבוצה ---',
        'אין עדיין היסטוריה לקבוצה הזו — זהו המשחק הראשון שמנותח.',
        'נתח אותו כמשחק בודד, ואל תתייחס לדפוסים או לחזרתיות שאין להם בסיס בנתונים.',
      ].join('\n'));
    }
    return remember('');
  }

  // Truncate the DATA, then append the instructions — never the other way
  // round, or a long history silently strips the rule that forbids inventing
  // history.
  const data = ['', '--- זיכרון הקבוצה (היסטוריה מצטברת) ---', ...body].join('\n');
  const trimmed = data.length > MAX_BLOCK_CHARS
    ? `${data.slice(0, MAX_BLOCK_CHARS)}\n(הרשימה קוצרה)`
    : data;

  return remember([
    trimmed,
    '',
    'הנחיות לשימוש בזיכרון:',
    '- לכל בעיה שאתה מזהה, ציין אם היא הופיעה בעבר וכמה פעמים.',
    '- הבחן בפירוש בין אירוע חד-פעמי לבין דפוס מבוסס שחוזר על עצמו.',
    '- אם בעיה מהעבר לא מופיעה יותר — ציין זאת כשיפור, בשם.',
    '- הזיכרון הזה הוא מקור האמת להיסטוריה. אל תמציא היסטוריה, מספרים או משחקים שאינם מופיעים כאן.',
    '- אל תציג בפלט מזהים טכניים.',
  ].join('\n'));
}
