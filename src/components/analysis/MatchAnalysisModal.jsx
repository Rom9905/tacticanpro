import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import EditPlayerRatingsModal from './EditPlayerRatingsModal';
import DeepAnalysisSection from './DeepAnalysisSection';
import BottomLine from '@/components/ui/BottomLine';
import { buildGameStyleContext } from '@/hooks/useGameStyle';
import { generateTacticalProblems } from '@/lib/tacticalProblemsEngine';
import {
  Loader2, BarChart3, Video, FileText, Clock, Target,
  TrendingUp, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Edit2, X, Trash2
} from 'lucide-react';

function getColorByRating(rating) {
  if (rating >= 8) return { bg: 'var(--success-bg)', text: 'var(--brand-green-dark)', label: 'מצוין' };
  if (rating >= 6) return { bg: 'var(--warning-bg)', text: 'var(--warning)', label: 'סביר' };
  return { bg: 'var(--danger-bg)', text: 'var(--danger)', label: 'חלש' };
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-card-soft)', border: '1px solid rgba(13,26,18,0.08)' }}>
      {Icon && <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />}
      <div className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Heebo, sans-serif', fontWeight: 800 }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}

function InsightCard({ title, content, icon, color, bgColor }) {
  const Icon = icon;
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: bgColor, border: `1px solid ${color}30`, borderRight: `3px solid ${color}` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <h4 className="font-semibold text-sm" style={{ color }}>{title}</h4>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{content}</p>
    </div>
  );
}

function SectionHeader({ icon, children }) {
  const Icon = icon;
  return (
    <div className="mb-3">
      <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Heebo, sans-serif', fontWeight: 700, letterSpacing: '0.4px' }}>
        {Icon && <Icon className="w-4 h-4" />}
        {children}
      </h3>
      <div className="mt-1.5" style={{ width: '24px', height: '2px', backgroundColor: 'var(--brand-green)', borderRadius: '2px' }} />
    </div>
  );
}

export default function MatchAnalysisModal({ open, onClose, analysis, teamName, onRefresh, onDeleteAnalysisType }) {
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [editingRatings, setEditingRatings] = useState(false);
  const [playerNameMap, setPlayerNameMap] = useState({});
  const [localRatings, setLocalRatings] = useState(null);
  const [teamGameStyle, setTeamGameStyle] = useState(null);
  const [teamGameStyleNotes, setTeamGameStyleNotes] = useState('');
  const [deletingType, setDeletingType] = useState(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

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
    if (!forceRegenerate && analysis.ai_summary) {
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

צור תמונה מקצועית של המשחק ב-3-5 שורות בלבד. אל תכתוב "תמונת המשחק" או כותרות - רק טקסט רצוף על הביצועים הכדורגליים.${gameStyleCtx ? '\nאם זיהית פערים בין השיטה שהוגדרה לביצוע — ציין אותם.' : ''}`;

      const summary = await base44.integrations.Core.InvokeLLM({ prompt });

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
    }
    prevOpenRef.current = open;
  }, [open]);

  const tacticalProblems = React.useMemo(() => {
    if (!analysis) return [];
    if (analysis.tactical_problems?.length > 0) return analysis.tactical_problems;
    const generated = generateTacticalProblems(analysis);
    if (generated.length > 0 && analysis.id) {
      base44.entities.MatchAnalysis.update(analysis.id, { tactical_problems: generated }).catch(() => {});
    }
    return generated;
  }, [analysis?.id, analysis?.tactical_problems]);

  if (!analysis) return null;

  const rawRatings = localRatings ?? analysis.player_ratings ?? [];
  const displayRatings = rawRatings.map(r => ({
    ...r,
    did_not_play: !!r.did_not_play || (r.rating == null && r.did_not_play !== false),
  }));

  const ourScore = analysis._summary?.result_our ?? analysis.result?.our_score ?? '?';
  const oppScore = analysis._summary?.result_opponent ?? analysis.result?.opponent_score ?? '?';

  const analysisTypes = analysis.analysis_types || [analysis.analysis_mode].filter(Boolean) || [];
  const hasSummary = analysis._summary;
  const hasStats = analysis.stats && Object.keys(analysis.stats).length > 0;
  const hasVideoMoments = analysis.video_moments?.length > 0;
  const hasPlayerRatings = displayRatings.length > 0;
  const hasTrainingActions = analysis.training_actions?.length > 0;

  const hasTacticalIssues = tacticalProblems.length > 0;
  const tacticalIssues = tacticalProblems.map(p => p.text);

  const trainingTopics = hasTrainingActions 
    ? analysis.training_actions.map(a => a.focus)
    : tacticalIssues.slice(0, 4);

  const urgentTopics = trainingTopics.slice(0, 3);
  const remainingTopics = trainingTopics.slice(3);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        dir="rtl" 
        className="max-w-4xl max-h-[90vh] overflow-hidden p-0"
        style={{ backgroundColor: 'var(--bg-app)', borderColor: 'rgba(13,26,18,0.10)' }}
      >
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Header — dark bar */}
          <div className="sticky top-0 z-10 p-6 pb-4" style={{ background: 'linear-gradient(135deg, var(--brand-dark), var(--brand-dark-2))', borderBottom: '1px solid rgba(74,222,128,0.15)' }}>
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-2xl font-bold" style={{ color: 'var(--bg-card)', fontFamily: 'Heebo, sans-serif', fontWeight: 800 }}>
                {teamName || 'הקבוצה'} – {analysis.opponent}
              </DialogTitle>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.10)', color: 'var(--bg-card)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold" style={{ color: 'var(--brand-green)', fontFamily: 'Heebo, sans-serif', fontWeight: 800 }}>
                {ourScore} – {oppScore}
              </div>
              <div className="flex gap-2">
                {analysisTypes.map((type, i) => {
                  const typeLabel = type === 'statistics' || type === 'stats' ? 'סטטיסטיקה' : type === 'video' ? 'וידאו' : 'חופשי';
                  const typeStyle = type === 'statistics' || type === 'stats'
                    ? { bg: 'rgba(74,222,128,0.12)', text: 'var(--brand-green)', border: 'rgba(74,222,128,0.25)' }
                    : type === 'video'
                    ? { bg: 'rgba(37,99,235,0.12)', text: 'var(--info)', border: 'rgba(37,99,235,0.25)' }
                    : { bg: 'rgba(255,255,255,0.08)', text: 'var(--bg-card)', border: 'rgba(255,255,255,0.15)' };
                  const Icon = type === 'statistics' || type === 'stats' ? BarChart3 : type === 'video' ? Video : FileText;
                  return (
                    <div key={i} className="flex items-center gap-0.5">
                      <Badge style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}>
                        <Icon className="w-3 h-3 ml-1" /> {typeLabel}
                      </Badge>
                      {onDeleteAnalysisType && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingType(type); }}
                          className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--bg-card)' }}
                          title={`מחק ${typeLabel}`}
                        >
                          {deletingType === type ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <X className="w-2.5 h-2.5" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Delete analysis type confirmation */}
          {deletingType && (
            <div className="px-6 py-3 flex items-center justify-between"
              style={{ backgroundColor: 'var(--danger-bg)', borderBottom: '1px solid rgba(220,38,38,0.15)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
                למחוק את הניתוח {deletingType === 'statistics' || deletingType === 'stats' ? 'סטטיסטיקה' : deletingType === 'video' ? 'וידאו' : 'חופשי'}? כל הנתונים יאבדו.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDeletingType(null)}
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: 'rgba(13,26,18,0.06)', color: 'var(--text-secondary)' }}
                >
                  ביטול
                </button>
                <button
                  onClick={async () => {
                    const typeToRemove = deletingType;
                    setDeletingType(null);
                    if (onDeleteAnalysisType) await onDeleteAnalysisType(analysis, typeToRemove);
                  }}
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
                >
                  מחק
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Bottom Line — AI Insight */}
            <BottomLine
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
              color="var(--brand-green-dark)"
            />

            {/* Quick Stats */}
            {hasStats && (
              <div>
                <SectionHeader icon={BarChart3}>תקציר סטטיסטי מהיר</SectionHeader>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {analysis.stats.passes != null && (
                    <StatCard label="מסירות" value={analysis.stats.passes} />
                  )}
                  {analysis.stats.pass_accuracy != null && (
                    <StatCard label="דיוק מסירות" value={`${analysis.stats.pass_accuracy}%`} />
                  )}
                  {analysis.stats.shots != null && (
                    <StatCard label="בעיטות" value={analysis.stats.shots} />
                  )}
                  {analysis.stats.shots_on_target != null && (
                    <StatCard label="איומים" value={analysis.stats.shots_on_target} />
                  )}
                  {analysis.stats.turnovers != null && (
                    <StatCard label="איבודים" value={analysis.stats.turnovers} />
                  )}
                  {analysis.stats.xg != null && (
                    <StatCard label="xG" value={analysis.stats.xg} />
                  )}
                </div>
              </div>
            )}

            {/* AI Match Summary */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: 'var(--brand-green-dark)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>מכין תמונת משחק...</p>
              </div>
            ) : aiSummary?.error ? (
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid rgba(217,119,6,0.25)' }}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>ניתוח ה-AI אינו זמין</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{aiSummary.error}</p>
                </div>
              </div>
            ) : aiSummary ? (
              <>
                {aiSummary.summary && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--success-bg)', border: '1px solid rgba(22,163,74,0.18)' }}>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--brand-green-dark)' }}>
                    <Lightbulb className="w-4 h-4" /> תמונת המשחק
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {aiSummary.summary}
                  </p>
                </div>
                )}

                {/* Three Key Insights */}
                {(aiSummary.insights?.critical_issue || aiSummary.insights?.improvement_area || aiSummary.insights?.positive_point) && (
                <div>
                  <SectionHeader icon={TrendingUp}>שלוש תובנות מרכזיות</SectionHeader>
                  <div className="grid md:grid-cols-3 gap-3">
                    <InsightCard
                      title="בעיה מרכזית"
                      content={aiSummary.insights.critical_issue}
                      icon={AlertTriangle}
                      color="var(--danger)"
                      bgColor="var(--danger-bg)"
                    />
                    <InsightCard
                      title="נקודת שיפור"
                      content={aiSummary.insights.improvement_area}
                      icon={TrendingUp}
                      color="var(--warning)"
                      bgColor="var(--warning-bg)"
                    />
                    <InsightCard
                      title="נקודה חיובית"
                      content={aiSummary.insights.positive_point}
                      icon={Lightbulb}
                      color="var(--brand-green-dark)"
                      bgColor="var(--success-bg)"
                    />
                  </div>
                </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => loadOrGenerateAISummary(true)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
                  >
                    {loading ? 'מייצר...' : 'ייצר מחדש'}
                  </button>
                </div>
              </>
            ) : null}

            {/* Deep Analysis */}
            <DeepAnalysisSection analysis={analysis} onRefresh={onRefresh} />

            {/* Key Moments */}
            {hasVideoMoments && (
              <div>
                <SectionHeader icon={Clock}>רגעי מפתח במשחק</SectionHeader>
                <div className="space-y-2">
                  {analysis.video_moments.slice(0, 5).map((moment, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-soft)', border: '1px solid rgba(13,26,18,0.08)' }}>
                      <div className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-secondary)', minWidth: '50px' }}>{moment.timestamp}</div>
                      <div className="flex-1">
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{moment.note}</p>
                        {moment.situation_tag && (
                          <span className="text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(13,26,18,0.06)', color: 'var(--text-secondary)' }}>
                            {moment.situation_tag}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player Ratings */}
            {hasPlayerRatings && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <SectionHeader icon={Target}>ציוני שחקנים והערות מאמן</SectionHeader>
                  <Button
                    size="sm"
                    onClick={() => setEditingRatings(true)}
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    style={{ borderColor: 'rgba(22,163,74,0.30)', color: 'var(--brand-green-dark)' }}
                  >
                    <Edit2 className="w-3 h-3" />
                    ערוך ציונים
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {/* Players who played — circle rating */}
                  {displayRatings.filter(r => !r.did_not_play).map((rating, i) => {
                    const colorData = getColorByRating(rating.rating);
                    const resolvedName = rating.player_name || playerNameMap[rating.player_id] || '—';
                    const noteToShow = rating.note && rating.note !== resolvedName ? rating.note : null;
                    return (
                      <div key={i} className="p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: colorData.bg, border: `1px solid ${colorData.text}30` }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: colorData.text }}>
                          <span className="text-sm font-bold" style={{ color: '#fff', fontFamily: 'Heebo, sans-serif', fontWeight: 800 }}>
                            {rating.rating}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{resolvedName}</span>
                          {noteToShow && (
                            <p className="text-xs italic truncate" style={{ color: 'var(--text-secondary)' }}>
                              "{noteToShow}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DNP players — compact text */}
                {displayRatings.some(r => r.did_not_play) && (
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-soft)', border: '1px solid rgba(13,26,18,0.06)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="font-semibold">לא שותפו: </span>
                      {displayRatings.filter(r => r.did_not_play).map(r => r.player_name || playerNameMap[r.player_id] || '—').join(', ')}
                    </span>
                  </div>
                )}
              </div>
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

            {/* Tactical Issues */}
            {hasTacticalIssues && tacticalProblems.length > 0 && (
              <div>
                <SectionHeader icon={AlertTriangle}>בעיות טקטיות שזוהו במשחק</SectionHeader>
                <div className="space-y-2">
                  {tacticalProblems.map((problem, i) => {
                    const severityColors = {
                      high: { bg: 'var(--danger-bg)', border: 'rgba(220,38,38,0.18)', badge: 'var(--danger)', label: 'חמור' },
                      medium: { bg: 'var(--warning-bg)', border: 'rgba(217,119,6,0.18)', badge: 'var(--warning)', label: 'בינוני' },
                      low: { bg: 'var(--bg-card-soft)', border: 'rgba(13,26,18,0.08)', badge: 'var(--text-muted)', label: 'קל' },
                    };
                    const colors = severityColors[problem.severity] || severityColors.medium;
                    return (
                      <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: colors.badge, color: '#fff' }}>
                            {colors.label}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                          {problem.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Training Topics — split urgent / important */}
            {trainingTopics.length > 0 && (
              <div>
                <SectionHeader icon={Target}>נושאי עבודה לאימון</SectionHeader>
                <div className="space-y-4">
                  {/* Urgent */}
                  {urgentTopics.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--danger)' }} />
                        דחוף
                      </p>
                      <div className="space-y-2">
                        {urgentTopics.map((topic, i) => (
                          <div key={i} className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-soft)', border: '1px solid rgba(13,26,18,0.08)' }}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--brand-green-dark)', fontSize: '12px', fontWeight: 'bold' }}>
                              {i + 1}
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Important — collapsible */}
                  {remainingTopics.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--text-muted)' }} />
                        חשוב
                      </p>
                      <div className="space-y-2">
                        {(showAllTopics ? remainingTopics : remainingTopics.slice(0, 3)).map((topic, i) => (
                          <div key={i} className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-soft)', border: '1px solid rgba(13,26,18,0.08)' }}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--brand-green-dark)', fontSize: '12px', fontWeight: 'bold' }}>
                              {urgentTopics.length + i + 1}
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{topic}</span>
                          </div>
                        ))}
                        {!showAllTopics && remainingTopics.length > 3 && (
                          <button onClick={() => setShowAllTopics(true)}
                            className="text-xs font-semibold flex items-center gap-1 mt-1"
                            style={{ color: 'var(--brand-green-dark)' }}>
                            <ChevronDown className="w-3.5 h-3.5" /> הצג עוד ({remainingTopics.length - 3})
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Professional Summary — quote block */}
            {hasSummary && analysis._summary.tactical_insights && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card-soft)', borderRight: '4px solid var(--brand-green)', border: '1px solid rgba(13,26,18,0.08)' }}>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--brand-green-dark)' }}>
                  <FileText className="w-4 h-4" /> סיכום מקצועי
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'Assistant, sans-serif' }}>
                  {analysis._summary.tactical_insights}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 p-4 flex justify-end gap-2" style={{ backgroundColor: 'var(--bg-app)', borderTop: '1px solid rgba(13,26,18,0.10)' }}>
            <Button onClick={onClose} style={{ backgroundColor: 'var(--brand-green)', color: 'var(--brand-dark)' }}>
              סגור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}