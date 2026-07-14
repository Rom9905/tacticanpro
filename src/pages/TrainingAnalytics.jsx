import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTeam } from '@/components/TeamContext';
import { useLang } from '@/lib/LanguageContext';
import BottomLine from '@/components/ui/BottomLine';
import PageHero from '@/components/ui/PageHero';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardTopBar from '../components/dashboard/DashboardTopBar';
import {
  Users, User, Loader2, TrendingUp, TrendingDown, Minus, 
  CheckCircle2, AlertTriangle, Target, Lightbulb, Calendar, Sparkles
} from 'lucide-react';

export default function TrainingAnalytics() {
  const { selectedTeamId, selectTeam } = useTeam();
  const { t, dir } = useLang();
  const isHe = t.lang === 'he';
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('team');
  
  // Team analysis states
  const [timeRange, setTimeRange] = useState('7');
  const [summaries, setSummaries] = useState([]);
  const [teamAnalysis, setTeamAnalysis] = useState(null);
  const [analyzingTeam, setAnalyzingTeam] = useState(false);
  
  // Personal analysis states
  const [players, setPlayers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [trainingEvaluations, setTrainingEvaluations] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    (async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const teamsData = await base44.entities.Team.list();
      setTeams(teamsData);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedTeamId) loadData();
  }, [selectedTeamId, timeRange]);

  const loadData = async () => {
    const [summariesData, playersData, programsData, evalsData] = await Promise.all([
      base44.entities.ProfessionalSummary.filter({ 
        team_id: selectedTeamId, 
        event_type: 'training' 
      }, '-event_date', 200),
      base44.entities.Player.filter({ team_id: selectedTeamId }),
      base44.entities.TrainingProgram.filter({ team_id: selectedTeamId }),
      base44.entities.TrainingSessionEvaluation.filter({ team_id: selectedTeamId }, '-training_date', 200),
    ]);
    setSummaries(summariesData);
    setPlayers(playersData);
    setPrograms(programsData);
    setTrainingEvaluations(evalsData);

    // Load cached training analysis if data hasn't changed
    try {
      const teams = await base44.entities.Team.filter({ id: selectedTeamId });
      const team = teams[0];
      const cache = team?.training_analysis_cache;
      if (cache?.data && cache.timeRange === timeRange && cache.training_count === summariesData.length) {
        setTeamAnalysis(cache.data);
      }
    } catch {}
  };

  const analyzeTeamTrainings = async () => {
    setAnalyzingTeam(true);
    try {
      const days = parseInt(timeRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      
      const filtered = summaries.filter(s => new Date(s.event_date) >= cutoff);
      
      // Previous period for comparison
      const prevCutoff = new Date(cutoff);
      prevCutoff.setDate(prevCutoff.getDate() - days);
      const prevFiltered = summaries.filter(s => {
        const d = new Date(s.event_date);
        return d >= prevCutoff && d < cutoff;
      });

      const replyLang = isHe ? 'Hebrew' : 'English';
      const prompt = `You are a professional football training analyst. Analyze the team's training sessions for the recent period. Reply in ${replyLang}.

### Current Period Trainings (last ${days} days):
${JSON.stringify(filtered.map(s => ({
  date: s.event_date,
  topics: s.tactical_topics,
  what_worked: s.what_worked,
  issues: s.issues_found,
  insights: s.tactical_insights,
  satisfaction: s.satisfaction
})), null, 2)}

### Previous Period Trainings (${days} days before that):
${JSON.stringify(prevFiltered.map(s => ({
  date: s.event_date,
  topics: s.tactical_topics,
  what_worked: s.what_worked,
  issues: s.issues_found
})), null, 2)}

Create a professional analysis including:
1. Period summary - number of trainings, main topics, goals
2. Positive points - what worked well in training
3. Improvement points - recurring issues or topics that didn't improve
4. Topics for next trainings - work topics only, no specific drills
5. Comparison to previous period - for each tactical topic, identify: improvement/maintained/declining + explanation why

The "status" field in period_comparison must be one of: "שיפור", "שימור", "דעיכה" (these are internal enum values, keep them in Hebrew regardless of reply language).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            period_summary: {
              type: 'object',
              properties: {
                total_trainings: { type: 'number' },
                main_topics: { type: 'array', items: { type: 'string' } },
                training_goals: { type: 'string' },
                general_trends: { type: 'string' }
              }
            },
            positive_points: { type: 'array', items: { type: 'string' } },
            improvement_points: { type: 'array', items: { type: 'string' } },
            next_training_topics: { type: 'array', items: { type: 'string' } },
            period_comparison: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string' },
                  status: { type: 'string', enum: ['שיפור', 'שימור', 'דעיכה'] },
                  explanation: { type: 'string' }
                }
              }
            },
            professional_summary: { type: 'string' }
          }
        }
      });

      if (result?.__ai_error) {
        alert(result.__ai_error);
      } else {
        setTeamAnalysis(result);
        try {
          await base44.entities.Team.update(selectedTeamId, {
            training_analysis_cache: { data: result, timeRange, updated_at: new Date().toISOString(), training_count: summaries.length }
          });
        } catch (e) { console.warn('Failed to cache training analysis:', e); }
      }
    } catch (error) {
      console.error('Error analyzing team trainings:', error);
      alert('שגיאה בניתוח האימונים. נסה שוב מאוחר יותר.');
    }
    setAnalyzingTeam(false);
  };

  // Dev trend from evaluations
  const calcDevTrend = (evals) => {
    if (!evals || evals.length === 0) return { label: 'לא נבדק עדיין', icon: AlertTriangle, color: '#9A8672', bg: 'rgba(139,115,85,0.08)' };
    if (evals.length < 2) return { label: 'מעט נתונים', icon: Minus, color: '#9A8672', bg: 'rgba(139,115,85,0.08)' };
    const recent = evals.slice(0, 2).map(e => e.rating);
    const older = evals.slice(2, 4).map(e => e.rating);
    const avgR = recent.reduce((s, v) => s + v, 0) / recent.length;
    const avgO = older.length ? older.reduce((s, v) => s + v, 0) / older.length : avgR;
    if (avgR > avgO + 0.5) return { label: '↑ שיפור יציב', icon: TrendingUp, color: '#2A7050', bg: 'rgba(42,112,80,0.08)' };
    if (avgR < avgO - 0.5) return { label: '⚠ דורש עבודה', icon: TrendingDown, color: '#B94040', bg: 'rgba(185,64,64,0.08)' };
    return { label: '→ עדיין לא עקבי', icon: Minus, color: '#D97706', bg: 'rgba(217,119,6,0.08)' };
  };

  const topicStatus = (topic, playerEvals) => {
    const relevant = playerEvals.filter(e => e.topic_scores?.[topic] != null);
    if (relevant.length === 0) return { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#9A8672' };
    const scores = relevant.slice(0, 3).map(e => e.topic_scores[topic]);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const isRecent = (Date.now() - new Date(relevant[0].training_date).getTime()) < 21 * 86400000;
    if (!isRecent) return { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#9A8672' };
    if (scores.length >= 2 && scores[0] > scores[scores.length - 1] + 0.5) return { label: 'שיפור עקבי', icon: TrendingUp, color: '#2A7050' };
    if (avg < 5) return { label: 'דורש עבודה', icon: TrendingDown, color: '#B94040' };
    if (avg >= 7) return { label: 'שיפור באימונים', icon: TrendingUp, color: '#2A7050' };
    return { label: 'בעבודה', icon: Minus, color: '#D97706' };
  };

  const playersWithPrograms = players
    .map(p => ({ ...p, activePrograms: programs.filter(pr => pr.player_id === p.id && pr.status === 'active') }))
    .filter(p => p.activePrograms.length > 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EFE6' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2A7050' }} />
    </div>
  );

  const _selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EFE6' }} dir={dir}>
      <DashboardTopBar
        user={user}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={selectTeam}
        teamId={selectedTeamId}
      />

      <div className="pt-14 pb-10 max-w-6xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="pt-5 pb-6">
          <PageHero
            icon={TrendingUp}
            title={isHe ? 'ניתוח אימונים' : 'Training Analytics'}
            subtitle={isHe ? 'ניתוח התקדמות קבוצתי ואישי' : 'Team & personal progress analysis'}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir={dir}>
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              {isHe ? 'ניתוח קבוצתי' : 'Team Analysis'}
            </TabsTrigger>
            <TabsTrigger value="personal" className="gap-2">
              <User className="w-4 h-4" />
              {isHe ? 'ניתוח אישי' : 'Personal Analysis'}
            </TabsTrigger>
          </TabsList>

          {/* Team Analysis Tab */}
          <TabsContent value="team" className="space-y-4">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4" style={{ color: '#9A8672' }} />
                <span className="text-sm font-semibold" style={{ color: '#5C4E38' }}>{isHe ? 'טווח זמן:' : 'Time Range:'}</span>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-48" style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.22)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{isHe ? '7 ימים אחרונים' : 'Last 7 days'}</SelectItem>
                    <SelectItem value="30">{isHe ? '30 ימים אחרונים' : 'Last 30 days'}</SelectItem>
                    <SelectItem value="90">{isHe ? '3 חודשים אחרונים' : 'Last 3 months'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={analyzeTeamTrainings}
                disabled={analyzingTeam}
                style={{ backgroundColor: '#2A7050', color: '#fff' }}
                className="gap-2"
              >
                {analyzingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {analyzingTeam ? (isHe ? 'מנתח...' : 'Analyzing...') : (isHe ? 'הפק תובנות' : 'Generate Insights')}
              </Button>
            </div>

            {analyzingTeam && (
              <Card style={{ backgroundColor: 'rgba(42,112,80,0.08)', borderColor: 'rgba(42,112,80,0.25)' }}>
                <CardContent className="p-8 flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#2A7050' }} />
                  <span style={{ color: '#2A7050' }} className="font-medium">{isHe ? 'מנתח אימונים קבוצתיים...' : 'Analyzing team trainings...'}</span>
                </CardContent>
              </Card>
            )}

            {teamAnalysis && !analyzingTeam && (
              <div className="space-y-4">
                {/* Bottom Line — AI Insight */}
                <BottomLine
                  dataForAI={{
                    period_days: timeRange,
                    total_trainings: teamAnalysis.period_summary?.total_trainings,
                    main_topics: teamAnalysis.period_summary?.main_topics,
                    positive_points: teamAnalysis.positive_points,
                    improvement_points: teamAnalysis.improvement_points,
                    period_comparison: teamAnalysis.period_comparison,
                    professional_summary: teamAnalysis.professional_summary,
                  }}
                  context="ניתוח אימונים קבוצתי"
                  cacheKey={`training-analysis-${selectedTeamId}-${timeRange}-${summaries.length}`}
                  color="#2A7050"
                />

                {/* Period Summary */}
                <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base" style={{ color: '#2C2416' }}>
                      {isHe ? 'תקציר התקופה' : 'Period Summary'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(42,112,80,0.08)', border: '1px solid rgba(42,112,80,0.22)' }}>
                        <div className="text-2xl font-bold" style={{ color: '#2A7050' }}>
                          {teamAnalysis.period_summary.total_trainings}
                        </div>
                        <div className="text-xs" style={{ color: '#7A6B57' }}>{isHe ? 'אימונים בוצעו' : 'Trainings Done'}</div>
                      </div>
                      <div className="col-span-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(139,115,85,0.06)' }}>
                        <div className="text-xs mb-1" style={{ color: '#9A8672' }}>{isHe ? 'נושאים מרכזיים' : 'Main Topics'}</div>
                        <div className="flex flex-wrap gap-1">
                          {teamAnalysis.period_summary.main_topics?.map((topic, i) => (
                            <Badge key={i} style={{ backgroundColor: 'rgba(41,82,168,0.12)', color: '#2A5FA8', border: '1px solid rgba(41,82,168,0.22)' }}>
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(139,115,85,0.06)' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#7A6B57' }}>{isHe ? 'מטרות האימונים' : 'Training Goals'}</div>
                      <p className="text-sm" style={{ color: '#5C4E38' }}>{teamAnalysis.period_summary.training_goals}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(42,112,80,0.06)', border: '1px solid rgba(42,112,80,0.18)' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#2A7050' }}>{isHe ? 'מגמות כלליות' : 'General Trends'}</div>
                      <p className="text-sm" style={{ color: '#5C4E38' }}>{teamAnalysis.period_summary.general_trends}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Positive Points */}
                {teamAnalysis.positive_points?.length > 0 && (
                  <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2A7050' }}>
                        <CheckCircle2 className="w-5 h-5" />
                        {isHe ? 'נקודות חיוביות' : 'Positive Points'}
                      </CardTitle>
                      <p className="text-xs mt-1" style={{ color: '#9A8672' }}>{isHe ? 'דברים שעבדו טוב באימונים' : 'Things that worked well in training'}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {teamAnalysis.positive_points.map((point, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(42,112,80,0.08)', border: '1px solid rgba(42,112,80,0.22)' }}>
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2A7050' }} />
                          <span className="text-sm" style={{ color: '#5C4E38' }}>{point}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Improvement Points */}
                {teamAnalysis.improvement_points?.length > 0 && (
                  <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2" style={{ color: '#B94040' }}>
                        <AlertTriangle className="w-5 h-5" />
                        {isHe ? 'נקודות לשיפור' : 'Improvement Points'}
                      </CardTitle>
                      <p className="text-xs mt-1" style={{ color: '#9A8672' }}>{isHe ? 'בעיות שחזרו או נושאים שלא השתפרו' : 'Recurring issues or topics that did not improve'}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {teamAnalysis.improvement_points.map((point, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(185,64,64,0.08)', border: '1px solid rgba(185,64,64,0.22)' }}>
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B94040' }} />
                          <span className="text-sm" style={{ color: '#5C4E38' }}>{point}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Next Training Topics */}
                {teamAnalysis.next_training_topics?.length > 0 && (
                  <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2C2416' }}>
                        <Target className="w-5 h-5" style={{ color: '#2A5FA8' }} />
                        {isHe ? 'נושאים לעבודה באימונים הבאים' : 'Topics for Next Trainings'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {teamAnalysis.next_training_topics.map((topic, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(41,82,168,0.08)', border: '1px solid rgba(41,82,168,0.22)' }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs" style={{ backgroundColor: 'rgba(41,82,168,0.18)', color: '#2A5FA8' }}>
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium" style={{ color: '#2C2416' }}>{topic}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Period Comparison */}
                {teamAnalysis.period_comparison?.length > 0 && (
                  <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2C2416' }}>
                        <TrendingUp className="w-5 h-5" style={{ color: '#D97706' }} />
                        {isHe ? 'השוואה לתקופה קודמת' : 'Comparison to Previous Period'}
                      </CardTitle>
                      <p className="text-xs mt-1" style={{ color: '#9A8672' }}>
                        {isHe ? `השוואה של ${timeRange} הימים האחרונים מול ${timeRange} הימים שלפני כן` : `Comparing last ${timeRange} days vs the ${timeRange} days before`}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {teamAnalysis.period_comparison.map((comp, i) => {
                        const STATUS_CFG = {
                          'שיפור': { icon: TrendingUp, color: '#2A7050', bg: 'rgba(42,112,80,0.08)', border: 'rgba(42,112,80,0.22)', labelHe: 'שיפור', labelEn: 'Improved' },
                          'שימור': { icon: Minus, color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.22)', labelHe: 'שימור', labelEn: 'Maintained' },
                          'דעיכה': { icon: TrendingDown, color: '#B94040', bg: 'rgba(185,64,64,0.08)', border: 'rgba(185,64,64,0.22)', labelHe: 'דעיכה', labelEn: 'Declining' },
                          // English fallbacks
                          'Improved': { icon: TrendingUp, color: '#2A7050', bg: 'rgba(42,112,80,0.08)', border: 'rgba(42,112,80,0.22)', labelHe: 'שיפור', labelEn: 'Improved' },
                          'Maintained': { icon: Minus, color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.22)', labelHe: 'שימור', labelEn: 'Maintained' },
                          'Declining': { icon: TrendingDown, color: '#B94040', bg: 'rgba(185,64,64,0.08)', border: 'rgba(185,64,64,0.22)', labelHe: 'דעיכה', labelEn: 'Declining' },
                        };
                        const statusConfig = STATUS_CFG[comp.status] || { icon: Minus, color: '#9A8672', bg: 'rgba(139,115,85,0.06)', border: 'rgba(139,115,85,0.18)', labelHe: comp.status, labelEn: comp.status };
                        const Icon = statusConfig.icon;
                        const statusLabel = isHe ? statusConfig.labelHe : statusConfig.labelEn;

                        return (
                          <div key={i} className="p-3 rounded-lg space-y-2" style={{ backgroundColor: statusConfig.bg, border: `1px solid ${statusConfig.border}` }}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold" style={{ color: '#2C2416' }}>{comp.topic}</span>
                              <div className="flex items-center gap-1.5">
                                <Icon className="w-4 h-4" style={{ color: statusConfig.color }} />
                                <span className="text-xs font-bold" style={{ color: statusConfig.color }}>{statusLabel}</span>
                              </div>
                            </div>
                            <p className="text-xs leading-relaxed pr-2" style={{ color: '#5C4E38', borderRight: `2px solid ${statusConfig.color}50` }}>
                              {comp.explanation}
                            </p>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Professional Summary */}
                {teamAnalysis.professional_summary && (
                  <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2C2416' }}>
                        <Lightbulb className="w-5 h-5" style={{ color: '#7A2A8A' }} />
                        {isHe ? 'סיכום מקצועי' : 'Professional Summary'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed" style={{ color: '#5C4E38' }}>
                        {teamAnalysis.professional_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Personal Analysis Tab */}
          <TabsContent value="personal" className="space-y-3">
            {playersWithPrograms.length === 0 ? (
              <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
                <CardContent className="py-12 text-center">
                  <User className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8BFB3' }} />
                  <p className="text-sm" style={{ color: '#9A8672' }}>{isHe ? 'אין תוכניות אישיות פעילות' : 'No active personal programs'}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-xs font-semibold" style={{ color: '#9A8672' }}>
                  {playersWithPrograms.length} שחקנים עם תוכניות התפתחות פעילות
                </p>
                <div className="space-y-3">
                  {playersWithPrograms.map(player => {
                    const isExpanded = selectedPlayer?.id === player.id;
                    const workTopics = [...new Set(player.activePrograms.flatMap(p => p.work_topics || []))];
                    const playerEvals = trainingEvaluations
                      .filter(e => e.player_id === player.id)
                      .sort((a, b) => new Date(b.training_date) - new Date(a.training_date));
                    const trend = calcDevTrend(playerEvals);
                    const TrendIcon = trend.icon;

                    return (
                      <Card key={player.id} style={{ backgroundColor: '#FAF7F2', borderColor: isExpanded ? 'rgba(42,112,80,0.35)' : 'rgba(139,115,85,0.18)' }}>
                        <CardContent className="p-0">
                          {/* Compact header */}
                          <button className="w-full text-right p-4 flex items-center gap-3"
                            onClick={() => setSelectedPlayer(isExpanded ? null : player)}>
                            {/* Avatar */}
                            {player.photo_url ? (
                              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid rgba(42,112,80,0.25)' }}>
                                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                                style={{ backgroundColor: 'rgba(42,112,80,0.15)', color: '#2A7050' }}>
                                {(player.name || '?').charAt(0)}
                              </div>
                            )}

                            {/* Name + position */}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm" style={{ color: '#2C2416' }}>{player.name}</div>
                              <div className="text-[11px]" style={{ color: '#9A8672' }}>{player.position}</div>
                            </div>

                            {/* Focus topics (hidden on mobile) */}
                            <div className="hidden sm:flex flex-col gap-0.5 flex-1 min-w-0 px-2">
                              {workTopics.slice(0, 2).map((t, i) => (
                                <span key={i} className="text-[11px] truncate" style={{ color: '#5C4E38' }}>• {t}</span>
                              ))}
                              {workTopics.length > 2 && (
                                <span className="text-[10px]" style={{ color: '#9A8672' }}>+{workTopics.length - 2} נוספים</span>
                              )}
                            </div>

                            {/* Dev status */}
                            <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 rounded-lg"
                              style={{ backgroundColor: trend.bg, border: `1px solid ${trend.color}30` }}>
                              <TrendIcon className="w-3.5 h-3.5" style={{ color: trend.color }} />
                              <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: trend.color }}>{trend.label}</span>
                            </div>
                          </button>

                          {/* Expanded */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(139,115,85,0.12)' }}>
                              
                              {/* Development Trend card */}
                              <div className="p-3 rounded-lg flex items-center gap-3"
                                style={{ backgroundColor: trend.bg, border: `1px solid ${trend.color}30` }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${trend.color}20` }}>
                                  <TrendIcon className="w-4 h-4" style={{ color: trend.color }} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold" style={{ color: trend.color }}>מגמת התפתחות</p>
                                  <p className="text-sm font-bold" style={{ color: '#2C2416' }}>{trend.label}</p>
                                  <p className="text-[10px]" style={{ color: '#9A8672' }}>מבוסס על {playerEvals.length} הערכות</p>
                                </div>
                              </div>

                              {/* Topics status */}
                              {workTopics.length > 0 && (
                                <div className="rounded-lg p-3"
                                  style={{ backgroundColor: 'rgba(122,79,160,0.06)', border: '1px solid rgba(122,79,160,0.18)' }}>
                                  <p className="text-xs font-semibold mb-2" style={{ color: '#7A4FA0' }}>נושאים במעקב:</p>
                                  <div className="space-y-1.5">
                                    {workTopics.map((topic, i) => {
                                      const ts = topicStatus(topic, playerEvals);
                                      const TSIcon = ts.icon;
                                      return (
                                        <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded"
                                          style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.10)' }}>
                                          <span className="text-xs" style={{ color: '#2C2416' }}>{topic}</span>
                                          <div className="flex items-center gap-1">
                                            <TSIcon className="w-3 h-3" style={{ color: ts.color }} />
                                            <span className="text-[10px] font-semibold" style={{ color: ts.color }}>{ts.label}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Recent evaluations */}
                              {playerEvals.length > 0 && (
                                <div className="rounded-lg p-3"
                                  style={{ backgroundColor: 'rgba(139,115,85,0.05)', border: '1px solid rgba(139,115,85,0.14)' }}>
                                  <p className="text-xs font-semibold mb-2" style={{ color: '#5C4E38' }}>הערכות אחרונות:</p>
                                  <div className="space-y-2.5">
                                    {playerEvals.slice(0, 3).map((ev, i) => (
                                      <div key={i} className="text-xs" style={{ borderRight: '2px solid rgba(139,115,85,0.2)', paddingRight: '8px' }}>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="font-semibold" style={{ color: '#5C4E38' }}>
                                            {new Date(ev.training_date).toLocaleDateString('he-IL')}
                                          </span>
                                          <span className="font-bold" style={{ color: ev.rating >= 7 ? '#2A7050' : ev.rating >= 5 ? '#D97706' : '#B94040' }}>
                                            {ev.rating}/10
                                          </span>
                                        </div>
                                        {ev.topic_scores && Object.keys(ev.topic_scores).length > 0 && (
                                          <div className="flex flex-wrap gap-1 my-0.5">
                                            {Object.entries(ev.topic_scores).map(([t, s]) => (
                                              <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px]"
                                                style={{ backgroundColor: 'rgba(139,115,85,0.1)', color: '#5C4E38' }}>
                                                {t}: {s}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {ev.coach_note && (
                                          <p className="italic" style={{ color: '#7A6B57' }}>{ev.coach_note}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}