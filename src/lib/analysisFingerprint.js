// Fingerprints of the *source* data behind an AI analysis, so cached summaries
// can refresh themselves the moment the coach adds new data — and stay put
// otherwise (AI calls cost time and money).

// Key-order-stable serialisation: the same content always produces the same
// string, even if the API hands the object back with keys in another order.
function stable(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
}

export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Only what the coach enters. Derived AI output (ai_summary, deep_analysis,
// tactical_problems, training_guides) must stay out — otherwise generating an
// analysis would invalidate its own cache and loop forever.
const SOURCE_FIELDS = [
  'opponent', 'date', 'location', 'result', 'stats', 'free_notes',
  'video_moments', 'phase_analysis', 'player_ratings', 'training_actions',
  'analysis_types', 'report', 'recurring_patterns',
];

const SUMMARY_FIELDS = [
  'result_our', 'result_opponent', 'what_worked', 'issues_found',
  'tactical_insights', 'tactical_topics',
];

export function matchFingerprint(analysis) {
  if (!analysis) return '0';
  const src = {};
  SOURCE_FIELDS.forEach(f => {
    if (analysis[f] !== undefined && analysis[f] !== null) src[f] = analysis[f];
  });
  if (analysis._summary) {
    const s = {};
    SUMMARY_FIELDS.forEach(f => {
      if (analysis._summary[f] !== undefined && analysis._summary[f] !== null) s[f] = analysis._summary[f];
    });
    src._summary = s;
  }
  return hashString(stable(src));
}

// Fingerprint for a set of matches (e.g. everything inside a period window).
// Sorted so ordering changes alone don't force a regeneration.
export function periodFingerprint(analyses = []) {
  return hashString(analyses.map(a => `${a.id}:${matchFingerprint(a)}`).sort().join('|'));
}

// Generic list fingerprint for records that aren't match analyses (e.g. training
// summaries). `pick` returns the source-only subset that should drive a refresh.
export function listFingerprint(items = [], pick = (x) => x) {
  return hashString(items.map(x => `${x.id}:${hashString(stable(pick(x)))}`).sort().join('|'));
}

// Fingerprint of an arbitrary object's source data (e.g. a player's profile).
export function objectFingerprint(obj) {
  return hashString(stable(obj ?? null));
}
