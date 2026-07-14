// Cross-match trends engine: computes stat trends, recurring issues,
// and training-impact comparisons from MatchAnalysis + ProfessionalSummary data.

// ─── Helpers ───

const getOur = a => a._summary?.result_our ?? a.result?.our_score ?? null;
const getOpp = a => a._summary?.result_opponent ?? a.result?.opponent_score ?? null;

export function sortByDateAsc(analyses) {
  return [...(analyses || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Collect all issue texts from a single analysis (all sources)
export function collectIssues(analysis) {
  const issues = [];
  (analysis.report?.issues || []).forEach(t => issues.push({ text: t, source: 'report' }));
  if (analysis._summary?.issues_found) {
    analysis._summary.issues_found
      .split(/[\n;•·]+/)
      .map(s => s.trim())
      .filter(s => s.length > 3)
      .forEach(t => issues.push({ text: t, source: 'summary' }));
  }
  const pa = analysis.phase_analysis || {};
  const phases = [pa.buildup, pa.transitions?.attack, pa.transitions?.defense, pa.organized_defense, pa.set_pieces];
  phases.forEach(ph => (ph?.issues || []).forEach(t => issues.push({ text: t, source: 'phase' })));
  (analysis.insights || [])
    .filter(ins => ins.category === 'issue' && ins.status !== 'rejected')
    .forEach(ins => issues.push({ text: ins.content, source: 'insight' }));
  return issues;
}

// Normalize issue text to a comparable keyword signature
const STOPWORDS = new Set(['של', 'את', 'עם', 'על', 'לא', 'יש', 'אין', 'זה', 'גם', 'כל', 'אבל', 'או', 'כי', 'מה', 'הוא', 'היא', 'אנחנו', 'הם', 'מאוד', 'יותר', 'פחות', 'צריך', 'שלנו', 'שלהם', 'בין', 'אחרי', 'לפני', 'the', 'a', 'of', 'in', 'to', 'and']);

export function keywordsOf(text) {
  return (text || '')
    .replace(/[^֐-׿a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^[במלכשה]/, '')) // strip common Hebrew prefixes
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

function similarity(kwA, kwB) {
  if (!kwA.length || !kwB.length) return 0;
  const setB = new Set(kwB);
  const common = kwA.filter(w => setB.has(w)).length;
  return common / Math.min(kwA.length, kwB.length);
}

// ─── Feature 1: Recurring issues across matches ───

// Groups similar issues across matches. Returns clusters sorted by match-count desc.
export function findRecurringIssues(analyses, { minMatches = 2 } = {}) {
  const sorted = sortByDateAsc(analyses);
  const clusters = []; // { keywords, texts: [], matches: Set of ids, matchLabels: [] }

  sorted.forEach(a => {
    const label = `${a.opponent} (${new Date(a.date).toLocaleDateString('he-IL')})`;
    const seenClusters = new Set();
    collectIssues(a).forEach(({ text }) => {
      const kw = keywordsOf(text);
      if (kw.length < 2) return;
      let target = null;
      for (const c of clusters) {
        if (similarity(kw, c.keywords) >= 0.5) { target = c; break; }
      }
      if (!target) {
        target = { keywords: kw, texts: [], matchIds: new Set(), matchLabels: [] };
        clusters.push(target);
      }
      target.texts.push(text);
      if (!target.matchIds.has(a.id)) {
        target.matchIds.add(a.id);
        target.matchLabels.push(label);
        // merge keywords so cluster grows
        target.keywords = [...new Set([...target.keywords, ...kw])];
      }
      seenClusters.add(target);
    });
  });

  return clusters
    .filter(c => c.matchIds.size >= minMatches)
    .map(c => ({
      representative: c.texts.sort((x, y) => x.length - y.length)[Math.floor(c.texts.length / 2)] || c.texts[0],
      count: c.matchIds.size,
      matchLabels: c.matchLabels,
      streak: computeStreak(sortByDateAsc(analyses), c.matchIds),
    }))
    .sort((a, b) => b.count - a.count);
}

// How many of the most recent matches (consecutively) contain this issue
function computeStreak(sortedAsc, matchIds) {
  let streak = 0;
  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    if (matchIds.has(sortedAsc[i].id)) streak++;
    else break;
  }
  return streak;
}

// ─── Feature 1: Stat trends ───

export const TREND_STATS = [
  { key: 'possession', label: 'החזקת כדור', suffix: '%', higherIsBetter: true },
  { key: 'xg', label: 'xG', suffix: '', higherIsBetter: true },
  { key: 'shots_on_target', label: 'בעיטות למסגרת', suffix: '', higherIsBetter: true },
  { key: 'pass_accuracy', label: 'דיוק מסירות', suffix: '%', higherIsBetter: true },
  { key: 'turnovers', label: 'איבודי כדור', suffix: '', higherIsBetter: false },
  { key: 'critical_errors', label: 'טעויות קריטיות', suffix: '', higherIsBetter: false },
];

// Returns [{ name, date, possession, xg, ..., goals_for, goals_against }] chronological
export function buildStatSeries(analyses) {
  return sortByDateAsc(analyses).map(a => {
    const row = {
      name: a.opponent,
      date: new Date(a.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
      goals_for: getOur(a),
      goals_against: getOpp(a),
    };
    TREND_STATS.forEach(({ key }) => {
      const v = a.stats?.[key];
      row[key] = (v === undefined || v === null || v === 0) ? null : v;
    });
    return row;
  });
}

// Compare avg of last `window` matches vs the previous `window`.
// Returns { key, label, recent, previous, delta, direction: 'up'|'down'|'flat', good: bool } per stat with data.
export function computeStatTrends(analyses, window = 3) {
  const series = buildStatSeries(analyses);
  const trends = [];
  const statDefs = [
    ...TREND_STATS,
    { key: 'goals_for', label: 'שערים שהבקענו', suffix: '', higherIsBetter: true },
    { key: 'goals_against', label: 'שערים שספגנו', suffix: '', higherIsBetter: false },
  ];
  statDefs.forEach(def => {
    const vals = series.map(r => r[def.key]).map(v => (v === null || v === undefined ? null : Number(v)));
    const nonNull = vals.filter(v => v !== null);
    if (nonNull.length < 4) return; // need enough data
    const valid = vals.map((v, i) => ({ v, i })).filter(x => x.v !== null);
    const recentVals = valid.slice(-window).map(x => x.v);
    const prevVals = valid.slice(-(window * 2), -window).map(x => x.v);
    if (!recentVals.length || !prevVals.length) return;
    const recent = recentVals.reduce((s, v) => s + v, 0) / recentVals.length;
    const previous = prevVals.reduce((s, v) => s + v, 0) / prevVals.length;
    const delta = recent - previous;
    const relDelta = previous !== 0 ? Math.abs(delta / previous) : Math.abs(delta);
    const direction = relDelta < 0.07 ? 'flat' : delta > 0 ? 'up' : 'down';
    const good = direction === 'flat' ? null : (direction === 'up') === def.higherIsBetter;
    trends.push({ ...def, recent: round1(recent), previous: round1(previous), delta: round1(delta), direction, good });
  });
  return trends;
}

const round1 = n => Math.round(n * 10) / 10;

// ─── Feature 2: Training impact ───

// Given the latest match analysis, all analyses, training summaries, and active goals:
// find what was trained on between the previous match and this one, and whether
// the linked issues still appear in this match.
export function computeTrainingImpact({ analysis, allAnalyses, trainingSummaries, goals }) {
  if (!analysis?.date) return null;
  const matchDate = new Date(analysis.date);
  const sorted = sortByDateAsc(allAnalyses).filter(a => a.id !== analysis.id && new Date(a.date) < matchDate);
  const prevMatch = sorted[sorted.length - 1] || null;
  const sinceDate = prevMatch ? new Date(prevMatch.date) : new Date(matchDate.getTime() - 14 * 86400000);

  // Trainings in the window
  const trainings = (trainingSummaries || []).filter(s => {
    const d = new Date(s.event_date);
    return d > sinceDate && d <= matchDate;
  });
  if (!trainings.length) return { trainings: [], items: [], prevMatch };

  const trainedTopics = [...new Set(trainings.flatMap(s => s.tactical_topics || []))];
  if (!trainedTopics.length) return { trainings, items: [], prevMatch };

  // Goals whose linked_topics intersect with what was trained
  const relevantGoals = (goals || []).filter(g =>
    g.status === 'active' && (g.linked_topics || []).some(t => trainedTopics.includes(t))
  );

  const thisIssues = collectIssues(analysis).map(i => i.text);
  const prevIssues = prevMatch ? collectIssues(prevMatch).map(i => i.text) : [];

  const items = relevantGoals.map(goal => {
    const goalKw = keywordsOf(`${goal.title} ${goal.description || ''} ${(goal.linked_topics || []).join(' ')}`);
    const matchIssue = txts => txts.find(t => similarity(keywordsOf(t), goalKw) >= 0.34);
    const stillPresent = matchIssue(thisIssues);
    const wasPresent = matchIssue(prevIssues);
    const topics = (goal.linked_topics || []).filter(t => trainedTopics.includes(t));
    const trainingCount = trainings.filter(s => (s.tactical_topics || []).some(t => topics.includes(t))).length;
    let verdict; // 'improved' | 'still_present' | 'unknown'
    if (stillPresent) verdict = 'still_present';
    else if (wasPresent || prevIssues.length === 0) verdict = 'improved';
    else verdict = 'unknown';
    return {
      goal,
      topics,
      trainingCount,
      verdict,
      evidence: stillPresent || wasPresent || null,
    };
  });

  return { trainings, trainedTopics, items, prevMatch };
}
