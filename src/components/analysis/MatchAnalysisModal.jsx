import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import EditPlayerRatingsModal from './EditPlayerRatingsModal';
import DeepAnalysisStory from './DeepAnalysisStory';
import TrainingImpactCard from './TrainingImpactCard';
import BottomLine from '@/components/ui/BottomLine';
import { buildGameStyleContext } from '@/hooks/useGameStyle';
import { generateTacticalProblems } from '@/lib/tacticalProblemsEngine';
import { syncTacticalProblemsToGoals } from '@/lib/tacticalGoalsSync';
import { MA, resultTheme, ratingColor } from './matchAnalysisTheme';
import {
  Loader2, BarChart3, Video, FileText, Clock, Target, BookOpen,
  TrendingUp, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Edit2, X, Sparkles,
} from 'lucide-react';

// Bars in "מספרי המשחק". Only metrics the coach actually entered are rendered —
// every stat is optional. Ordered as in the design (שליטה / דיוק / xG / איבודים
// first), then the remaining fields StatisticsAnalysis can capture, so nothing
// the coach entered goes unshown. `max` only scales the bar; the printed value
// is always the real number.
const GOOD = { from: MA.greenMain, to: MA.greenAccent, color: MA.greenMain };
const BAD = { from: MA.warn, to: MA.drawYellow, color: MA.warn };

const BAR_METRICS = [
  { key: 'possession', label: 'שליטה', max: 100, suffix: '%', ...GOOD },
  { key: 'pass_accuracy', label: 'דיוק מסירות', max: 100, suffix: '%', ...GOOD },
  { key: 'xg', label: 'xG', max: 3, suffix: '', from: '#2563EB', to: '#60A5FA', color: MA.info },
  { key: 'turnovers', label: 'איבודים', max: 30, suffix: '', ...BAD },
  { key: 'shots', label: 'בעיטות לשער', max: 25, suffix: '', ...GOOD },
  { key: 'shots_on_target', label: 'בעיטות למסגרת', max: 12, suffix: '', ...GOOD },
  { key: 'passes', label: 'מסירות', max: 700, suffix: '', ...GOOD },
  { key: 'tackles', label: 'תיקולים', max: 30, suffix: '', ...GOOD },
  { key: 'interceptions', label: 'יירוטים', max: 30, suffix: '', ...GOOD },
  { key: 'critical_errors', label: 'טעויות קריטיות', max: 8, suffix: '', from: MA.danger, to: MA.lossRed, color: MA.danger },
];

const SEVERITY = {
  high: { bg: MA.dangerBg, border: MA.danger, badge: MA.danger, label: 'חמור' },
  medium: { bg: MA.warnBg, border: MA.warn, badge: MA.warn, label: 'בינוני' },
  low: { bg: MA.surfaceSoft, border: 'rgba(13,26,18,.15)', badge: MA.textMuted, label: 'קל' },
};

function SectionTitle({ children, icon: Icon, color = MA.textPrimary }) {
  return (
    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, fontFamily: MA.heading, color, display: 'flex', alignItems: 'center', gap: 8 }}>
      {Icon && <Icon style={{ width: 15, height: 15 }} />}
      {children}
    </h3>
  );
}

function Card({ children, style, className = '', delay = 0 }) {
  return (
    <div className={`ma-fade ${className}`} style={{
      background: MA.card, borderRadius: 16, padding: '20px 22px', boxShadow: MA.cardShadow,
      animationDelay: `${delay}ms`, ...style,
    }}>
      {children}
    </div>
  );
}

function InsightCard({ title, content, icon: Icon, color, bg }) {
  return (
    <div style={{ borderRadius: 14, padding: 16, background: MA.card, boxShadow: MA.cardShadow, borderTop: `4px solid ${color}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon style={{ width: 16, height: 16, color }} />
      </div>
      <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color, fontFamily: MA.heading }}>{title}</h4>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: MA.textSecondary }}>{content}</p>
    </div>
  );
}

function RatingRing({ rating, name, note, highlight }) {
  const color = ratingColor(rating);
  const dash = 138;
  const offset = Math.max(0, dash - (Math.min(rating, 10) / 10) * dash);
  return (
    <div style={{
      minWidth: 104, flex: '1 0 104px', textAlign: 'center', padding: '14px 8px 10px', borderRadius: 14,
      background: highlight ? `linear-gradient(180deg,${MA.successBg},#fff)` : MA.surfaceSoft,
      border: `1px solid ${highlight ? 'rgba(22,163,74,.2)' : 'rgba(13,26,18,.07)'}`,
    }}>
      <div style={{ position: 'relative', width: 52, height: 52, margin: '0 auto 6px' }}>
        <svg viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(13,26,18,.07)" strokeWidth="5" />
          <circle className="ma-ring" cx="26" cy="26" r="22" fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={offset} />
        </svg>
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 900, fontFamily: MA.heading, color,
        }}>{rating}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: MA.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      {note && <div style={{ fontSize: 10, color: MA.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note}</div>}
    </div>
  );
}

export default function MatchAnalysisModal({ open, onClose, analysis, teamName, onRefresh, onDeleteAnalysisType, seasonAverages = {} }) {
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingRatings, setEditingRatings] = useState(false);
  const [playerNameMap, setPlayerNameMap] = useState({});
  const [localRatings, setLocalRatings] = useState(null);
  const [_teamGameStyle, setTeamGameStyle] = useState(null);
  const [_teamGameStyleNotes, setTeamGameStyleNotes] = useState('');
  const [deletingType, setDeletingType] = useState(null);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [deepOpen, setDeepOpen] = useState(false);
  const [generatingDeep, setGeneratingDeep] = useState(false);
  const [deepError, setDeepError] = useState(null);

  useEffect(() => {
    if (open && analysis) {
      if (!analysis._summaryOnly) loadOrGenerateAISummary();
      if (analysis.team_id) {
        base44.entities.Player.filter({ team_id: analysis.team_id }).then(players => {
          const map = {};
          players.forEach(p => { map[p.id] = p.name; });
          setPlayerNameMap(map);
        });
        base44.entities.Team.filter({ id: analysis.team_id }).then(teams => {
          const team = teams[0];
          if (team) {
            setTeamGameStyle(team.game_style || null);
            setTeamGameStyleNotes(team.game_style_notes || '');
          }
        });
      }
    }
  }, [open, analysis]);

  const loadOrGenerateAISummary = async (forceRegenerate = false) => {
    const cachedTooLong = (analysis.ai_summary?.summary?.length || 0) > 700;
    if (!forceRegenerate && analysis.ai_summary && !cachedTooLong) {
      setAiSummary(analysis.ai_summary);
      return;
    }
    await generateAISummary();
  };

  const generateAISummary = async () => {
    setLoading(true);
    let gameStyleCtx = '';
    if (analysis.team_id) {
      try {
        const teams = await base44.entities.Team.filter({ id: analysis.team_id });
        const team = teams[0];
        if (team) {
          setTeamGameStyle(team.game_style || null);
          setTeamGameStyleNotes(team.game_style_notes || '');
          gameStyleCtx = buildGameStyleContext(team.game_style, team.game_style_notes);
        }
      } catch (e) { console.error('Failed to load team for game style', e); }
    }

    try {
      const matchContext = `
יריב: ${analysis.opponent}
תוצאה: ${analysis.result?.our_score ?? '?'}-${analysis.result?.opponent_score ?? '?'}
${analysis.stats ? `סטטיסטיקה: ${JSON.stringify(analysis.stats)}` : ''}
${analysis._summary?.what_worked ? `מה עבד: ${analysis._summary.what_worked}` : ''}
${analysis._summary?.issues_found ? `בעיות: ${analysis._summary.issues_found}` : ''}
${analysis.free_notes ? `הערות: ${analysis.free_notes}` : ''}
${analysis.phase_analysis ? `ניתוח שלבים: ${JSON.stringify(analysis.phase_analysis)}` : ''}${gameStyleCtx}`;

      const prompt = `אתה מנתח משחקי כדורגל מקצועי. התמקד אך ורק בנושאי כדורגל - טקטיקה, ביצועים על המגרש, שלבי משחק, שחקנים. אל תתייחס לנושאים שאינם קשורים לכדורגל.

נתוני המשחק:${matchContext}

צור תמונה מקצועית של המשחק — פסקה רצופה אחת של 3-5 משפטים בלבד, לא יותר. בלי כותרות, בלי רשימות, בלי חלוקה לנושאים. רק טקסט רצוף קצר על הביצועים הכדורגליים.${gameStyleCtx ? '\nאם זיהית פערים בין השיטה שהוגדרה לביצוע — ציין אותם.' : ''}`;

      const summaryRes = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            match_picture: { type: 'string', description: 'פסקה אחת של 3-5 משפטים בלבד' }
          }
        }
      });
      const summary = summaryRes?.__ai_error ? summaryRes : (summaryRes?.match_picture || '');

      const insightsPrompt = `אתה מנתח משחקי כדורגל מקצועי. התמקד אך ורק בנושאי כדורגל.

נתוני המשחק:${matchContext}

זהה בדיוק 3 תובנות כדורגליות מרכזיות מהמשחק:
1. בעיה טקטית/כדורגלית מרכזית אחת שצריך לטפל בה${gameStyleCtx ? ' — אם קשורה לשיטת המשחק, התחל ב"על בסיס שיטת המשחק שהגדרת —"' : ''}
2. נקודת שיפור כדורגלית אחת
3. נקודה חיובית כדורגלית אחת

כל תובנה - משפט קצר וממוקד בנושאי כדורגל בלבד (טקטיקה, ביצועים, מבנה משחק, שחקנים).`;

      const insights = await base44.integrations.Core.InvokeLLM({
        prompt: insightsPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            critical_issue: { type: 'string' },
            improvement_area: { type: 'string' },
            positive_point: { type: 'string' }
          }
        }
      });

      const aiError = summary?.__ai_error || insights?.__ai_error;
      if (aiError) {
        setAiSummary({ error: aiError });
      } else {
        const summaryText = typeof summary === 'string' ? summary : summary?.response || '';
        const cached = { summary: summaryText, insights };
        setAiSummary(cached);
        try {
          await base44.entities.MatchAnalysis.update(analysis.id, { ai_summary: cached });
        } catch (e) { console.warn('Failed to cache AI summary:', e); }
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary({ error: 'שגיאה בהפקת ניתוח ה-AI. נסה לפתוח את המשחק שוב.' });
    }
    setLoading(false);
  };

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setLocalRatings(null);
      setDeepOpen(false);
      setDeepError(null);
      setShowAllTopics(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  const tacticalProblems = React.useMemo(() => {
    if (!analysis) return [];
    if (analysis.tactical_problems?.length > 0) return analysis.tactical_problems;
    try {
      const generated = generateTacticalProblems(analysis);
      if (generated.length > 0 && analysis.id) {
        base44.entities.MatchAnalysis.update(analysis.id, { tactical_problems: generated }).catch(() => {});
      }
      return generated;
    } catch (err) {
      console.error('tactical problems engine failed:', err);
      return [];
    }
  }, [analysis?.id, analysis?.tactical_problems]);

  useEffect(() => {
    if (open && analysis?.id && tacticalProblems.length > 0) {
      syncTacticalProblemsToGoals(analysis, tacticalProblems).catch(err =>
        console.warn('tactical goals sync failed:', err));
    }
  }, [open, analysis?.id, tacticalProblems]);

  if (!analysis) return null;

  const deep = analysis.deep_analysis;

  const generateDeep = async () => {
    setGeneratingDeep(true);
    setDeepError(null);
    try {
      const res = await base44.functions.invoke('generateDeepAnalysis', { match_analysis_id: analysis.id });
      if (res?.success === false) {
        setDeepError(res.error || 'שגיאה ביצירת הניתוח המעמיק. נסה שוב.');
      } else {
        setDeepOpen(true);
        onRefresh && onRefresh();
      }
    } catch {
      setDeepError('שגיאה ביצירת הניתוח המעמיק. נסה שוב.');
    } finally {
      setGeneratingDeep(false);
    }
  };

  // Pair each tactical problem with its deep-analysis explanation ("למה זו בעיה").
  const expansionFor = (problem, i) => {
    const list = deep?.issue_expansions || [];
    if (!list.length) return null;
    const text = problem?.text || '';
    const match = list.find(e => e.issue && text && (
      e.issue === text || e.issue.includes(text.slice(0, 30)) || text.includes(e.issue.slice(0, 30))
    ));
    return match || list[i] || null;
  };

  const rawRatings = localRatings ?? analysis.player_ratings ?? [];
  const displayRatings = rawRatings.map(r => ({
    ...r,
    did_not_play: !!r.did_not_play || (r.rating == null && r.did_not_play !== false),
  }));
  const played = displayRatings.filter(r => !r.did_not_play);
  const dnp = displayRatings.filter(r => r.did_not_play);
  const topRating = played.length ? Math.max(...played.map(r => Number(r.rating) || 0)) : null;

  const ourScore = analysis._summary?.result_our ?? analysis.result?.our_score ?? null;
  const oppScore = analysis._summary?.result_opponent ?? analysis.result?.opponent_score ?? null;
  const hasScore = ourScore != null && oppScore != null;
  const outcome = !hasScore ? null : ourScore > oppScore ? 'win' : ourScore < oppScore ? 'loss' : 'draw';
  const theme = resultTheme(outcome);

  const analysisTypes = analysis.analysis_types || [analysis.analysis_mode].filter(Boolean) || [];
  const hasSummary = analysis._summary;
  const hasVideoMoments = analysis.video_moments?.length > 0;
  const hasTrainingActions = analysis.training_actions?.length > 0;

  const tacticalIssues = tacticalProblems.map(p => p.text);
  const trainingTopics = hasTrainingActions
    ? analysis.training_actions.map(a => a.focus)
    : tacticalIssues.slice(0, 4);
  const urgentTopics = trainingTopics.slice(0, 3);
  const remainingTopics = trainingTopics.slice(3);
  const visibleTopics = showAllTopics ? trainingTopics : urgentTopics;

  const bars = BAR_METRICS.filter(m => analysis.stats?.[m.key] != null && !Number.isNaN(Number(analysis.stats[m.key])));

  const metaParts = [];
  if (analysis.date) metaParts.push(format(new Date(analysis.date), 'd בMMMM', { locale: he }));
  if (analysis.location) metaParts.push(analysis.location);

  const initial = (name) => (name || '?').trim().charAt(0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        dir="rtl"
        className="ma-modal p-0 gap-0 border-0"
        style={{
          width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto',
          background: MA.bgContainer, borderRadius: 20, boxShadow: '0 24px 60px rgba(13,26,18,.3)',
          fontFamily: MA.body, color: MA.textPrimary,
        }}
      >
        {/* ── Scoreboard header ── */}
        <div style={{ position: 'relative', background: MA.darkHeroModal, padding: '28px 32px 24px', overflow: 'hidden' }}>
          <svg viewBox="0 0 400 260" aria-hidden="true"
            style={{ position: 'absolute', right: -60, bottom: -90, width: 340, opacity: 0.1, transform: 'rotate(12deg)', pointerEvents: 'none' }}
            fill="none" stroke={MA.greenAccent} strokeWidth="1.5">
            <rect x="20" y="20" width="360" height="220" rx="4" />
            <circle cx="200" cy="130" r="46" />
            <line x1="200" y1="20" x2="200" y2="240" />
          </svg>

          <div className="ma-sheet-handle" style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.25)', margin: '0 auto 12px' }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(244,239,230,.5)' }}>
              {metaParts.join(' · ')}
            </span>
            <button onClick={onClose} aria-label="סגור"
              style={{ width: 30, height: 30, borderRadius: 9999, border: 'none', background: 'rgba(255,255,255,.1)', color: MA.cream, cursor: 'pointer', flexShrink: 0 }}>
              <X className="w-4 h-4 mx-auto" />
            </button>
          </div>

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 20, marginTop: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto 8px', borderRadius: 16,
                background: 'linear-gradient(135deg,#2A7050,#1a4d35)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontFamily: MA.heading, fontWeight: 900, fontSize: 22, color: '#fff',
              }}>{initial(teamName)}</div>
              <DialogTitle style={{ fontSize: 15, fontWeight: 800, color: MA.cream, fontFamily: MA.heading, margin: 0 }}>
                {teamName || 'הקבוצה'}
              </DialogTitle>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 56, fontWeight: 900, color: theme.accent, fontFamily: MA.heading, lineHeight: 1,
                textShadow: `0 0 32px ${theme.accent}73`,
              }}>
                {hasScore ? `${ourScore}–${oppScore}` : '—'}
              </div>
              {hasScore && (
                <span style={{
                  display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 800, letterSpacing: 1,
                  color: '#0D1A12', background: theme.accent, borderRadius: 9999, padding: '3px 14px',
                }}>{theme.label}</span>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto 8px', borderRadius: 16,
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontFamily: MA.heading, fontWeight: 900,
                fontSize: 22, color: 'rgba(244,239,230,.8)',
              }}>{initial(analysis.opponent)}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(244,239,230,.8)', fontFamily: MA.heading }}>
                {analysis.opponent}
              </div>
            </div>
          </div>

          {/* Source chips — each removable (existing behaviour) */}
          {analysisTypes.length > 0 && (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {analysisTypes.map((type, i) => {
                const isStats = type === 'statistics' || type === 'stats';
                const label = isStats ? 'סטטיסטיקה' : type === 'video' ? 'וידאו' : 'מחברת חופשית';
                const Icon = isStats ? BarChart3 : type === 'video' ? Video : FileText;
                const accent = isStats
                  ? { bg: 'rgba(74,222,128,.12)', color: MA.greenAccent, border: 'rgba(74,222,128,.3)' }
                  : { bg: 'rgba(255,255,255,.08)', color: 'rgba(244,239,230,.8)', border: 'rgba(255,255,255,.16)' };
                return (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 12px',
                    borderRadius: 9999, background: accent.bg, color: accent.color, border: `1px solid ${accent.border}`,
                  }}>
                    <Icon style={{ width: 12, height: 12 }} /> {label}
                    {onDeleteAnalysisType && (
                      <button onClick={(e) => { e.stopPropagation(); setDeletingType(type); }}
                        title={`מחק ${label}`}
                        style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', opacity: .7 }}>
                        {deletingType === type ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete-analysis-type confirmation */}
        {deletingType && (
          <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: MA.dangerBg, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: MA.danger }}>
              למחוק את הניתוח {deletingType === 'statistics' || deletingType === 'stats' ? 'סטטיסטיקה' : deletingType === 'video' ? 'וידאו' : 'חופשי'}? כל הנתונים יאבדו.
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeletingType(null)}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: 'rgba(13,26,18,0.06)', color: MA.textSecondary }}>
                ביטול
              </button>
              <button onClick={async () => {
                const typeToRemove = deletingType;
                setDeletingType(null);
                if (onDeleteAnalysisType) await onDeleteAnalysisType(analysis, typeToRemove);
              }}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: MA.danger, color: '#fff' }}>
                מחק
              </button>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="ma-pad" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <BottomLine
            variant="dark"
            dataForAI={{
              opponent: analysis.opponent,
              result: { our: ourScore, opponent: oppScore },
              stats: analysis.stats,
              issues: tacticalIssues,
              what_worked: analysis._summary?.what_worked,
              issues_found: analysis._summary?.issues_found,
              tactical_insights: analysis._summary?.tactical_insights,
              phase_analysis: analysis.phase_analysis,
              training_actions: analysis.training_actions,
            }}
            context="ניתוח משחק"
            cacheKey={`match-${analysis.id}`}
          />

          {/* מספרי המשחק */}
          {bars.length > 0 && (
            <Card delay={80}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <SectionTitle icon={BarChart3}>מספרי המשחק</SectionTitle>
                {Object.keys(seasonAverages).length > 0 && (
                  <span style={{ fontSize: 11, color: MA.textMuted }}>| מול ממוצע העונה</span>
                )}
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 11, color: MA.textMuted }}>
                מוצגים רק המדדים שהוזנו לניתוח — אין חובה להזין שליטה או xG
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bars.map((m, i) => {
                  const value = Number(analysis.stats[m.key]);
                  const pct = Math.max(0, Math.min(100, (value / m.max) * 100));
                  const avg = seasonAverages[m.key];
                  const avgPct = avg != null ? Math.max(0, Math.min(100, (avg / m.max) * 100)) : null;
                  return (
                    <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 56px', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: MA.textSecondary }}>{m.label}</span>
                      <div style={{ position: 'relative', height: 8, borderRadius: 9999, background: 'rgba(13,26,18,.06)' }}>
                        <div className="ma-bar-fill" style={{
                          width: `${pct}%`, height: '100%', borderRadius: 9999,
                          background: `linear-gradient(90deg,${m.from},${m.to})`,
                          animationDelay: `${200 + i * 100}ms`,
                        }} />
                        {avgPct != null && (
                          <div title={`ממוצע העונה: ${avg.toFixed(1)}${m.suffix}`} style={{
                            position: 'absolute', top: -3, right: `${avgPct}%`, width: 2, height: 14,
                            background: MA.textMuted, borderRadius: 2,
                          }} />
                        )}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: m.color, fontFamily: MA.heading }}>
                        {value}{m.suffix}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* תמונת המשחק */}
          {loading ? (
            <Card delay={120}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0' }}>
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: MA.greenMain }} />
                <span style={{ fontSize: 13, color: MA.textMuted }}>מכין תמונת משחק...</span>
              </div>
            </Card>
          ) : aiSummary?.error ? (
            <div style={{ borderRadius: 16, padding: '16px 20px', background: MA.warnBg, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle style={{ width: 18, height: 18, color: MA.warn, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: MA.warn }}>ניתוח ה-AI אינו זמין</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: MA.textSecondary }}>{aiSummary.error}</p>
              </div>
            </div>
          ) : aiSummary ? (
            <>
              {aiSummary.summary && (
                <Card delay={120}>
                  <SectionTitle icon={BookOpen}>תמונת המשחק</SectionTitle>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: MA.textSecondary }}>{aiSummary.summary}</p>
                </Card>
              )}

              {(aiSummary.insights?.critical_issue || aiSummary.insights?.improvement_area || aiSummary.insights?.positive_point) && (
                <div className="ma-fade" style={{ animationDelay: '160ms' }}>
                  <SectionTitle icon={TrendingUp}>שלוש תובנות מרכזיות</SectionTitle>
                  <div className="ma-grid-3">
                    <InsightCard title="בעיה מרכזית" content={aiSummary.insights.critical_issue}
                      icon={AlertTriangle} color={MA.danger} bg={MA.dangerBg} />
                    <InsightCard title="נקודת שיפור" content={aiSummary.insights.improvement_area}
                      icon={TrendingUp} color={MA.warn} bg={MA.warnBg} />
                    <InsightCard title="נקודה חיובית" content={aiSummary.insights.positive_point}
                      icon={Lightbulb} color={MA.greenMain} bg={MA.successBg} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -12 }}>
                <button onClick={() => loadOrGenerateAISummary(true)} disabled={loading}
                  style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, background: 'transparent', border: `1px solid rgba(13,26,18,.12)`, color: MA.textMuted, cursor: 'pointer', fontFamily: MA.body }}>
                  {loading ? 'מייצר...' : 'ייצר מחדש'}
                </button>
              </div>
            </>
          ) : null}

          {/* Did the training we prescribed actually work? */}
          <TrainingImpactCard analysis={analysis} />

          {/* ציוני שחקנים */}
          {played.length > 0 && (
            <Card delay={240}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle icon={Target}>ציוני שחקנים</SectionTitle>
                <button onClick={() => setEditingRatings(true)}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(22,163,74,.3)', color: MA.greenMain, cursor: 'pointer', fontFamily: MA.body, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Edit2 style={{ width: 12, height: 12 }} /> ערוך
                </button>
              </div>
              <div className="ma-scroll-x" style={{ display: 'flex', alignItems: 'flex-end', gap: 14, paddingBottom: 4 }}>
                {played.map((r, i) => {
                  const name = r.player_name || playerNameMap[r.player_id] || '—';
                  const note = r.note && r.note !== name ? r.note : null;
                  return (
                    <RatingRing key={i} rating={r.rating} name={name} note={note}
                      highlight={topRating != null && Number(r.rating) === topRating} />
                  );
                })}
              </div>
              {dnp.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed rgba(13,26,18,.1)', fontSize: 11, color: MA.textMuted }}>
                  לא שותפו: {dnp.map(r => r.player_name || playerNameMap[r.player_id] || '—').join(', ')}
                </div>
              )}
            </Card>
          )}

          {editingRatings && (
            <EditPlayerRatingsModal
              open={editingRatings}
              onClose={() => setEditingRatings(false)}
              analysis={{ ...analysis, player_ratings: displayRatings }}
              onSave={(updatedRatings) => {
                if (updatedRatings) setLocalRatings(updatedRatings);
                setEditingRatings(false);
                onRefresh && onRefresh();
              }}
            />
          )}

          {/* בעיות טקטיות + נושאי עבודה */}
          {(tacticalProblems.length > 0 || trainingTopics.length > 0) && (
            <div className="ma-fade ma-grid-split" style={{ animationDelay: '300ms' }}>
              {/* Issues */}
              {tacticalProblems.length > 0 && (
                <div style={{ background: MA.card, borderRadius: 16, padding: '20px 22px', boxShadow: MA.cardShadow }}>
                  <SectionTitle icon={AlertTriangle}>בעיות טקטיות שזוהו</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tacticalProblems.map((problem, i) => {
                      const colors = SEVERITY[problem.severity] || SEVERITY.medium;
                      const expansion = deepOpen ? expansionFor(problem, i) : null;
                      return (
                        <div key={i} style={{ borderRadius: 12, padding: '12px 14px', background: colors.bg, borderRight: `4px solid ${colors.border}` }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 8px', borderRadius: 9999, background: colors.badge, color: '#fff' }}>
                              {colors.label}
                            </span>
                            {problem.category && (
                              <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 9999, background: 'rgba(13,26,18,.06)', color: MA.textSecondary }}>
                                {problem.category}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: MA.textPrimary }}>
                            {problem.text}
                          </p>
                          {problem.root_cause && (
                            <p style={{ margin: '4px 0 0', fontSize: 11, color: MA.textMuted }}>
                              שורש: {problem.root_cause}
                            </p>
                          )}
                          {expansion?.explanation && (
                            <p style={{ margin: '8px 0 0', paddingTop: 8, borderTop: `1px dashed ${colors.badge}40`, fontSize: 12, lineHeight: 1.7, color: MA.textSecondary }}>
                              <span style={{ fontWeight: 700, color: colors.badge }}>למה זו בעיה: </span>
                              {expansion.explanation}
                            </p>
                          )}
                          {expansion?.supporting_data && (
                            <p style={{ margin: '6px 0 0', fontSize: 11, color: MA.textMuted }}>
                              <span style={{ fontWeight: 700 }}>המספרים: </span>{expansion.supporting_data}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {deepError && (
                      <p style={{ margin: 0, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: MA.dangerBg, color: MA.danger }}>
                        {deepError}
                      </p>
                    )}

                    {/* Deep-analysis toggle (generates on first use) */}
                    <button
                      onClick={() => (deep ? setDeepOpen(o => !o) : generateDeep())}
                      disabled={generatingDeep}
                      className="ma-hit"
                      style={{
                        marginTop: 2, width: '100%', padding: 9, borderRadius: 10,
                        border: `1px dashed rgba(22,163,74,.4)`, background: MA.successBg, color: MA.greenMain,
                        fontSize: 12, fontWeight: 700, cursor: generatingDeep ? 'wait' : 'pointer', fontFamily: MA.body,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                      {generatingDeep ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> מפיק ניתוח מעמיק...</>
                      ) : !deep ? (
                        <><Sparkles style={{ width: 14, height: 14 }} /> צור ניתוח מעמיק — הסבר מלא על כל בעיה</>
                      ) : deepOpen ? (
                        <><ChevronUp style={{ width: 14, height: 14 }} /> הסתר ניתוח מעמיק</>
                      ) : (
                        <><BookOpen style={{ width: 14, height: 14 }} /> הצג ניתוח מעמיק — הסבר מלא על כל בעיה</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Work topics — analysis output only, never a training builder */}
              {trainingTopics.length > 0 && (
                <div style={{ background: 'linear-gradient(160deg,#0D1A12,#13241A)', borderRadius: 16, padding: '20px 22px', border: '1px solid rgba(74,222,128,.2)' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, fontFamily: MA.heading, color: MA.greenAccent, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target style={{ width: 15, height: 15 }} /> נושאי עבודה לאימון הבא
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {visibleTopics.map((topic, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 8, flexShrink: 0, fontSize: 12, fontWeight: 900,
                          fontFamily: MA.heading, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: i === 0 ? MA.greenAccent : 'rgba(74,222,128,.2)',
                          color: i === 0 ? '#0D1A12' : MA.greenAccent,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? MA.cream : 'rgba(244,239,230,.85)' }}>{topic}</span>
                      </div>
                    ))}
                    {!showAllTopics && remainingTopics.length > 0 && (
                      <button onClick={() => setShowAllTopics(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: MA.greenAccent, fontSize: 11, fontWeight: 700, fontFamily: MA.body, padding: 0 }}>
                        <ChevronDown style={{ width: 13, height: 13 }} /> הצג עוד ({remainingTopics.length})
                      </button>
                    )}
                  </div>
                  <p style={{ margin: '16px 0 0', fontSize: 11, lineHeight: 1.6, color: 'rgba(244,239,230,.55)' }}>
                    נושאים שזוהו מניתוח המשחק — מומלץ לשלב באימון הקרוב
                  </p>
                </div>
              )}
            </div>
          )}

          {/* הסיפור המלא */}
          {deepOpen && deep && <DeepAnalysisStory deep={deep} />}

          {/* רגעי מפתח */}
          {hasVideoMoments && (
            <Card delay={340}>
              <SectionTitle icon={Clock}>רגעי מפתח במשחק</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.video_moments.slice(0, 5).map((moment, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: MA.surfaceSoft }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: MA.textSecondary, minWidth: 46, fontFamily: MA.heading }}>{moment.timestamp}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, color: MA.textPrimary }}>{moment.note}</p>
                      {moment.situation_tag && (
                        <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, padding: '1px 8px', borderRadius: 9999, background: 'rgba(13,26,18,.06)', color: MA.textSecondary }}>
                          {moment.situation_tag}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* סיכום מקצועי */}
          {hasSummary && analysis._summary.tactical_insights && (
            <Card delay={380} style={{ borderRight: `4px solid ${MA.greenMain}` }}>
              <SectionTitle icon={FileText} color={MA.greenMain}>סיכום מקצועי</SectionTitle>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: MA.textSecondary }}>
                {analysis._summary.tactical_insights}
              </p>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
