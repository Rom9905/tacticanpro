import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useTeam } from '@/components/TeamContext';
import { Loader2, Upload, CheckCircle2, PlusCircle, AlertCircle, ShieldCheck, Zap, Target, Swords, Users, Lightbulb, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, X, BarChart3, TrendingUp, TrendingDown, Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUPPORTED_TYPES = '.pdf,.csv,.xlsx,.xls';
const SUPPORTED_LABELS = ['PDF', 'CSV', 'Excel'];

// ── Module-level sub-components (not recreated on every render) ──
function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`}
      style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, iconColor, title, subtitle }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${iconColor}15` }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <h3 className="font-bold text-base" style={{ color: '#2C2416' }}>{title}</h3>
      </div>
      {subtitle && <p className="text-xs mr-10" style={{ color: '#9A8672' }}>{subtitle}</p>}
    </div>
  );
}

function ComparisonBar({ stat, ourLabel, oppLabel }) {
  const ourPct = stat.our_pct != null ? stat.our_pct : null;
  const oppPct = stat.opponent_pct != null ? stat.opponent_pct : null;
  const hasPct = ourPct != null && oppPct != null;
  const total = hasPct ? (ourPct + oppPct || 1) : 1;
  const ourWidth = hasPct ? (ourPct / total) * 100 : 0;
  const oppWidth = hasPct ? (oppPct / total) * 100 : 0;
  const adv = stat.advantage;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color: '#5C4E38' }}>{stat.label}</span>
        {adv && adv !== 'none' && (
          adv === 'our'
            ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#2A7050' }} />
            : <TrendingDown className="w-3.5 h-3.5" style={{ color: '#B94040' }} />
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold w-10 text-right" style={{ color: adv === 'our' ? '#2A7050' : '#5C4E38' }}>{stat.our_value || '—'}</span>
        <div className="flex-1 h-2.5 rounded-full overflow-hidden flex" style={{ backgroundColor: 'rgba(139,115,85,0.1)' }}>
          {hasPct ? (
            <>
              <div className="h-full rounded-r-full transition-all duration-500" style={{ width: `${ourWidth}%`, backgroundColor: '#2A7050' }} />
              <div className="h-full rounded-l-full transition-all duration-500" style={{ width: `${oppWidth}%`, backgroundColor: '#B94040' }} />
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-[10px]" style={{ color: '#B5A490' }}>ערכים מספריים לא זמינים בקובץ</span>
            </div>
          )}
        </div>
        <span className="text-xs font-bold w-10 text-left" style={{ color: adv === 'opponent' ? '#B94040' : '#5C4E38' }}>{stat.opponent_value || '—'}</span>
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px]" style={{ color: '#9A8672' }}>{ourLabel}</span>
        <span className="text-[10px]" style={{ color: '#9A8672' }}>{oppLabel}</span>
      </div>
    </div>
  );
}

// Memoized team picker — prevents input focus loss on parent re-renders
const TeamPicker = React.memo(function TeamPicker({ originalTeamNames, onContinue }) {
  // Dropdown: always the two file team names (for identification only)
  // When user selects our team → opponent auto-fills with the other file team
  const [ourTeam, setOurTeam] = useState('');
  const [opponent, setOpponent] = useState('');

  const handleTeamChange = (selected) => {
    setOurTeam(selected);
    // Auto-fill opponent with the OTHER file team (if opponent is empty or still matches a file team)
    const other = selected === originalTeamNames.team_a
      ? originalTeamNames.team_b
      : selected === originalTeamNames.team_b
        ? originalTeamNames.team_a
        : '';
    if (other && (opponent === '' || opponent === originalTeamNames.team_a || opponent === originalTeamNames.team_b)) {
      setOpponent(other);
    }
  };
  const handleContinue = () => onContinue(ourTeam, opponent);
  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader icon={Users} iconColor="#2A5FA8" title="זיהוי הקבוצות"
          subtitle="בחר מי מהשתיים בקובץ זו הקבוצה שלך. השם יוחלף אוטומטית לשם הרשום במערכת. הקלד את שם היריבה כרצונך." />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>הקבוצה שלי (לזיהוי)</label>
            <select value={ourTeam} onChange={(e) => handleTeamChange(e.target.value)}
              className="w-full p-3 rounded-xl text-sm"
              style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}>
              <option value="">בחר מתוך הקבוצות בקובץ...</option>
              {originalTeamNames.team_a && <option value={originalTeamNames.team_a}>{originalTeamNames.team_a}</option>}
              {originalTeamNames.team_b && <option value={originalTeamNames.team_b}>{originalTeamNames.team_b}</option>}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>הקבוצה היריבה</label>
            <input type="text" value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="שם הקבוצה היריבה בעברית"
              className="w-full p-3 rounded-xl text-sm"
              style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }} />
            <p className="text-[10px] mt-1 mr-1" style={{ color: '#B5A490' }}>מומלץ לכתוב את שם הקבוצה בעברית, כדי שהניתוח יוצג בצורה אחידה.</p>
          </div>
        </div>
      </Card>
      <button onClick={handleContinue}
        disabled={!ourTeam || !opponent}
        className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{
          backgroundColor: (!ourTeam || !opponent) ? 'rgba(139,115,85,0.15)' : '#2A7050',
          color: '#fff', opacity: (!ourTeam || !opponent) ? 0.5 : 1,
          cursor: (!ourTeam || !opponent) ? 'not-allowed' : 'pointer',
          boxShadow: (!ourTeam || !opponent) ? 'none' : '0 4px 14px rgba(42,112,80,0.25)'
        }}>
        <ArrowLeft className="w-5 h-5" /> המשך לניתוח
      </button>
    </div>
  );
});

// Memoized deep-dive — follow-up questions on the uploaded file
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
    } catch (e) {
      setAnswer({ no_data: true, title: 'שגיאה בפנייה לשרת', blocks: [] });
    } finally { setLoading(false); }
  };

  // Render the structured answer
  const renderAnswer = () => {
    if (!answer) return null;
    const { title, blocks = [], no_data } = answer;

    return (
      <div className="mt-5 space-y-3" style={{ borderTop: '1px solid rgba(139,115,85,0.12)', paddingTop: '1rem' }}>
        {/* Answer title */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#7A4FA018' }}>
            <Search className="w-3.5 h-3.5" style={{ color: '#7A4FA0' }} />
          </div>
          <h4 className="font-bold text-sm" style={{ color: '#2C2416' }}>{title}</h4>
          {no_data && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(185,64,64,0.08)', color: '#B94040' }}>
              אין מידע בקובץ
            </span>
          )}
        </div>

        {/* Blocks */}
        {blocks.map((block, i) => (
          <div key={i} className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(122,79,160,0.03)', border: '1px solid rgba(122,79,160,0.12)' }}>
            <h5 className="font-semibold text-sm mb-2" style={{ color: '#7A4FA0' }}>{block.subtitle}</h5>
            <p className="text-sm leading-relaxed mb-2.5" style={{ color: '#5C4E38' }}>{block.content}</p>
            {(block.highlights || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {block.highlights.map((h, j) => (
                  <span key={j} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{ backgroundColor: '#7A4FA010', border: '1px solid rgba(122,79,160,0.15)' }}>
                    <span style={{ color: '#9A8672' }}>{h.label}:</span>
                    <span className="font-bold" style={{ color: '#2C2416' }}>{h.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {blocks.length === 0 && !loading && (
          <p className="text-sm" style={{ color: '#9A8672' }}>אין מספיק מידע בקובץ כדי לענות על השאלה הזו.</p>
        )}
      </div>
    );
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
          rows={2}
          className="flex-1 p-3 rounded-xl text-sm resize-none"
          style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
          disabled={loading} />
        <button onClick={askQuestion} disabled={loading || !question.trim()}
          className="flex-shrink-0 px-4 rounded-xl flex items-center justify-center transition-all"
          style={{
            backgroundColor: (loading || !question.trim()) ? 'rgba(139,115,85,0.1)' : '#7A4FA0',
            color: (loading || !question.trim()) ? '#9A8672' : '#fff',
            cursor: (loading || !question.trim()) ? 'default' : 'pointer'
          }}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3" style={{ color: '#9A8672' }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs">מחפש תשובה בקובץ...</span>
        </div>
      )}

      {renderAnswer()}
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
  const fileInputRef = useRef();

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

  // Step 1 → 2: Quick scan for team names (no auto-matching yet)
  const startTeamScan = async () => {
    if (!file) return;
    setStep('scanning');
    setError(null);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const url = uploadResult.file_url || uploadResult?.data?.file_url;
      if (!url) throw new Error('העלאת הקובץ נכשלה');
      setFileUrl(url);
      const result = await base44.functions.invoke('analyzeMatchFile', { file_url: url, mode: 'identify_teams' });
      const teams = result.data || result;
      const teamA = teams?.team_a || '';
      const teamB = teams?.team_b || '';
      setOriginalTeamNames({ team_a: teamA, team_b: teamB });
      setStep('pick_teams');
    } catch (e) {
      console.error('Team scan error:', e);
      const msg = e?.response?.data?.error || e?.message || 'שגיאה לא ידועה';
      setError('שגיאה בזיהוי הקבוצות: ' + msg);
      setStep('upload');
    }
  };

  // Step 3 → 4: Full analysis — replaces file team name with active system team name
  const startFullAnalysis = async (ourTeamFilePick, opponentName) => {
    if (!ourTeamFilePick || !opponentName) {
      setError('יש להזין את שתי הקבוצות.');
      return;
    }
    setStep('analyzing');
    setError(null);
    try {
      // Get the user's currently active system team name
      let ourTeamDisplayName = ourTeamFilePick;
      if (selectedTeamId) {
        const userTeams = await base44.entities.Team.list();
        const activeTeam = userTeams.find(t => t.id === selectedTeamId);
        if (activeTeam?.name) {
          ourTeamDisplayName = activeTeam.name;
        }
      }
      // identifiedTeams stores display names only (system name + typed opponent)
      setIdentifiedTeams({ ourTeam: ourTeamDisplayName, opponent: opponentName });

      const result = await base44.functions.invoke('analyzeMatchFile', {
        file_url: fileUrl,
        our_team_name: ourTeamDisplayName,
        opponent_name: opponentName
      });
      const data = result.data || result;
      setAnalysis({ ...data, _ourTeamDisplayName: ourTeamDisplayName, _opponentName: opponentName });
      setStep('result');
      setExpandedSections({ possession: true, defense: true, duels: true });
    } catch (e) {
      console.error('Full analysis error:', e);
      const msg = e?.response?.data?.error || e?.message || 'שגיאה לא ידועה';
      setError('שגיאה בניתוח הקובץ: ' + msg);
      setStep('pick_teams');
    }
  };

  // Helper: parse a stat value string like "54%" or "320" into a number
  const parseStatNumber = (val) => {
    if (val == null) return 0;
    const cleaned = String(val).replace('%', '').trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  // Helper: map LLM stat arrays → MatchAnalysis stats object
  const mapStatsToMatchAnalysis = (allStats) => {
    const stats = { shots: 0, shots_on_target: 0, xg: 0, possession: 0, passes: 0, pass_accuracy: 0, tackles: 0, interceptions: 0, turnovers: 0, critical_errors: 0 };
    if (!allStats || !allStats.length) return stats;

    // Label → field mapping (Hebrew labels from LLM)
    const labelMap = {
      'החזקת כדור': 'possession',
      'מסירות': 'passes',
      'דיוק מסירות': 'pass_accuracy',
      'בעיטות': 'shots',
      'בעיטות למסגרת': 'shots_on_target',
      'שערים צפויים': 'xg',
      'תיקולים': 'tackles',
      'חסימות': 'interceptions',
      'איבודי כדור': 'turnovers',
      'טעויות קריטיות': 'critical_errors',
      'החלקות': 'tackles',
      'חיסולים': 'interceptions',
      'דו-קרבות קרקע': 'tackles',
      'דו-קרבות אוויר': 'interceptions',
      'xG': 'xg',
      'PPDA': 'interceptions',
      'מסירות מפתח': 'passes',
      'איבודים': 'turnovers',
    };

    for (const s of allStats) {
      // Skip stats where both value and pct are null/empty — data was not in the file
      if (!s.our_value && !s.opponent_value && s.our_pct == null && s.opponent_pct == null) continue;

      const label = s.label || '';
      let field = null;
      for (const [key, val] of Object.entries(labelMap)) {
        if (label.includes(key)) { field = val; break; }
      }
      if (!field) continue;

      // Use our_pct for percentage-based stats, our_value parsed for counts
      if (field === 'possession' || field === 'pass_accuracy') {
        stats[field] = s.our_pct != null ? s.our_pct : parseStatNumber(s.our_value);
      } else {
        // For count-based stats: if our_pct is null (no real data), skip this stat
        if (s.our_pct == null && !s.our_value) continue;
        stats[field] = parseStatNumber(s.our_value);
      }
    }
    return stats;
  };

  // Save to MatchAnalysis
  const handleSaveToAnalysis = async () => {
    if (!identifiedTeams.ourTeam || !identifiedTeams.opponent) return;
    setSaving(true); setError(null);
    try {
      const userTeams = await base44.entities.Team.list();
      const ourTeamDisplayName = analysis._ourTeamDisplayName || identifiedTeams.ourTeam;

      let teamId = null;
      for (const t of userTeams) {
        if (t.name.toLowerCase().includes(ourTeamDisplayName.toLowerCase()) ||
            ourTeamDisplayName.toLowerCase().includes(t.name.toLowerCase())) {
          teamId = t.id; break;
        }
      }
      if (!teamId) teamId = userTeams.length > 0 ? userTeams[0].id : identifiedTeams.ourTeam;

      const matchDate = analysis?.match_details?.date || new Date().toISOString().split('T')[0];
      const ourScore = analysis?.match_details?.our_score;
      const opponentScore = analysis?.match_details?.opponent_score;
      const summaryReport = analysis?.summary_report;
      const fullReport = analysis?.full_report;
      const isFull = analysis?.analysis_type === 'full';

      const game = await base44.entities.GameSchedule.create({
        team_id: teamId, opponent: identifiedTeams.opponent,
        game_date: matchDate + 'T00:00:00', context: 'ליגה',
        location: analysis?.match_details?.location === 'חוץ' ? 'חוץ' : 'בית',
        status: 'completed', notes: JSON.stringify({ source: 'file_analysis' })
      });

      let freeNotes = '';
      if (isFull) {
        freeNotes = [
          '## סקירה טקטית', fullReport?.tactical_overview || '', '',
          '## החזקת כדור ומסירות', fullReport?.possession_passing_summary || '', '',
          '## הגנה ולחץ', fullReport?.defense_pressure_summary || '', '',
          '## דו-קרבות ומעברים', fullReport?.duels_transitions_summary || '', '',
          '## סיכום', fullReport?.executive_summary || ''
        ].join('\n');
      } else {
        freeNotes = [
          '## מה היה במשחק', summaryReport?.what_happened || '', '',
          '## מה הלך טוב', ...(summaryReport?.what_went_well || []).map(s => '- ' + s), '',
          '## מה הלך פחות טוב', ...(summaryReport?.what_went_poorly || []).map(s => '- ' + s)
        ].join('\n');
      }

      const summary = await base44.entities.ProfessionalSummary.create({
        team_id: teamId, event_id: game.id, event_type: 'match', event_date: matchDate,
        event_label: `מול ${identifiedTeams.opponent}`,
        topic: isFull ? (fullReport?.tactical_overview?.substring(0, 80) || 'ניתוח מלא') : (summaryReport?.what_happened?.substring(0, 80) || 'סיכום משחק'),
        what_worked: isFull ? (fullReport?.possession_passing_summary || '') : (summaryReport?.what_went_well || []).join('\n'),
        issues_found: isFull
          ? ((fullReport?.key_issues || []).join('\n') || fullReport?.defense_pressure_summary || '')
          : (summaryReport?.what_went_poorly || []).join('\n'),
        tactical_insights: isFull ? (fullReport?.tactical_overview || '') : '',
        result_our: ourScore || null, result_opponent: opponentScore || null, satisfaction: 3
      });

      // Collect all stats from 3 categories
      const allFullStats = [
        ...(fullReport?.possession_passing_stats || []),
        ...(fullReport?.defense_pressure_stats || []),
        ...(fullReport?.duels_transitions_stats || []),
      ];
      const mappedStats = isFull ? mapStatsToMatchAnalysis(allFullStats) : null;

      const issues = isFull
        ? (fullReport?.key_issues || [])
        : (summaryReport?.what_went_poorly || []);

      const analysisPayload = {
        team_id: teamId, summary_id: summary.id, opponent: identifiedTeams.opponent, date: matchDate,
        result: { our_score: ourScore || 0, opponent_score: opponentScore || 0 },
        analysis_types: ['freeform'],
        free_notes: freeNotes,
        report: {
          summary: isFull ? (fullReport?.executive_summary || '') : (summaryReport?.what_happened || ''),
          positives: isFull ? [] : (summaryReport?.what_went_well || []),
          issues: issues,
          recommendations: isFull
            ? (fullReport?.training_topics || []).map(t => `${t.topic} (${t.urgency})`)
            : (summaryReport?.training_topics || [])
        },
        training_actions: isFull
          ? (fullReport?.training_topics || []).map(t => ({
              focus: t.topic,
              drill_suggestion: t.rationale,
              priority: t.urgency === 'דחוף' ? 'high' : 'medium',
              completed: false
            }))
          : (summaryReport?.training_topics || []).map(t => ({
              focus: t,
              drill_suggestion: '',
              priority: 'medium',
              completed: false
            }))
      };

      if (isFull && mappedStats) {
        analysisPayload.analysis_types.push('statistics');
        analysisPayload.stats = mappedStats;
      }
      await base44.entities.MatchAnalysis.create(analysisPayload);

      // Create KeyMatchSituation + TacticalGoal records for all issues
      for (const issue of issues) {
        try {
          await base44.entities.KeyMatchSituation.create({
            team_id: teamId,
            situation_name: issue.substring(0, 80),
            situation_category: 'ניהול משחק',
            description: issue,
            status: 'active',
            severity: 'medium',
            source_match_id: game.id,
            occurrence_count: 1
          });
          await base44.entities.TacticalGoal.create({
            team_id: teamId,
            title: issue.substring(0, 80),
            description: issue,
            priority: 'medium',
            status: 'active',
            source: 'match',
            source_match_id: game.id,
          });
        } catch {}
      }

      setSaveDone(true); setStep('saving');
    } catch (e) {
      setError('שגיאה בשמירה: ' + (e.message || ''));
    } finally { setSaving(false); }
  };

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // (Card, SectionHeader, ComparisonBar moved to module level above)

  // ── Stats section with comparison bars ──
  const StatsSection = ({ title, icon, iconColor, summary, stats, ourLabel, oppLabel, sectionKey }) => (
    <Card>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection(sectionKey)}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${iconColor}15` }}>
            {React.createElement(icon, { className: "w-4 h-4", style: { color: iconColor } })}
          </div>
          <h3 className="font-bold text-base" style={{ color: '#2C2416' }}>{title}</h3>
        </div>
        {expandedSections[sectionKey] ? <ChevronUp className="w-4 h-4" style={{ color: '#9A8672' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#9A8672' }} />}
      </div>
      {expandedSections[sectionKey] && (
        <div className="mt-4">
          {summary && (
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#5C4E38' }}>{summary}</p>
          )}
          {stats && stats.length > 0 && (
            <div>
              {stats.map((s, i) => (
                <ComparisonBar key={i} stat={s} ourLabel={ourLabel} oppLabel={oppLabel} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );

  // ── Step labels ──
  const stepLabels = { upload: 'העלאה', scanning: 'סריקה', pick_teams: 'זיהוי', analyzing: 'ניתוח', result: 'תוצאות', saving: 'שמירה' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EFE6' }} dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back + Stepper */}
        <div className="flex items-center justify-between mb-6">
          <a href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
            style={{ backgroundColor: 'rgba(139,115,85,0.06)', color: '#7A6B57', border: '1px solid rgba(139,115,85,0.15)' }}>
            <ArrowRight className="w-3.5 h-3.5" style={{ transform: 'rotate(180deg)' }} /> דף הבית
          </a>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: '#9A8672' }}>
            {['upload','pick_teams','analyzing','result'].map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span className="mx-0.5">›</span>}
                <span className={step === s ? 'font-bold' : ''} style={{ color: step === s ? '#2A7050' : '#9A8672' }}>
                  {stepLabels[s]}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 p-4 rounded-xl flex items-start gap-2"
            style={{ backgroundColor: 'rgba(185,64,64,0.07)', border: '1px solid rgba(185,64,64,0.18)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B94040' }} />
            <p className="text-sm flex-1" style={{ color: '#B94040' }}>{error}</p>
            <button onClick={() => setError(null)}><X className="w-4 h-4" style={{ color: '#B94040' }} /></button>
          </div>
        )}

        {/* ═══════════ STEP: UPLOAD ═══════════ */}
        {step === 'upload' && (
          <>
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl p-12 text-center cursor-pointer transition-all duration-200"
              style={{
                backgroundColor: dragOver ? 'rgba(42,112,80,0.06)' : '#FAF7F2',
                border: `2px dashed ${dragOver ? '#2A7050' : 'rgba(42,112,80,0.25)'}`,
              }}>
              <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: '#2A7050' }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: '#2C2416' }}>
                {file ? 'הקובץ מוכן לניתוח' : 'גרור קובץ לכאן או לחץ לבחירה'}
              </h2>
              <p className="text-sm mb-3" style={{ color: '#7A6B57' }}>
                {file ? file.name : 'PDF, CSV, Excel — דוח Wyscout‏, Instat, או סיכום ידני'}
              </p>
              <div className="flex justify-center gap-2">
                {SUPPORTED_LABELS.map(label => (
                  <span key={label} className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(42,112,80,0.08)', color: '#2A7050' }}>{label}</span>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept={SUPPORTED_TYPES} className="hidden"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleFile(e.target.files[0])} />
            </div>

            {file && (
              <div className="mt-14 text-center">
                <button onClick={startTeamScan}
                  className="px-8 py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 mx-auto transition-all hover:opacity-90"
                  style={{ backgroundColor: '#2A7050', color: '#fff', boxShadow: '0 4px 14px rgba(42,112,80,0.25)' }}>
                  <BarChart3 className="w-5 h-5" /> נתח את הקובץ
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══════════ STEP: SCANNING ═══════════ */}
        {step === 'scanning' && (
          <Card>
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: '#2A7050' }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: '#2C2416' }}>מזהה את הקבוצות בקובץ...</h3>
              <p className="text-sm" style={{ color: '#7A6B57' }}>סורק את הנתונים ומזהה את שמות הקבוצות</p>
            </div>
          </Card>
        )}

        {/* ═══════════ STEP: PICK TEAMS ═══════════ */}
        {step === 'pick_teams' && (
          <TeamPicker
            originalTeamNames={originalTeamNames}
            onContinue={startFullAnalysis}
          />
        )}

        {/* ═══════════ STEP: ANALYZING ═══════════ */}
        {step === 'analyzing' && (
          <Card>
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-5" style={{ color: '#2A7050' }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: '#2C2416' }}>מפיק ניתוח מלא...</h3>
              <p className="text-sm mb-1" style={{ color: '#7A6B57' }}>
                מנתח את "{identifiedTeams.ourTeam}" מול "{identifiedTeams.opponent}"
              </p>
              <p className="text-xs" style={{ color: '#9A8672' }}>קורא נתונים, מזהה דפוסים, מפיק תובנות טקטיות</p>
            </div>
          </Card>
        )}

        {/* ═══════════ STEP: RESULT ═══════════ */}
        {step === 'result' && analysis && (() => {
          const isFull = analysis.analysis_type === 'full';
          const fr = analysis.full_report;
          const sr = analysis.summary_report;
          const md = analysis.match_details;
          const ourLabel = analysis._ourTeamDisplayName || 'אנחנו';
          const oppLabel = analysis._opponentName || 'יריבה';

          return (
            <div className="space-y-5">
              {/* ── Match header ── */}
              <Card>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block"
                      style={{ backgroundColor: isFull ? 'rgba(122,79,160,0.1)' : 'rgba(42,95,168,0.1)',
                               color: isFull ? '#7A4FA0' : '#2A5FA8' }}>
                      {isFull ? '📊 ניתוח מלא' : '📋 סיכום משחק'}
                    </span>
                    <h2 className="text-2xl font-extrabold" style={{ color: '#2C2416' }}>
                      {ourLabel} מול {oppLabel}
                    </h2>
                    {(md?.date || md?.our_score !== undefined) && (
                      <div className="flex items-center gap-3 mt-1.5">
                        {md?.date && <span className="text-sm" style={{ color: '#7A6B57' }}>{md.date}</span>}
                        {md?.our_score != null && (
                          <span className="text-lg font-bold" style={{ color: '#2C2416' }}>
                            {md.our_score} – {md.opponent_score}
                          </span>
                        )}
                        {md?.location && <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(139,115,85,0.08)', color: '#7A6B57' }}>{md.location}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* ── SUMMARY MODE ── */}
              {!isFull && sr && (
                <>
                  <Card>
                    <SectionHeader icon={Target} iconColor="#2A7050" title="מה היה במשחק" />
                    <p className="text-sm leading-relaxed" style={{ color: '#5C4E38' }}>
                      {sr.what_happened || 'אין מידע בקובץ.'}
                    </p>
                  </Card>
                  {(sr.what_went_well || []).length > 0 && (
                    <Card>
                      <SectionHeader icon={CheckCircle2} iconColor="#2A7050" title="מה הלך טוב" />
                      <div className="space-y-2">
                        {sr.what_went_well.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(42,112,80,0.06)', border: '1px solid rgba(42,112,80,0.12)' }}>
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2A7050' }} />
                            <p className="text-sm" style={{ color: '#2C2416' }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {(sr.what_went_poorly || []).length > 0 && (
                    <Card>
                      <SectionHeader icon={AlertCircle} iconColor="#B94040" title="מה הלך פחות טוב" />
                      <div className="space-y-2">
                        {sr.what_went_poorly.map((item, i) => {
                          const isAdded = addedIssues.has(i);
                          return (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl"
                              style={{
                                backgroundColor: isAdded ? 'rgba(42,112,80,0.05)' : 'rgba(185,64,64,0.05)',
                                border: `1px solid ${isAdded ? 'rgba(42,112,80,0.14)' : 'rgba(185,64,64,0.12)'}`
                              }}>
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"
                                style={{ color: isAdded ? '#2A7050' : '#B94040' }} />
                              <p className="text-sm flex-1" style={{ color: '#2C2416' }}>{item}</p>
                              <button onClick={() => setAddedIssues(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                                className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isAdded ? 'rotate-45' : ''}`}
                                style={{ backgroundColor: isAdded ? 'rgba(42,112,80,0.12)' : 'rgba(185,64,64,0.1)', color: isAdded ? '#2A7050' : '#B94040' }}>
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
                      <SectionHeader icon={Lightbulb} iconColor="#D97706" title="נושאים לעבודה באימון הבא" />
                      <div className="space-y-2">
                        {sr.training_topics.map((item, i) => (
                          <div key={i} className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(217,119,6,0.05)', border: '1px solid rgba(217,119,6,0.12)' }}>
                            <p className="text-sm font-medium" style={{ color: '#2C2416' }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* ── FULL MODE ── */}
              {isFull && fr && (
                <>
                  {/* Tactical Overview */}
                  <Card>
                    <SectionHeader icon={Target} iconColor="#2A7050" title="סקירה טקטית" />
                    <p className="text-sm leading-relaxed" style={{ color: '#5C4E38' }}>
                      {fr.tactical_overview || 'אין מידע מספק בקובץ.'}
                    </p>
                  </Card>

                  {/* Possession */}
                  <StatsSection title="החזקת כדור ומסירות" icon={BarChart3} iconColor="#2A5FA8"
                    summary={fr.possession_passing_summary} stats={fr.possession_passing_stats}
                    ourLabel={ourLabel} oppLabel={oppLabel} sectionKey="possession" />

                  {/* Defense */}
                  <StatsSection title="הגנה ולחץ" icon={ShieldCheck} iconColor="#B94040"
                    summary={fr.defense_pressure_summary} stats={fr.defense_pressure_stats}
                    ourLabel={ourLabel} oppLabel={oppLabel} sectionKey="defense" />

                  {/* Duels */}
                  <StatsSection title="דו-קרבות ומעברים" icon={Swords} iconColor="#9A6A10"
                    summary={fr.duels_transitions_summary} stats={fr.duels_transitions_stats}
                    ourLabel={ourLabel} oppLabel={oppLabel} sectionKey="duels" />

                  {/* Standout Players — shown only on screen, NOT saved */}
                  {(fr.standout_players || []).length > 0 && (
                    <Card>
                      <SectionHeader icon={Users} iconColor="#7A4FA0" title="שחקנים בולטים"
                        subtitle="מוצג בדוח הזה בלבד — לא נשמר בניתוח המשחקים" />
                      <div className="grid md:grid-cols-2 gap-3">
                        {fr.standout_players.map((p, i) => (
                          <div key={i} className="p-4 rounded-xl"
                            style={{ backgroundColor: 'rgba(122,79,160,0.04)', border: '1px solid rgba(122,79,160,0.12)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-sm" style={{ color: '#2C2416' }}>{p.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(122,79,160,0.1)', color: '#7A4FA0' }}>{p.position}</span>
                            </div>
                            <p className="text-xs mb-2.5" style={{ color: '#5C4E38' }}>{p.summary}</p>
                            {(p.stats || []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {p.stats.map((s, j) => (
                                  <span key={j} className="text-[10px] px-2 py-1 rounded-full"
                                    style={{ backgroundColor: 'rgba(139,115,85,0.06)', color: '#7A6B57' }}>
                                    {s.label}: {s.value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Training Topics */}
                  {(fr.training_topics || []).length > 0 && (
                    <Card>
                      <SectionHeader icon={Lightbulb} iconColor="#D97706" title="נושאי עבודה לאימון הבא" />
                      <div className="space-y-2.5">
                        {fr.training_topics.map((t, i) => (
                          <div key={i} className="p-4 rounded-xl flex items-start gap-3"
                            style={{
                              backgroundColor: t.urgency === 'דחוף' ? 'rgba(185,64,64,0.05)' : 'rgba(217,119,6,0.04)',
                              border: `1px solid ${t.urgency === 'דחוף' ? 'rgba(185,64,64,0.16)' : 'rgba(217,119,6,0.14)'}`
                            }}>
                            <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold"
                              style={{ backgroundColor: t.urgency === 'דחוף' ? '#B94040' : '#D97706', color: '#fff' }}>
                              {t.urgency}
                            </span>
                            <div>
                              <p className="font-semibold text-sm" style={{ color: '#2C2416' }}>{t.topic}</p>
                              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#7A6B57' }}>{t.rationale}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Executive Summary */}
                  {fr.executive_summary && (
                    <Card>
                      <SectionHeader icon={Zap} iconColor="#9A6A10" title="סיכום מנהלים" />
                      <p className="text-sm leading-relaxed" style={{ color: '#5C4E38' }}>
                        {fr.executive_summary}
                      </p>
                    </Card>
                  )}
                </>
              )}

              {/* ── Deep Dive ── */}
              <DeepDive fileUrl={fileUrl} ourTeam={analysis._ourTeamDisplayName || identifiedTeams.ourTeam} opponent={identifiedTeams.opponent} />

              {/* ── Save button ── */}
              <button onClick={handleSaveToAnalysis} disabled={saving}
                className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ backgroundColor: '#2A7050', color: '#fff', boxShadow: '0 4px 14px rgba(42,112,80,0.25)', opacity: saving ? 0.7 : 1 }}>
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> שומר...</> : <><ArrowLeft className="w-5 h-5" /> שמירה לניתוח משחקים</>}
              </button>
            </div>
          );
        })()}

        {/* ═══════════ STEP: SAVE DONE ═══════════ */}
        {step === 'saving' && saveDone && (
          <div className="space-y-5">
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: 'rgba(42,112,80,0.1)' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#2A7050' }} />
                </div>
                <h3 className="font-bold text-xl mb-2" style={{ color: '#2C2416' }}>הניתוח נשמר בהצלחה</h3>
                <p className="text-sm mb-6" style={{ color: '#7A6B57' }}>
                  "{analysis._ourTeamDisplayName || identifiedTeams.ourTeam}" מול "{identifiedTeams.opponent}" — נוסף לתיק המשחק
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => {
                    setStep('upload'); setFile(null); setFileUrl(null); setAnalysis(null);
                    setIdentifiedTeams({ ourTeam: '', opponent: '' });
                    setOriginalTeamNames({ team_a: '', team_b: '' });
                    setAddedIssues(new Set()); setSaveDone(false);
                  }}
                    className="px-6 py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: '#2A7050', color: '#fff' }}>
                    ניתוח קובץ נוסף
                  </button>
                  <a href="/?view=match" className="px-6 py-3 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: 'rgba(42,95,168,0.08)', color: '#2A5FA8', border: '1px solid rgba(42,95,168,0.2)' }}>
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