import React, { useState, useCallback, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTeam } from '@/components/TeamContext';
import { Loader2, Upload, FileText, CheckCircle2, PlusCircle, AlertCircle, ShieldCheck, Zap, Target, Swords, Users, Lightbulb, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, X, BarChart3, Search, Send, Lock, Save } from 'lucide-react';
import PageHero from '@/components/ui/PageHero';
import FileAnalysisResult from '@/components/analysis/FileAnalysisResult';

const SUPPORTED_TYPES = '.pdf,.csv,.xlsx,.xls';

// Friendly copy for the server-enforced daily quota (analyze-match-file).
const LIMIT_MESSAGES = {
  LIMIT_UPLOADS: 'הגעת למכסת ההעלאות היומית (2 קבצים ליום). אפשר לנסות שוב מחר.',
  LIMIT_ANALYSES: 'ניתחת את הקובץ הזה כבר פעמיים היום (מכסה: 2 ניתוחים ליום לקובץ). נסה שוב מחר או העלה קובץ אחר.',
  LIMIT_QUESTIONS: 'ניצלת את 3 השאלות לקובץ הזה. העלה קובץ חדש כדי לשאול שוב.',
};
const SUPPORTED_LABELS = ['PDF', 'CSV', 'Excel'];

const C = {
  brandGreen: '#4ADE80', brandGreenDark: '#16A34A', brandDark: '#0D1A12',
  bgApp: '#F6F4EE', bgCard: '#FFFFFF', bgCardSoft: '#FBFAF6',
  textPrimary: '#14231A', textSecondary: '#5C6B61', textMuted: '#94A39A',
  success: '#16A34A', successBg: '#E7F6EC',
  warning: '#D97706', warningBg: '#FDF3E3',
  danger: '#DC2626', dangerBg: '#FCEBEB',
  opponent: '#8A9490', opponentLight: 'rgba(138,148,144,0.15)',
};

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`}
      style={{ backgroundColor: C.bgCard, border: '1px solid rgba(20,35,26,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, iconColor, title, subtitle }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${iconColor}18` }}>
          <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} />
        </div>
        <h3 className="font-bold text-base" style={{ color: C.textPrimary }}>{title}</h3>
      </div>
      {subtitle && <p className="text-xs mr-11" style={{ color: C.textMuted }}>{subtitle}</p>}
    </div>
  );
}

function computeAdvantage(stat) {
  const ourPct = stat.our_pct;
  const oppPct = stat.opponent_pct;
  if (ourPct != null && oppPct != null) {
    if (Math.abs(ourPct - oppPct) <= 3) return 'balanced';
    if (stat.advantage === 'our' || stat.advantage === 'opponent') return stat.advantage;
    return ourPct > oppPct ? 'our' : 'opponent';
  }
  const ourNum = parseFloat(String(stat.our_value).replace('%',''));
  const oppNum = parseFloat(String(stat.opponent_value).replace('%',''));
  if (!isNaN(ourNum) && !isNaN(oppNum) && ourNum === oppNum) return 'balanced';
  if (stat.advantage === 'our' || stat.advantage === 'opponent') return stat.advantage;
  return 'balanced';
}

function ComparisonBar({ stat, ourLabel, oppLabel }) {
  const ourPct = stat.our_pct != null ? stat.our_pct : null;
  const oppPct = stat.opponent_pct != null ? stat.opponent_pct : null;
  const hasPct = ourPct != null && oppPct != null;
  const total = hasPct ? (ourPct + oppPct || 1) : 1;
  const ourWidth = hasPct ? Math.max((ourPct / total) * 100, 2) : 50;
  const oppWidth = hasPct ? Math.max((oppPct / total) * 100, 2) : 50;
  const adv = computeAdvantage(stat);
  const advLabel = adv === 'our' ? 'יתרון שלנו' : adv === 'opponent' ? 'יתרון ליריבה' : null;
  const advColor = adv === 'our' ? C.success : adv === 'opponent' ? C.danger : C.textMuted;

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {advLabel && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: adv === 'our' ? C.successBg : C.dangerBg, color: advColor }}>
              {advLabel}
            </span>
          )}
        </div>
        <span className="text-sm font-bold" style={{ color: C.textPrimary }}>{stat.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold w-12 text-left tabular-nums" style={{ color: adv === 'opponent' ? C.opponent : C.textPrimary }}>
          {stat.opponent_value || '—'}
        </span>
        <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: 'rgba(20,35,26,0.06)' }}>
          {hasPct ? (
            <>
              <div className="h-full transition-all duration-700 ease-out" style={{
                width: `${oppWidth}%`, backgroundColor: C.opponent, borderRadius: '9999px 0 0 9999px',
              }} />
              <div className="h-full transition-all duration-700 ease-out" style={{
                width: `${ourWidth}%`, backgroundColor: C.success, borderRadius: '0 9999px 9999px 0',
              }} />
            </>
          ) : (
            <div className="h-full w-full rounded-full" style={{ backgroundColor: 'rgba(20,35,26,0.08)' }} />
          )}
        </div>
        <span className="text-sm font-bold w-12 text-right tabular-nums" style={{ color: adv === 'our' ? C.success : C.textPrimary }}>
          {stat.our_value || '—'}
        </span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: C.textMuted }}>{oppLabel}</span>
        <span className="text-[10px]" style={{ color: C.textMuted }}>{ourLabel}</span>
      </div>
    </div>
  );
}

const CHAPTER_SECTIONS = [
  { key: 'overview', label: 'סקירה' },
  { key: 'possession', label: 'החזקה' },
  { key: 'defense', label: 'הגנה' },
  { key: 'duels', label: 'דו-קרבות' },
  { key: 'players', label: 'שחקנים' },
  { key: 'training', label: 'נושאי עבודה' },
];

const TeamPicker = React.memo(function TeamPicker({ originalTeamNames, onContinue }) {
  const [ourTeam, setOurTeam] = useState('');
  const [opponent, setOpponent] = useState('');
  const handleTeamChange = (selected) => {
    setOurTeam(selected);
    const other = selected === originalTeamNames.team_a ? originalTeamNames.team_b
      : selected === originalTeamNames.team_b ? originalTeamNames.team_a : '';
    if (other && (opponent === '' || opponent === originalTeamNames.team_a || opponent === originalTeamNames.team_b)) {
      setOpponent(other);
    }
  };
  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader icon={Users} iconColor="#2A5FA8" title="זיהוי הקבוצות"
          subtitle="בחר מי מהשתיים בקובץ זו הקבוצה שלך. השם יוחלף אוטומטית לשם הרשום במערכת." />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: C.textSecondary }}>הקבוצה שלי (לזיהוי)</label>
            <select value={ourTeam} onChange={(e) => handleTeamChange(e.target.value)}
              className="w-full p-3 rounded-xl text-sm" style={{ backgroundColor: C.bgCardSoft, border: '1px solid rgba(20,35,26,0.12)', color: C.textPrimary }}>
              <option value="">בחר מתוך הקבוצות בקובץ...</option>
              {originalTeamNames.team_a && <option value={originalTeamNames.team_a}>{originalTeamNames.team_a}</option>}
              {originalTeamNames.team_b && <option value={originalTeamNames.team_b}>{originalTeamNames.team_b}</option>}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: C.textSecondary }}>הקבוצה היריבה</label>
            <input type="text" value={opponent} onChange={(e) => setOpponent(e.target.value)}
              placeholder="שם הקבוצה היריבה בעברית"
              className="w-full p-3 rounded-xl text-sm" style={{ backgroundColor: C.bgCardSoft, border: '1px solid rgba(20,35,26,0.12)', color: C.textPrimary }} />
            <p className="text-[10px] mt-1 mr-1" style={{ color: C.textMuted }}>מומלץ לכתוב את שם הקבוצה בעברית, כדי שהניתוח יוצג בצורה אחידה.</p>
          </div>
        </div>
      </Card>
      <button onClick={() => onContinue(ourTeam, opponent)} disabled={!ourTeam || !opponent}
        className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{
          backgroundColor: (!ourTeam || !opponent) ? 'rgba(20,35,26,0.08)' : C.success,
          color: '#fff', opacity: (!ourTeam || !opponent) ? 0.5 : 1,
          cursor: (!ourTeam || !opponent) ? 'not-allowed' : 'pointer',
          boxShadow: (!ourTeam || !opponent) ? 'none' : '0 4px 14px rgba(22,163,74,0.25)'
        }}>
        <ArrowLeft className="w-5 h-5" /> המשך לניתוח
      </button>
    </div>
  );
});

const DeepDive = React.memo(function DeepDive({ fileUrl, ourTeam, opponent }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true); setAnswer(null);
    try {
      const result = await base44.functions.invoke('analyzeMatchFile', {
        file_url: fileUrl, mode: 'deep_dive',
        our_team_name: ourTeam, opponent_name: opponent,
        question: question.trim()
      });
      setAnswer(result.data || { no_data: true, title: 'לא התקבלה תשובה', blocks: [] });
    } catch {
      setAnswer({ no_data: true, title: 'שגיאה בפנייה לשרת', blocks: [] });
    } finally { setLoading(false); }
  };

  return (
    <Card className="mt-2">
      <SectionHeader icon={Search} iconColor="#7A4FA0"
        title="רוצה להעמיק על נושא מסוים?"
        subtitle="שאל כל שאלה שקשורה למשחק — המערכת בודקת את התשובה לפי המידע בקובץ בלבד" />
      <div className="flex gap-2.5">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion(); } }}
          placeholder="לדוגמה: מה היה המערך שלהם ברוב המשחק? איך השתנה הקצב בחצי השני?"
          rows={2} className="flex-1 p-3 rounded-xl text-sm resize-none"
          style={{ backgroundColor: C.bgCardSoft, border: '1px solid rgba(20,35,26,0.12)', color: C.textPrimary }}
          disabled={loading} />
        <button onClick={askQuestion} disabled={loading || !question.trim()}
          className="flex-shrink-0 px-4 rounded-xl flex items-center justify-center transition-all"
          style={{
            backgroundColor: (loading || !question.trim()) ? 'rgba(20,35,26,0.06)' : '#7A4FA0',
            color: (loading || !question.trim()) ? C.textMuted : '#fff',
            cursor: (loading || !question.trim()) ? 'default' : 'pointer'
          }}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
      {loading && (
        <div className="flex items-center gap-2 py-3" style={{ color: C.textMuted }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">מחפש תשובה בקובץ...</span>
        </div>
      )}
      {answer && (
        <div className="mt-5 space-y-3" style={{ borderTop: '1px solid rgba(20,35,26,0.08)', paddingTop: '1rem' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#7A4FA018' }}>
              <Search className="w-3.5 h-3.5" style={{ color: '#7A4FA0' }} />
            </div>
            <h4 className="font-bold text-sm" style={{ color: C.textPrimary }}>{answer.title}</h4>
            {answer.no_data && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: C.dangerBg, color: C.danger }}>אין מידע בקובץ</span>
            )}
          </div>
          {(answer.blocks || []).map((block, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(122,79,160,0.03)', border: '1px solid rgba(122,79,160,0.12)' }}>
              <h5 className="font-semibold text-sm mb-2" style={{ color: '#7A4FA0' }}>{block.subtitle}</h5>
              <p className="text-sm leading-relaxed mb-2.5" style={{ color: C.textSecondary }}>{block.content}</p>
              {(block.highlights || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {block.highlights.map((h, j) => (
                    <span key={j} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{ backgroundColor: '#7A4FA010', border: '1px solid rgba(122,79,160,0.15)' }}>
                      <span style={{ color: C.textMuted }}>{h.label}:</span>
                      <span className="font-bold" style={{ color: C.textPrimary }}>{h.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(answer.blocks || []).length === 0 && !loading && (
            <p className="text-sm" style={{ color: C.textMuted }}>אין מספיק מידע בקובץ כדי לענות על השאלה הזו.</p>
          )}
        </div>
      )}
    </Card>
  );
});

export default function MatchFileAnalysis() {
  const { selectedTeamId } = useTeam();
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [identifiedTeams, setIdentifiedTeams] = useState({ ourTeam: '', opponent: '' });
  const [originalTeamNames, setOriginalTeamNames] = useState({ team_a: '', team_b: '' });
  const [addedIssues, setAddedIssues] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [activeChapter, setActiveChapter] = useState('overview');
  const [addedTopics, setAddedTopics] = useState(new Set());
  const [usage, setUsage] = useState({ uploadsToday: 0, analysesToday: 0 });
  const fileInputRef = useRef();
  const sectionRefs = useRef({});

  const handleFile = useCallback((f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf','csv','xlsx','xls'].includes(ext)) {
      setError('פורמט לא נתמך. יש להעלות PDF, CSV או Excel.');
      return;
    }
    setError(null); setFile(f); setFileUrl(null); setAnalysis(null);
    setStep('upload'); setAddedIssues(new Set());
    setIdentifiedTeams({ ourTeam: '', opponent: '' });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const startTeamScan = async () => {
    if (!file) return;
    setStep('scanning'); setError(null);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const url = uploadResult.file_url || uploadResult?.data?.file_url;
      if (!url) throw new Error('העלאת הקובץ נכשלה');
      setFileUrl(url);
      const result = await base44.functions.invoke('analyzeMatchFile', { file_url: url, mode: 'identify_teams' });
      if (result?.limit_error) {
        setError(LIMIT_MESSAGES[result.limit_error.code] || 'הגעת למכסת השימוש היומית.');
        setStep('upload');
        return;
      }
      if (result?.usage) setUsage(u => ({ ...u, uploadsToday: result.usage.uploads_used }));
      const teams = result.data || result;
      setOriginalTeamNames({ team_a: teams?.team_a || '', team_b: teams?.team_b || '' });
      setStep('pick_teams');
    } catch (e) {
      console.error('Team scan error:', e);
      setError('שגיאה בזיהוי הקבוצות: ' + (e?.message || 'שגיאה לא ידועה'));
      setStep('upload');
    }
  };

  const startFullAnalysis = async (ourTeamFilePick, opponentName) => {
    if (!ourTeamFilePick || !opponentName) { setError('יש להזין את שתי הקבוצות.'); return; }
    setStep('analyzing'); setError(null);
    try {
      let ourTeamDisplayName = ourTeamFilePick;
      if (selectedTeamId) {
        const userTeams = await base44.entities.Team.list();
        const activeTeam = userTeams.find(t => t.id === selectedTeamId);
        if (activeTeam?.name) ourTeamDisplayName = activeTeam.name;
      }
      setIdentifiedTeams({ ourTeam: ourTeamDisplayName, opponent: opponentName });
      const result = await base44.functions.invoke('analyzeMatchFile', {
        file_url: fileUrl, our_team_name: ourTeamDisplayName, opponent_name: opponentName
      });
      if (result?.limit_error) {
        setError(LIMIT_MESSAGES[result.limit_error.code] || 'הגעת למכסת השימוש היומית.');
        setStep('pick_teams');
        return;
      }
      if (result?.usage) setUsage(u => ({ ...u, analysesToday: result.usage.analyses_used_for_file }));
      const data = result.data || result;
      setAnalysis({ ...data, _ourTeamDisplayName: ourTeamDisplayName, _opponentName: opponentName });
      setStep('result');
      setExpandedSections({ overview: true, possession: true, defense: true, duels: true });
    } catch (e) {
      console.error('Full analysis error:', e);
      setError('שגיאה בניתוח הקובץ: ' + (e?.message || 'שגיאה לא ידועה'));
      setStep('pick_teams');
    }
  };

  useEffect(() => {
    if (step !== 'result') return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveChapter(entry.target.dataset.chapter);
      }
    }, { rootMargin: '-80px 0px -70% 0px' });
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [step, analysis]);

  const handleNavigate = (key) => {
    setActiveChapter(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const parseStatNumber = (val) => {
    if (val == null) return 0;
    const n = parseFloat(String(val).replace('%', '').trim());
    return isNaN(n) ? 0 : n;
  };

  const mapStatsToMatchAnalysis = (allStats) => {
    const stats = { shots: 0, shots_on_target: 0, xg: 0, possession: 0, passes: 0, pass_accuracy: 0, tackles: 0, interceptions: 0, turnovers: 0, critical_errors: 0 };
    if (!allStats?.length) return stats;
    const labelMap = {
      'החזקת כדור': 'possession', 'מסירות': 'passes', 'דיוק מסירות': 'pass_accuracy',
      'בעיטות': 'shots', 'בעיטות למסגרת': 'shots_on_target', 'שערים צפויים': 'xg',
      'תיקולים': 'tackles', 'חסימות': 'interceptions', 'איבודי כדור': 'turnovers',
      'טעויות קריטיות': 'critical_errors', 'החלקות': 'tackles', 'חיסולים': 'interceptions',
      'דו-קרבות קרקע': 'tackles', 'דו-קרבות אוויר': 'interceptions',
      'xG': 'xg', 'PPDA': 'interceptions', 'מסירות מפתח': 'passes', 'איבודים': 'turnovers',
    };
    for (const s of allStats) {
      if (!s.our_value && !s.opponent_value && s.our_pct == null && s.opponent_pct == null) continue;
      const label = s.label || '';
      let field = null;
      for (const [key, val] of Object.entries(labelMap)) { if (label.includes(key)) { field = val; break; } }
      if (!field) continue;
      if (field === 'possession' || field === 'pass_accuracy') {
        stats[field] = s.our_pct != null ? s.our_pct : parseStatNumber(s.our_value);
      } else {
        if (s.our_pct == null && !s.our_value) continue;
        stats[field] = parseStatNumber(s.our_value);
      }
    }
    return stats;
  };

  const handleSaveToAnalysis = async () => {
    if (!identifiedTeams.ourTeam || !identifiedTeams.opponent) return;
    setSaving(true); setError(null);
    try {
      const userTeams = await base44.entities.Team.list();
      const ourTeamDisplayName = analysis._ourTeamDisplayName || identifiedTeams.ourTeam;
      let teamId = null;
      for (const t of userTeams) {
        if (t.name.toLowerCase().includes(ourTeamDisplayName.toLowerCase()) ||
            ourTeamDisplayName.toLowerCase().includes(t.name.toLowerCase())) { teamId = t.id; break; }
      }
      if (!teamId) teamId = userTeams.length > 0 ? userTeams[0].id : identifiedTeams.ourTeam;
      const matchDate = analysis?.match_details?.date || new Date().toISOString().split('T')[0];
      const ourScore = analysis?.match_details?.our_score;
      const opponentScore = analysis?.match_details?.opponent_score;
      const sr = analysis?.summary_report;
      const fr = analysis?.full_report;
      const isFull = analysis?.analysis_type === 'full';

      const game = await base44.entities.GameSchedule.create({
        team_id: teamId, opponent: identifiedTeams.opponent,
        game_date: matchDate + 'T00:00:00', context: 'ליגה',
        location: analysis?.match_details?.location === 'חוץ' ? 'חוץ' : 'בית',
        status: 'completed', notes: JSON.stringify({ source: 'file_analysis' })
      });

      let freeNotes = '';
      if (isFull) {
        freeNotes = ['## סקירה טקטית', fr?.tactical_overview || '', '', '## החזקת כדור ומסירות', fr?.possession_passing_summary || '', '',
          '## הגנה ולחץ', fr?.defense_pressure_summary || '', '', '## דו-קרבות ומעברים', fr?.duels_transitions_summary || '', '',
          '## סיכום', fr?.executive_summary || ''].join('\n');
      } else {
        freeNotes = ['## מה היה במשחק', sr?.what_happened || '', '', '## מה הלך טוב',
          ...(sr?.what_went_well || []).map(s => '- ' + s), '', '## מה הלך פחות טוב',
          ...(sr?.what_went_poorly || []).map(s => '- ' + s)].join('\n');
      }

      const summary = await base44.entities.ProfessionalSummary.create({
        team_id: teamId, event_id: game.id, event_type: 'match', event_date: matchDate,
        event_label: `מול ${identifiedTeams.opponent}`,
        topic: isFull ? (fr?.tactical_overview?.substring(0, 80) || 'ניתוח מלא') : (sr?.what_happened?.substring(0, 80) || 'סיכום משחק'),
        what_worked: isFull ? (fr?.possession_passing_summary || '') : (sr?.what_went_well || []).join('\n'),
        issues_found: isFull ? ((fr?.key_issues || []).join('\n') || fr?.defense_pressure_summary || '') : (sr?.what_went_poorly || []).join('\n'),
        tactical_insights: isFull ? (fr?.tactical_overview || '') : '',
        result_our: ourScore || null, result_opponent: opponentScore || null, satisfaction: 3
      });

      const allFullStats = [...(fr?.possession_passing_stats || []), ...(fr?.defense_pressure_stats || []), ...(fr?.duels_transitions_stats || [])];
      const mappedStats = isFull ? mapStatsToMatchAnalysis(allFullStats) : null;
      const issues = isFull ? (fr?.key_issues || []) : (sr?.what_went_poorly || []);

      const analysisPayload = {
        team_id: teamId, summary_id: summary.id, opponent: identifiedTeams.opponent, date: matchDate,
        result: { our_score: ourScore || 0, opponent_score: opponentScore || 0 },
        analysis_types: ['freeform'], free_notes: freeNotes,
        report: {
          summary: isFull ? (fr?.executive_summary || '') : (sr?.what_happened || ''),
          positives: isFull ? [] : (sr?.what_went_well || []),
          issues,
          recommendations: isFull ? (fr?.training_topics || []).map(t => `${t.topic} (${t.urgency})`) : (sr?.training_topics || [])
        },
        training_actions: isFull
          ? (fr?.training_topics || []).map(t => ({ focus: t.topic, drill_suggestion: t.rationale, priority: t.urgency === 'דחוף' ? 'high' : 'medium', completed: false }))
          : (sr?.training_topics || []).map(t => ({ focus: t, drill_suggestion: '', priority: 'medium', completed: false }))
      };
      if (isFull && mappedStats) { analysisPayload.analysis_types.push('statistics'); analysisPayload.stats = mappedStats; }
      await base44.entities.MatchAnalysis.create(analysisPayload);

      for (const issue of issues) {
        try {
          await base44.entities.KeyMatchSituation.create({
            team_id: teamId, situation_name: issue.substring(0, 80), situation_category: 'ניהול משחק',
            description: issue, status: 'active', severity: 'medium', source_match_id: game.id, occurrence_count: 1
          });
          await base44.entities.TacticalGoal.create({
            team_id: teamId, title: issue.substring(0, 80), description: issue,
            priority: 'medium', status: 'active', source: 'match', source_match_id: game.id,
          });
        } catch {}
      }
      setSaveDone(true); setStep('saving');
    } catch (e) {
      setError('שגיאה בשמירה: ' + (e.message || ''));
    } finally { setSaving(false); }
  };

  const resetToUpload = () => {
    setStep('upload'); setFile(null); setFileUrl(null); setAnalysis(null);
    setIdentifiedTeams({ ourTeam: '', opponent: '' }); setOriginalTeamNames({ team_a: '', team_b: '' });
    setAddedIssues(new Set()); setAddedTopics(new Set()); setSaveDone(false);
  };

  // Add a single training topic to the tactical pipeline (goal + situation).
  const handleAddTopic = async (topic) => {
    const title = (topic?.topic || '').substring(0, 80);
    if (!title || addedTopics.has(topic.topic)) return;
    setAddedTopics(prev => new Set(prev).add(topic.topic));
    try {
      const userTeams = await base44.entities.Team.list();
      const ourName = analysis?._ourTeamDisplayName || identifiedTeams.ourTeam || '';
      let teamId = userTeams.find(t =>
        t.name?.toLowerCase().includes(ourName.toLowerCase()) || ourName.toLowerCase().includes((t.name || '').toLowerCase())
      )?.id || (selectedTeamId || userTeams[0]?.id);
      if (!teamId) return;
      const desc = topic.rationale_with_numbers || topic.rationale || title;
      await base44.entities.TacticalGoal.create({
        team_id: teamId, title, description: desc,
        priority: topic.urgency === 'דחוף' ? 'high' : 'medium', status: 'active', source: 'match',
      });
    } catch (e) { console.warn('Add topic failed:', e); }
  };

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const StatsSection = ({ title, icon, iconColor, summary, stats, ourLabel, oppLabel, sectionKey }) => (
    <Card>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection(sectionKey)}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${iconColor}18` }}>
            {React.createElement(icon, { className: "w-4.5 h-4.5", style: { color: iconColor } })}
          </div>
          <h3 className="font-bold text-base" style={{ color: C.textPrimary }}>{title}</h3>
        </div>
        {expandedSections[sectionKey]
          ? <ChevronUp className="w-5 h-5" style={{ color: C.textMuted }} />
          : <ChevronDown className="w-5 h-5" style={{ color: C.textMuted }} />}
      </div>
      {expandedSections[sectionKey] && (
        <div className="mt-5">
          {summary && <p className="text-sm leading-relaxed mb-5" style={{ color: C.textSecondary }}>{summary}</p>}
          {stats?.length > 0 && stats.map((s, i) => (
            <ComparisonBar key={i} stat={s} ourLabel={ourLabel} oppLabel={oppLabel} />
          ))}
        </div>
      )}
    </Card>
  );

  const stepLabels = { upload: 'העלאה', scanning: 'סריקה', pick_teams: 'זיהוי', analyzing: 'ניתוח', result: 'תוצאות', saving: 'שמירה' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bgApp }} dir="rtl">
      <div className="w-full px-4 lg:px-8 py-6">
        <div className="mb-4">
          <PageHero icon={FileText} title="ניתוח קובץ משחק" subtitle="העלה דוח, תמונה או סטטיסטיקות — וקבל ניתוח מקצועי מלא" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <a href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
            style={{ backgroundColor: 'rgba(20,35,26,0.04)', color: C.textSecondary, border: '1px solid rgba(20,35,26,0.1)' }}>
            <ArrowRight className="w-3.5 h-3.5" /> דף הבית
          </a>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: C.textMuted }}>
            {['upload','pick_teams','analyzing','result'].map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span className="mx-0.5">›</span>}
                <span className={step === s ? 'font-bold' : ''} style={{ color: step === s ? C.success : C.textMuted }}>{stepLabels[s]}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl flex items-start gap-2" style={{ backgroundColor: C.dangerBg, border: '1px solid rgba(220,38,38,0.18)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.danger }} />
            <p className="text-sm flex-1" style={{ color: C.danger }}>{error}</p>
            <button onClick={() => setError(null)}><X className="w-4 h-4" style={{ color: C.danger }} /></button>
          </div>
        )}

        {/* UPLOAD */}
        {step === 'upload' && (
          <>
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl p-12 text-center cursor-pointer transition-all duration-200"
              style={{ backgroundColor: dragOver ? C.successBg : C.bgCard, border: `2px dashed ${dragOver ? C.success : 'rgba(20,35,26,0.18)'}` }}>
              <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: C.success }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: C.textPrimary }}>
                {file ? 'הקובץ מוכן לניתוח' : 'גרור קובץ לכאן או לחץ לבחירה'}
              </h2>
              <p className="text-sm mb-3" style={{ color: C.textSecondary }}>
                {file ? file.name : 'PDF, CSV, Excel — דוח Wyscout‏, Instat, או סיכום ידני'}
              </p>
              <div className="flex justify-center gap-2">
                {SUPPORTED_LABELS.map(label => (
                  <span key={label} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: C.successBg, color: C.success }}>{label}</span>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept={SUPPORTED_TYPES} className="hidden"
                onClick={(e) => e.stopPropagation()} onChange={(e) => handleFile(e.target.files[0])} />
            </div>
            {file && (
              <div className="mt-14 text-center">
                <button onClick={startTeamScan}
                  className="px-8 py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 mx-auto transition-all hover:opacity-90"
                  style={{ backgroundColor: C.success, color: '#fff', boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}>
                  <BarChart3 className="w-5 h-5" /> נתח את הקובץ
                </button>
              </div>
            )}
          </>
        )}

        {/* SCANNING */}
        {step === 'scanning' && (
          <Card>
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: C.success }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: C.textPrimary }}>מזהה את הקבוצות בקובץ...</h3>
              <p className="text-sm" style={{ color: C.textSecondary }}>סורק את הנתונים ומזהה את שמות הקבוצות</p>
            </div>
          </Card>
        )}

        {/* PICK TEAMS */}
        {step === 'pick_teams' && <TeamPicker originalTeamNames={originalTeamNames} onContinue={startFullAnalysis} />}

        {/* ANALYZING */}
        {step === 'analyzing' && (
          <Card>
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-5" style={{ color: C.success }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: C.textPrimary }}>מפיק ניתוח מלא...</h3>
              <p className="text-sm mb-1" style={{ color: C.textSecondary }}>מנתח את "{identifiedTeams.ourTeam}" מול "{identifiedTeams.opponent}"</p>
              <p className="text-xs" style={{ color: C.textMuted }}>קורא נתונים, מזהה דפוסים, מפיק תובנות טקטיות</p>
            </div>
          </Card>
        )}

        {/* RESULT */}
        {step === 'result' && analysis && (() => {
          const isFull = analysis.analysis_type === 'full' && analysis.full_report;
          const fr = analysis.full_report;
          const sr = analysis.summary_report;
          const md = analysis.match_details;
          const ourLabel = analysis._ourTeamDisplayName || 'אנחנו';
          const oppLabel = analysis._opponentName || 'יריבה';

          // Full analysis → the redesigned file-analysis result (scoreboard,
          // rings, bars, halves, players, training topics, ask-the-file, save).
          if (isFull) {
            return (
              <FileAnalysisResult
                analysis={analysis} fileUrl={fileUrl} ourLabel={ourLabel} oppLabel={oppLabel}
                onSave={handleSaveToAnalysis} saving={saving} saveDone={saveDone}
                onNewFile={resetToUpload} onAddTopic={handleAddTopic} addedTopics={addedTopics} usage={usage}
              />
            );
          }

          const heroStats = [];
          if (isFull && fr) {
            const allStats = [...(fr.possession_passing_stats || []), ...(fr.defense_pressure_stats || []), ...(fr.duels_transitions_stats || [])];
            for (const s of allStats.slice(0, 3)) {
              heroStats.push({ label: s.label, ourValue: s.our_value, oppValue: s.opponent_value, advantage: computeAdvantage(s) });
            }
          }

          return (
            <div className="space-y-5">
              {/* Dark match header */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0D1A12 0%, #1A2F23 100%)' }}>
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {md?.date && <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: C.brandGreen }}>{md.date}</span>}
                      {md?.location && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>{md.location}</span>}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: isFull ? 'rgba(122,79,160,0.2)' : 'rgba(42,95,168,0.2)', color: isFull ? '#C4A5F0' : '#7ABAFF' }}>
                      {isFull ? '📊 ניתוח מלא' : '📋 סיכום'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white text-center mb-2">
                    {ourLabel} מול {oppLabel}
                  </h2>
                  {md?.our_score != null && (
                    <p className="text-4xl font-black text-center mb-4" style={{ color: C.brandGreen }}>
                      {md.our_score} – {md.opponent_score}
                    </p>
                  )}
                </div>

                {/* Hero stat cards */}
                {heroStats.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 px-6 pb-6">
                    {heroStats.map((hs, i) => (
                      <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-[10px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{hs.label}</p>
                        <p className="text-xl font-black" style={{ color: hs.advantage === 'our' ? C.brandGreen : hs.advantage === 'opponent' ? '#FF6B6B' : 'white' }}>
                          {hs.ourValue}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{hs.oppValue}</p>
                        <span className="text-[9px] px-2 py-0.5 rounded-full mt-1 inline-block"
                          style={{
                            backgroundColor: hs.advantage === 'our' ? 'rgba(74,222,128,0.15)' : hs.advantage === 'opponent' ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.06)',
                            color: hs.advantage === 'our' ? C.brandGreen : hs.advantage === 'opponent' ? '#FF6B6B' : 'rgba(255,255,255,0.5)'
                          }}>
                          {hs.advantage === 'our' ? 'יתרון שלנו' : hs.advantage === 'opponent' ? 'יתרון ליריבה' : 'מאוזן'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chapter navigation (full only) */}
              {isFull && fr && (
                <div className="sticky top-0 z-20 py-2" style={{ backgroundColor: C.bgApp }}>
                  <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
                    {CHAPTER_SECTIONS.map(ch => (
                      <button key={ch.key} onClick={() => handleNavigate(ch.key)}
                        className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                        style={{
                          backgroundColor: activeChapter === ch.key ? C.brandDark : 'rgba(20,35,26,0.05)',
                          color: activeChapter === ch.key ? '#fff' : C.textSecondary,
                        }}>
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SUMMARY MODE */}
              {!isFull && sr && (
                <>
                  <Card>
                    <SectionHeader icon={Target} iconColor={C.success} title="מה היה במשחק" />
                    <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{sr.what_happened || 'אין מידע בקובץ.'}</p>
                  </Card>
                  {(sr.what_went_well || []).length > 0 && (
                    <Card>
                      <SectionHeader icon={CheckCircle2} iconColor={C.success} title="מה הלך טוב" />
                      <div className="space-y-2">
                        {sr.what_went_well.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ backgroundColor: C.successBg, border: '1px solid rgba(22,163,74,0.12)' }}>
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.success }} />
                            <p className="text-sm" style={{ color: C.textPrimary }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {(sr.what_went_poorly || []).length > 0 && (
                    <Card>
                      <SectionHeader icon={AlertCircle} iconColor={C.danger} title="מה הלך פחות טוב" />
                      <div className="space-y-2">
                        {sr.what_went_poorly.map((item, i) => {
                          const isAdded = addedIssues.has(i);
                          return (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl"
                              style={{ backgroundColor: isAdded ? C.successBg : C.dangerBg, border: `1px solid ${isAdded ? 'rgba(22,163,74,0.14)' : 'rgba(220,38,38,0.12)'}` }}>
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isAdded ? C.success : C.danger }} />
                              <p className="text-sm flex-1" style={{ color: C.textPrimary }}>{item}</p>
                              <button onClick={() => setAddedIssues(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                                className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isAdded ? 'rotate-45' : ''}`}
                                style={{ backgroundColor: isAdded ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.1)', color: isAdded ? C.success : C.danger }}>
                                <PlusCircle className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                  {(sr.training_topics || []).length > 0 && (
                    <Card>
                      <SectionHeader icon={Lightbulb} iconColor={C.warning} title="נושאים לעבודה באימון הבא" />
                      <div className="space-y-2">
                        {sr.training_topics.map((item, i) => (
                          <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: C.warningBg, border: '1px solid rgba(217,119,6,0.12)' }}>
                            <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* FULL MODE */}
              {isFull && fr && (
                <>
                  <div ref={el => sectionRefs.current.overview = el} data-chapter="overview">
                    <StatsSection title="סקירה טקטית" icon={Target} iconColor={C.success}
                      summary={fr.tactical_overview} stats={[]} ourLabel={ourLabel} oppLabel={oppLabel} sectionKey="overview" />
                  </div>
                  <div ref={el => sectionRefs.current.possession = el} data-chapter="possession">
                    <StatsSection title="החזקת כדור ומסירות" icon={BarChart3} iconColor="#2563EB"
                      summary={fr.possession_passing_summary} stats={fr.possession_passing_stats}
                      ourLabel={ourLabel} oppLabel={oppLabel} sectionKey="possession" />
                  </div>
                  <div ref={el => sectionRefs.current.defense = el} data-chapter="defense">
                    <StatsSection title="הגנה ולחץ" icon={ShieldCheck} iconColor={C.success}
                      summary={fr.defense_pressure_summary} stats={fr.defense_pressure_stats}
                      ourLabel={ourLabel} oppLabel={oppLabel} sectionKey="defense" />
                  </div>
                  <div ref={el => sectionRefs.current.duels = el} data-chapter="duels">
                    <StatsSection title="דו-קרבות ומעברים" icon={Swords} iconColor={C.warning}
                      summary={fr.duels_transitions_summary} stats={fr.duels_transitions_stats}
                      ourLabel={ourLabel} oppLabel={oppLabel} sectionKey="duels" />
                  </div>

                  {/* Standout Players */}
                  <div ref={el => sectionRefs.current.players = el} data-chapter="players">
                    {(fr.standout_players || []).length > 0 && (
                      <Card>
                        <SectionHeader icon={Users} iconColor={C.brandDark} title="שחקנים בולטים"
                          subtitle="מוצג בדוח זה בלבד — לא נשמר בניתוח המשחקים" />
                        <div className="flex items-center gap-1.5 mb-4">
                          <Lock className="w-3 h-3" style={{ color: C.textMuted }} />
                          <span className="text-[10px]" style={{ color: C.textMuted }}>מוצג בדוח זה בלבד — לא נשמר בניתוח המשחקים</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          {fr.standout_players.map((p, i) => {
                            const initials = (p.name || '').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                            return (
                              <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: C.bgCard, border: '1px solid rgba(20,35,26,0.08)' }}>
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white"
                                    style={{ backgroundColor: C.brandDark }}>
                                    {initials}
                                  </div>
                                  <div>
                                    <span className="font-bold text-sm block" style={{ color: C.textPrimary }}>{p.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                                      style={{ backgroundColor: 'rgba(20,35,26,0.06)', color: C.textSecondary }}>{p.position}</span>
                                  </div>
                                </div>
                                <p className="text-xs leading-relaxed mb-3" style={{ color: C.textSecondary }}>{p.summary}</p>
                                {(p.stats || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {p.stats.map((s, j) => (
                                      <span key={j} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full"
                                        style={{ backgroundColor: C.successBg, color: C.success, border: '1px solid rgba(22,163,74,0.12)' }}>
                                        <span style={{ color: C.textSecondary }}>{s.label}:</span>
                                        <span className="font-bold">{s.value}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Training Topics */}
                  <div ref={el => sectionRefs.current.training = el} data-chapter="training">
                    {(fr.training_topics || []).length > 0 && (
                      <Card>
                        <SectionHeader icon={Lightbulb} iconColor={C.warning} title="נושאי עבודה לאימון הבא" />
                        <div className="space-y-2.5">
                          {fr.training_topics.map((t, i) => (
                            <div key={i} className="p-4 rounded-xl flex items-start gap-3"
                              style={{
                                backgroundColor: t.urgency === 'דחוף' ? C.dangerBg : C.warningBg,
                                border: `1px solid ${t.urgency === 'דחוף' ? 'rgba(220,38,38,0.16)' : 'rgba(217,119,6,0.14)'}`
                              }}>
                              <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold"
                                style={{ backgroundColor: t.urgency === 'דחוף' ? C.danger : C.warning, color: '#fff' }}>
                                {t.urgency}
                              </span>
                              <div>
                                <p className="font-semibold text-sm" style={{ color: C.textPrimary }}>{t.topic}</p>
                                <p className="text-xs mt-1 leading-relaxed" style={{ color: C.textSecondary }}>{t.rationale}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Executive Summary */}
                    {fr.executive_summary && (
                      <Card className="mt-5">
                        <SectionHeader icon={Zap} iconColor="#9A6A10" title="סיכום מנהלים" />
                        <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{fr.executive_summary}</p>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* Deep Dive */}
              <DeepDive fileUrl={fileUrl} ourTeam={analysis._ourTeamDisplayName || identifiedTeams.ourTeam} opponent={identifiedTeams.opponent} />

              {/* Save / New File buttons */}
              <div className="flex gap-3">
                <button onClick={handleSaveToAnalysis} disabled={saving || saveDone}
                  className="flex-1 py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{
                    backgroundColor: saveDone ? C.successBg : C.success,
                    color: saveDone ? C.success : '#fff',
                    boxShadow: saveDone ? 'none' : '0 4px 14px rgba(22,163,74,0.25)',
                    opacity: saving ? 0.7 : 1
                  }}>
                  {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> שומר...</>
                    : saveDone ? <><CheckCircle2 className="w-5 h-5" /> נשמר</>
                    : <><Save className="w-5 h-5" /> שמור ניתוח</>}
                </button>
                <button onClick={() => {
                  setStep('upload'); setFile(null); setFileUrl(null); setAnalysis(null);
                  setIdentifiedTeams({ ourTeam: '', opponent: '' }); setOriginalTeamNames({ team_a: '', team_b: '' });
                  setAddedIssues(new Set()); setSaveDone(false);
                }}
                  className="px-6 py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ backgroundColor: 'rgba(20,35,26,0.05)', color: C.textSecondary, border: '1px solid rgba(20,35,26,0.1)' }}>
                  <Upload className="w-5 h-5" /> קובץ חדש
                </button>
              </div>
            </div>
          );
        })()}

        {/* SAVE DONE */}
        {step === 'saving' && saveDone && (
          <div className="space-y-5">
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: C.successBg }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: C.success }} />
                </div>
                <h3 className="font-bold text-xl mb-2" style={{ color: C.textPrimary }}>הניתוח נשמר בהצלחה</h3>
                <p className="text-sm mb-6" style={{ color: C.textSecondary }}>
                  "{analysis._ourTeamDisplayName || identifiedTeams.ourTeam}" מול "{identifiedTeams.opponent}" — נוסף לתיק המשחק
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => {
                    setStep('upload'); setFile(null); setFileUrl(null); setAnalysis(null);
                    setIdentifiedTeams({ ourTeam: '', opponent: '' }); setOriginalTeamNames({ team_a: '', team_b: '' });
                    setAddedIssues(new Set()); setSaveDone(false);
                  }}
                    className="px-6 py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: C.success, color: '#fff' }}>
                    ניתוח קובץ נוסף
                  </button>
                  <a href="/?view=match" className="px-6 py-3 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)' }}>
                    מעבר לניתוחי משחקים
                  </a>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

