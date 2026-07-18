import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Upload, Send, Loader2, Plus, Check } from 'lucide-react';

// Palette — aligned with matchAnalysisTheme / MatchFileAnalysis `C`.
const C = {
  brandGreen: '#4ADE80', greenMain: '#16A34A', dark: '#0D1A12',
  textPrimary: '#14231A', textSecondary: '#5C6B61', textMuted: '#94A39A',
  opponent: '#8A9490',
  success: '#16A34A', successBg: '#E7F6EC',
  warn: '#D97706', warnBg: '#FDF3E3',
  danger: '#DC2626', dangerBg: '#FCEBEB',
  deep: '#7A4FA0',
  heading: "'Heebo', sans-serif",
};

// ── numeric helpers ───────────────────────────────────────────────
function splitVal(v) {
  if (v == null) return { num: 0, decimals: 0, prefix: '', suffix: '', text: '—' };
  const s = String(v).trim();
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return { num: 0, decimals: 0, prefix: '', suffix: '', text: s };
  return {
    num: parseFloat(m[0]),
    decimals: (m[0].split('.')[1] || '').length,
    prefix: s.slice(0, m.index),
    suffix: s.slice(m.index + m[0].length),
    text: s,
  };
}

const LOW_BETTER = /(עביר|PPDA|לחץ הגנתי|איבוד)/;

function normMetric(m) {
  const ourN = m.our_pct != null ? m.our_pct : splitVal(m.our_value).num;
  const oppN = m.opponent_pct != null ? m.opponent_pct : splitVal(m.opponent_value).num;
  const betterWhen = m.better_when || (LOW_BETTER.test(m.label || '') ? 'low' : 'high');
  const max = Math.max(ourN, oppN) || 1;
  const even = Math.abs(ourN - oppN) / max <= 0.05;
  const usBetter = betterWhen === 'high' ? ourN > oppN : ourN < oppN;
  const adv = even ? 'even' : usBetter ? 'us' : 'opp';
  const ourStr = m.our_value != null ? String(m.our_value) : m.our_pct != null ? `${ourN}%` : '—';
  const oppStr = m.opponent_value != null ? String(m.opponent_value) : m.opponent_pct != null ? `${oppN}%` : '—';
  return { label: m.label, ourN, oppN, ourStr, oppStr, adv };
}

// ── animated count-up (locks final value, respects reduced motion) ─
function CountUp({ end, decimals = 0, style }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setVal(end); return; }
    const dur = 1100, startT = performance.now() + 400;
    let raf;
    const tick = (t) => {
      if (t < startT) { raf = requestAnimationFrame(tick); return; }
      const p = Math.min((t - startT) / dur, 1);
      setVal(p >= 1 ? end : end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const to = setTimeout(() => setVal(end), 400 + dur + 300); // fallback stamp
    return () => { cancelAnimationFrame(raf); clearTimeout(to); };
  }, [end]);
  return <span style={style}>{val.toFixed(decimals)}</span>;
}

function initials(name) {
  return String(name || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2);
}

const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', ...style }}>
    {children}
  </div>
);
const H3 = ({ children }) => (
  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPrimary, fontFamily: C.heading }}>{children}</h3>
);

const PRESET_QUESTIONS = ['איך נראה הלחץ שלנו?', 'מי איבד הכי הרבה כדורים?', 'מה קרה אחרי החילופים?'];

export default function MatchCenterResult({
  analysis, fileUrl, ourLabel, oppLabel,
  onSave, saving, saveDone, onNewFile, onAddTopic, addedTopics, usage,
}) {
  const fr = analysis.full_report || {};
  const sr = analysis.summary_report || {};
  const md = analysis.match_details || {};

  // ── Ask-the-file (3 questions per file) ─────────────────────────
  const [qText, setQText] = useState('');
  const [answers, setAnswers] = useState([]);
  const [asking, setAsking] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState(3);
  useEffect(() => { setAnswers([]); setQuestionsLeft(3); setQText(''); }, [fileUrl]);

  const ask = async (raw) => {
    const q = (raw ?? qText).trim();
    if (!q || questionsLeft <= 0 || asking) return;
    setAsking(true); setQText('');
    try {
      const res = await base44.functions.invoke('analyzeMatchFile', {
        file_url: fileUrl, mode: 'deep_dive', our_team_name: ourLabel, opponent_name: oppLabel, question: q,
      });
      const data = res.data || res || {};
      const a = data.no_data
        ? 'אין מספיק מידע בקובץ כדי לענות על השאלה הזו.'
        : (data.blocks || []).map(b => b.content).filter(Boolean).join(' ') || data.title || 'לא התקבלה תשובה.';
      setAnswers(prev => [...prev, { q, a }]);
      setQuestionsLeft(n => Math.max(0, n - 1));
    } catch {
      setAnswers(prev => [...prev, { q, a: 'שגיאה בפנייה לשרת. נסה שוב.' }]);
    } finally { setAsking(false); }
  };

  // ── Scoreboard ──────────────────────────────────────────────────
  const ourScore = md.our_score, oppScore = md.opponent_score;
  const hasScore = ourScore != null && oppScore != null;
  const resultKind = hasScore ? (ourScore > oppScore ? 'win' : ourScore < oppScore ? 'loss' : 'draw') : null;
  const resultBadge = { win: { t: 'ניצחון', bg: C.brandGreen, c: C.dark }, draw: { t: 'תיקו', bg: '#FBBF24', c: C.dark }, loss: { t: 'הפסד', bg: '#F87171', c: '#3A0D0D' } }[resultKind];

  // ── TL;DR insights (with fallback) ──────────────────────────────
  const INSIGHT_CFG = { good: { c: C.greenMain, label: 'מה עבד' }, bad: { c: C.danger, label: 'מה לתקן' }, watch: { c: C.warn, label: 'לשים לב' } };
  let insights = (fr.headline_insights || []).filter(x => x && x.text).slice(0, 3);
  if (insights.length === 0) {
    const good = (sr.what_went_well || [])[0];
    const bad = (fr.key_issues || sr.what_went_poorly || [])[0];
    const watch = (fr.executive_summary || '').split(/[.!?]/)[0];
    insights = [good && { type: 'good', text: good }, bad && { type: 'bad', text: bad }, watch && { type: 'watch', text: watch }].filter(Boolean);
  }

  // ── Rings + bars ────────────────────────────────────────────────
  const allStats = [...(fr.possession_passing_stats || []), ...(fr.defense_pressure_stats || []), ...(fr.duels_transitions_stats || [])];
  const ringSource = (fr.key_metrics && fr.key_metrics.length) ? fr.key_metrics : allStats;
  const ringMetrics = ringSource.slice(0, 4).map(normMetric);
  const barSource = allStats.length ? allStats : (fr.key_metrics || []);
  const barMetrics = barSource.map(normMetric);

  const ringColor = (adv) => adv === 'us' ? C.greenMain : adv === 'opp' ? C.danger : C.warn;

  // ── Halves / possession timeline ────────────────────────────────
  const halves = fr.halves;
  const intervals = (fr.possession_by_interval || []).filter(b => b && b.our_pct != null);

  const players = fr.standout_players || [];
  const topics = fr.training_topics || [];

  const chip = { fontSize: 11, padding: '4px 12px', borderRadius: 999, fontWeight: 600 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Scoreboard hero ── */}
      <div style={{ background: 'linear-gradient(160deg,#0D1A12 0%,#13241A 55%,#16341F 100%)', borderRadius: 20, padding: '28px 24px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 45% at 50% 0%, rgba(74,222,128,0.14), transparent 70%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {md.competition && <span style={{ ...chip, background: 'rgba(74,222,128,0.12)', color: C.brandGreen, border: '1px solid rgba(74,222,128,0.2)' }}>{md.competition}</span>}
          {md.date && <span style={{ ...chip, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }}>{md.date}</span>}
          <span style={{ ...chip, background: 'rgba(122,79,160,0.22)', color: '#C4A5F0', fontWeight: 700 }}>ניתוח מלא מהקובץ</span>
        </div>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 8px', borderRadius: 999, background: 'rgba(74,222,128,0.14)', border: '2px solid rgba(74,222,128,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.heading, fontWeight: 900, fontSize: 20, color: C.brandGreen }}>{initials(ourLabel)}</div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#fff', fontFamily: C.heading }}>{ourLabel}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.brandGreen, fontWeight: 600 }}>הקבוצה שלנו</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            {hasScore ? (
              <p style={{ margin: 0, fontSize: 52, fontWeight: 900, color: '#fff', fontFamily: C.heading, letterSpacing: 2, lineHeight: 1 }}>
                <CountUp end={ourScore} />
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 36, margin: '0 10px' }}>–</span>
                <CountUp end={oppScore} style={{ color: 'rgba(255,255,255,0.75)' }} />
              </p>
            ) : <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.6)', fontFamily: C.heading }}>—</p>}
            {resultBadge && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 999, background: resultBadge.bg, color: resultBadge.c }}>{resultBadge.t}</span>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 8px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.heading, fontWeight: 900, fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>{initials(oppLabel)}</div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'rgba(255,255,255,0.85)', fontFamily: C.heading }}>{oppLabel}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>יריבה</p>
          </div>
        </div>
        {(md.scorers || []).length > 0 && (
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
            {md.scorers.map((s, i) => (
              <span key={i} style={{ fontSize: 12, color: s.team === 'our' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)' }}>
                ⚽ {s.minute != null ? `${s.minute}' ` : ''}{s.name}{s.team !== 'our' ? ' (יריבה)' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── TL;DR insights ── */}
      {insights.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          {insights.map((ins, i) => {
            const cfg = INSIGHT_CFG[ins.type] || INSIGHT_CFG.watch;
            return (
              <div key={i} className="mc-fade" style={{ background: '#fff', borderRadius: 16, padding: 16, borderRight: `4px solid ${cfg.c}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', animationDelay: `${i * 0.1}s` }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: cfg.c, letterSpacing: '.5px' }}>{cfg.label}</p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.textPrimary, fontWeight: 600 }}>{ins.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Rings ── */}
      {ringMetrics.length > 0 && (
        <Card>
          <div style={{ marginBottom: 20 }}><H3>תמונת המשחק במספרים</H3></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16 }}>
            {ringMetrics.map((m, i) => {
              const src = ringSource[i];
              const ourHasPct = String(src.our_value || '').includes('%');
              const fill = ourHasPct ? Math.min(m.ourN, 100) : (m.ourN + m.oppN > 0 ? (m.ourN / (m.ourN + m.oppN)) * 100 : 0);
              const offset = 264 * (1 - fill / 100);
              const col = ringColor(m.adv);
              const parsed = splitVal(m.ourStr);
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(20,35,26,0.07)" strokeWidth="9" />
                    <circle className="mc-ring" cx="50" cy="50" r="42" fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray="264" strokeDashoffset={offset} style={{ animationDelay: `${i * 0.15}s` }} />
                  </svg>
                  <p style={{ margin: '-72px 0 0', fontSize: 22, fontWeight: 900, color: C.textPrimary, fontFamily: C.heading }}>
                    {parsed.prefix}<CountUp end={parsed.num} decimals={parsed.decimals} />{parsed.suffix}
                  </p>
                  <p style={{ margin: '36px 0 0', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>{m.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textMuted }}>יריבה: {m.oppStr}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Head-to-head bars ── */}
      {barMetrics.length > 0 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <H3>ראש בראש</H3>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 600 }}>
              <span style={{ color: C.greenMain }}>● {ourLabel}</span>
              <span style={{ color: C.opponent }}>● {oppLabel}</span>
            </div>
          </div>
          {barMetrics.map((m, i) => {
            const total = m.ourN + m.oppN || 1;
            const usW = Math.max((m.ourN / total) * 100, 3);
            const oppW = Math.max((m.oppN / total) * 100, 3);
            const tag = m.adv === 'us' ? { t: 'יתרון שלנו', bg: C.successBg, c: C.greenMain } : m.adv === 'opp' ? { t: 'יתרון ליריבה', bg: C.dangerBg, c: C.danger } : { t: 'מאוזן', bg: 'rgba(20,35,26,0.05)', c: C.textMuted };
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{m.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: tag.bg, color: tag.c }}>{tag.t}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.greenMain, fontFamily: C.heading, textAlign: 'center' }}>{m.ourStr}</span>
                  <div style={{ height: 12, borderRadius: 999, background: 'rgba(20,35,26,0.06)', overflow: 'hidden', display: 'flex', direction: 'rtl' }}>
                    <div className="mc-bar" style={{ height: '100%', background: 'linear-gradient(270deg,#4ADE80,#16A34A)', borderRadius: '0 999px 999px 0', width: `${usW}%` }} />
                    <div className="mc-bar" style={{ height: '100%', background: C.opponent, borderRadius: '999px 0 0 999px', width: `${oppW}%` }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.textSecondary, fontFamily: C.heading, textAlign: 'center' }}>{m.oppStr}</span>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* ── Two halves ── */}
      {halves && (halves.first || halves.second) && (
        <Card>
          <div style={{ marginBottom: 4 }}><H3>סיפור שתי המחציות</H3></div>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: C.textMuted }}>לפי חלוקת הנתונים בקובץ למחצית ראשונה ושנייה</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            {[{ h: halves.first, title: 'מחצית א׳', bg: C.successBg, bd: 'rgba(22,163,74,0.14)', c: C.greenMain },
              { h: halves.second, title: 'מחצית ב׳', bg: C.warnBg, bd: 'rgba(217,119,6,0.14)', c: C.warn }].map((x, i) => x.h && (
              <div key={i} style={{ borderRadius: 14, padding: 16, background: x.bg, border: `1px solid ${x.bd}` }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: x.c }}>{x.title}{x.h.score ? ` · ${x.h.score}` : ''}</p>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: C.textPrimary }}>{x.h.summary}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Possession by interval ── */}
      {intervals.length > 0 && (
        <Card>
          <div style={{ marginBottom: 12 }}><H3>החזקה לאורך המשחק</H3></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, direction: 'ltr' }}>
            {intervals.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: C.greenMain }}>{b.our_pct}%</span>
                <div className="mc-col" style={{ width: '100%', borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,#4ADE80,#16A34A)', height: `${b.our_pct}%` }} />
                <span style={{ fontSize: 9, color: C.textMuted }}>{b.interval}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11.5, lineHeight: 1.5, color: C.textMuted }}>אחוזי ההחזקה שלנו לפי רבעי-שעה, כפי שחולצו מהקובץ.</p>
        </Card>
      )}

      {/* ── Standout players ── */}
      {players.length > 0 && (
        <Card>
          <div style={{ marginBottom: 4 }}><H3>שחקנים בולטים</H3></div>
          <p style={{ margin: '0 0 16px', fontSize: 11, color: C.textMuted }}>מוצג בדוח זה בלבד — לא נשמר בניתוח המשחקים</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
            {players.map((p, i) => (
              <div key={i} style={{ border: '1px solid rgba(20,35,26,0.08)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, margin: '0 auto 8px', borderRadius: 999, background: C.dark, color: C.brandGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: C.heading }}>{p.shirt_number || initials(p.name)}</div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: C.textPrimary }}>{p.name}</p>
                <p style={{ margin: '2px 0 8px', fontSize: 11, color: C.textMuted }}>{[p.position, p.moment].filter(Boolean).join(' · ')}</p>
                {(p.stats || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {p.stats.map((s, j) => (
                      <span key={j} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, background: C.successBg, color: C.greenMain, fontWeight: 700 }}>{s.label} {s.value}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Training topics (dark) ── */}
      {topics.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#0D1A12,#13241A)', borderRadius: 20, padding: 24 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: C.heading }}>נושאי עבודה לאימון הבא</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>נגזר ישירות מהנתונים בקובץ · ניתן להוסיף למרכז האימונים בלחיצה</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topics.map((t, i) => {
              const urgent = t.urgency === 'דחוף';
              const added = addedTopics?.has(t.topic);
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${urgent ? 'rgba(220,38,38,0.35)' : 'rgba(217,119,6,0.35)'}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: urgent ? C.danger : C.warn, color: '#fff' }}>{t.urgency}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: '#fff' }}>{t.topic}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.55)' }}>{t.rationale_with_numbers || t.rationale}</p>
                  </div>
                  <button onClick={() => !added && onAddTopic?.(t)} disabled={added}
                    style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 10, background: 'rgba(74,222,128,0.15)', color: C.brandGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: added ? 'default' : 'pointer' }}>
                    {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ask the file ── */}
      <Card style={{ border: '1px solid rgba(122,79,160,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.deep, fontFamily: C.heading }}>שאל את הקובץ</h3>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: 'rgba(122,79,160,0.1)', color: C.deep, border: '1px solid rgba(122,79,160,0.2)' }}>נותרו {questionsLeft} מתוך 3 שאלות</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: C.textMuted }}>תשובות מבוססות אך ורק על הנתונים בקובץ · עד 3 שאלות לכל קובץ</p>

        {questionsLeft > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {PRESET_QUESTIONS.map(q => (
                <button key={q} onClick={() => ask(q)} disabled={asking}
                  style={{ fontSize: 11, padding: '6px 12px', borderRadius: 999, background: 'rgba(122,79,160,0.08)', color: C.deep, border: '1px solid rgba(122,79,160,0.2)', fontWeight: 600, cursor: asking ? 'default' : 'pointer' }}>{q}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={qText} placeholder="או הקלד שאלה משלך..."
                onChange={(e) => setQText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask(); } }}
                disabled={asking}
                style={{ flex: 1, minWidth: 0, padding: '11px 12px', borderRadius: 12, fontSize: 12.5, background: '#FBFAF6', border: '1px solid rgba(20,35,26,0.12)', color: C.textPrimary, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={() => ask()} disabled={asking || !qText.trim()}
                style={{ flexShrink: 0, padding: '0 16px', border: 'none', borderRadius: 12, background: C.deep, color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: asking || !qText.trim() ? 'default' : 'pointer', opacity: asking || !qText.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} שאל
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: C.warnBg, border: '1px solid rgba(217,119,6,0.2)', fontSize: 12.5, fontWeight: 600, color: C.warn }}>
            ניצלת את 3 השאלות לקובץ הזה. העלה קובץ חדש כדי לשאול שוב.
          </div>
        )}

        {answers.map((qa, i) => (
          <div key={i} style={{ marginTop: 12, padding: '14px 16px', borderRadius: 14, background: 'rgba(122,79,160,0.04)', border: '1px solid rgba(122,79,160,0.14)' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 800, color: C.deep }}>{qa.q}</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.textSecondary }}>{qa.a}</p>
          </div>
        ))}
      </Card>

      {/* ── Save / new file ── */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onSave} disabled={saving || saveDone}
          style={{ flex: 1, padding: 16, borderRadius: 16, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: saveDone ? C.successBg : C.greenMain, color: saveDone ? C.greenMain : '#fff', border: 'none', boxShadow: saveDone ? 'none' : '0 4px 14px rgba(22,163,74,0.25)', cursor: saving || saveDone ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> שומר...</> : saveDone ? <><Check className="w-5 h-5" /> נשמר</> : <><Save className="w-5 h-5" /> שמור ניתוח</>}
        </button>
        <button onClick={onNewFile}
          style={{ padding: '16px 24px', borderRadius: 16, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', color: C.textSecondary, border: '1px solid rgba(20,35,26,0.1)', cursor: 'pointer' }}>
          <Upload className="w-5 h-5" /> קובץ חדש
        </button>
      </div>

      {/* ── Usage chips ── */}
      {usage && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 999, background: 'rgba(20,35,26,0.05)', color: C.textSecondary }}>📁 העלאות היום: {usage.uploadsToday} מתוך 2</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 999, background: 'rgba(20,35,26,0.05)', color: C.textSecondary }}>🔁 ניתוח לקובץ: {usage.analysesToday} מתוך 2 ביום</span>
        </div>
      )}
    </div>
  );
}
