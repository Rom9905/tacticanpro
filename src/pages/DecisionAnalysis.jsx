import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSubscriptionGuard } from '@/components/useSubscriptionGuard';
import PageHero from '@/components/ui/PageHero';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Filter, Calendar, Target, BarChart3, Shield, Zap, Activity, X, Brain } from 'lucide-react';
import TeamSelector from '@/components/team/TeamSelector';
import HowItWorksButton from '@/components/HowItWorksButton';
import InsightDetailModal from '@/components/insights/InsightDetailModal';
import ActionHub from '@/components/decision/ActionHub';
import SituationsGrid from '@/components/decision/SituationsGrid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { useTeam } from '@/components/TeamContext';

export default function DecisionAnalysisPage() {
  const hasPlan = useSubscriptionGuard();
  const { selectedTeamId, selectTeam } = useTeam();
  const [showSituationDialog, setShowSituationDialog] = useState(false);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [editingSituation, setEditingSituation] = useState(null);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [selectedPatternForAction, setSelectedPatternForAction] = useState(null);
  const [viewingSituation, setViewingSituation] = useState(null);
  const [insightFilters, setInsightFilters] = useState({
    timeRange: '30',
    situation: 'all',
    player: 'all'
  });
  const [analysisFilters, setAnalysisFilters] = useState({
    severity: 'all',
    player: 'all',
    category: 'all',
    fieldArea: 'all'
  });
  const [trendTimeRange, setTrendTimeRange] = useState(10);

  const queryClient = useQueryClient();

  // Load teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      return base44.entities.Team.list();
    },
  });

  // Load situations for selected team
  const { data: situations = [] } = useQuery({
    queryKey: ['situations', selectedTeamId],
    queryFn: async () => {
      return base44.entities.KeyMatchSituation.filter({ team_id: selectedTeamId, status: 'active' });
    },
    enabled: !!selectedTeamId,
  });

  // Load players for selected team
  const { data: players = [] } = useQuery({
    queryKey: ['players', selectedTeamId],
    queryFn: async () => {
      return base44.entities.Player.filter({ team_id: selectedTeamId });
    },
    enabled: !!selectedTeamId,
  });

  // Load decision profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', selectedTeamId],
    queryFn: async () => {
      return base44.entities.PlayerDecisionProfile.filter({ team_id: selectedTeamId });
    },
    enabled: !!selectedTeamId,
  });

  // Load recent match summaries
  const { data: recentSummaries = [] } = useQuery({
    queryKey: ['summaries', selectedTeamId],
    queryFn: async () => {
      return base44.entities.MatchDecisionSummary.filter({ team_id: selectedTeamId }, '-created_date', 20);
    },
    enabled: !!selectedTeamId,
  });

  // Load match analyses to get opponent names
  const { data: _matchAnalyses = [] } = useQuery({
    queryKey: ['matches', selectedTeamId],
    queryFn: async () => {
      return base44.entities.MatchAnalysis.filter({ team_id: selectedTeamId }, '-date', 20);
    },
    enabled: !!selectedTeamId,
  });

  const createSituationMutation = useMutation({
    mutationFn: (data) => base44.entities.KeyMatchSituation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situations'] });
      setShowSituationDialog(false);
      setEditingSituation(null);
    },
  });

  const updateSituationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KeyMatchSituation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situations'] });
      setShowSituationDialog(false);
      setEditingSituation(null);
    },
  });

  const createDecisionMutation = useMutation({
    mutationFn: (data) => base44.entities.MatchDecisionSummary.create(data),
    onSuccess: async (newSummary) => {
      // Update player decision profiles
      await updatePlayerProfiles(newSummary);
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setShowDecisionDialog(false);
    },
  });

  const [situationForm, setSituationForm] = useState({
    situation_name: '',
    situation_category: '',
    description: '',
  });

  const [decisionForm, setDecisionForm] = useState({
    situation_id: '',
    involved_players: [],
    team_behavior: '',
    outcome: '',
    coach_note: '',
    match_date: new Date().toISOString().split('T')[0],
  });

  const updatePlayerProfiles = async (summary) => {
    // Update each involved player's decision profile
    for (const playerId of summary.involved_players) {
      const existingProfiles = await base44.entities.PlayerDecisionProfile.filter({ player_id: playerId });
      const profile = existingProfiles[0];
      
      // Get all summaries for this player
      const allSummaries = await base44.entities.MatchDecisionSummary.filter({ team_id: selectedTeamId });
      const playerSummaries = allSummaries.filter(s => s.involved_players?.includes(playerId));
      
      // Calculate tendencies
      const behaviorCounts = { שמרני: 0, מאוזן: 0, אגרסיבי: 0 };
      playerSummaries.forEach(s => {
        if (s.team_behavior) behaviorCounts[s.team_behavior]++;
      });
      
      const totalBehaviors = Object.values(behaviorCounts).reduce((a, b) => a + b, 0);
      let riskLevel = 'בינוני';
      if (totalBehaviors > 0) {
        const aggPercent = (behaviorCounts.אגרסיבי / totalBehaviors) * 100;
        const consPercent = (behaviorCounts.שמרני / totalBehaviors) * 100;
        if (aggPercent > 50) riskLevel = 'גבוה';
        else if (consPercent > 50) riskLevel = 'נמוך';
      }
      
      // Get most common action from situations
      const situationCounts = {};
      playerSummaries.forEach(s => {
        const sit = situations.find(sit => sit.id === s.situation_id);
        if (sit) {
          situationCounts[sit.situation_name] = (situationCounts[sit.situation_name] || 0) + 1;
        }
      });
      
      const relatedSituations = Object.entries(situationCounts).map(([name, count]) => ({
        situation_id: situations.find(s => s.situation_name === name)?.id,
        situation_name: name,
        involvement_count: count
      })).sort((a, b) => b.involvement_count - a.involvement_count);
      
      // Determine preferred action based on behavior
      let preferredAction = 'מסירה קדימה';
      if (riskLevel === 'גבוה') preferredAction = 'דריבול';
      else if (riskLevel === 'נמוך') preferredAction = 'מסירה אחורה';
      
      // Calculate reliability
      const matchCount = playerSummaries.length;
      let reliabilityScore = 'נמוך';
      if (matchCount >= 5) reliabilityScore = 'גבוה';
      else if (matchCount >= 3) reliabilityScore = 'בינוני';
      
      let confidenceLevel = 'נמוך';
      if (matchCount >= 5) confidenceLevel = 'גבוה';
      else if (matchCount >= 3) confidenceLevel = 'בינוני';
      
      // Generate behavioral notes
      const successRate = playerSummaries.filter(s => s.outcome === 'מוצלח').length / matchCount * 100;
      let behavioralNotes = `${players.find(p => p.id === playerId)?.name} נוטה להתנהגות ${riskLevel === 'גבוה' ? 'אגרסיבית' : riskLevel === 'נמוך' ? 'שמרנית' : 'מאוזנת'} במצבי משחק. `;
      if (successRate > 60) {
        behavioralNotes += 'החלטותיו מוצלחות ברובן.';
      } else if (successRate < 40) {
        behavioralNotes += 'יש מקום לשיפור בקבלת ההחלטות.';
      } else {
        behavioralNotes += 'רמת ההצלחה בינונית.';
      }
      
      const profileData = {
        player_id: playerId,
        team_id: selectedTeamId,
        related_situations: relatedSituations,
        decision_tendencies: {
          risk_level: riskLevel,
          preferred_action: preferredAction
        },
        behavioral_notes: behavioralNotes,
        confidence_level: confidenceLevel,
        data_reliability: {
          based_on_matches: matchCount,
          reliability_score: reliabilityScore
        },
        last_updated: new Date().toISOString()
      };
      
      if (profile) {
        await base44.entities.PlayerDecisionProfile.update(profile.id, profileData);
      } else {
        await base44.entities.PlayerDecisionProfile.create(profileData);
      }
    }
  };

  const handleCreateSituation = () => {
    if (editingSituation) {
      updateSituationMutation.mutate({
        id: editingSituation.id,
        data: situationForm,
      });
    } else {
      createSituationMutation.mutate({
        ...situationForm,
        team_id: selectedTeamId,
        status: 'active',
      });
    }
  };

  const handleCreateDecision = () => {
    createDecisionMutation.mutate({
      ...decisionForm,
      team_id: selectedTeamId,
      match_id: `match_${Date.now()}`,
    });
  };

  const handleArchiveSituation = (situationId) => {
    updateSituationMutation.mutate({
      id: situationId,
      data: { status: 'archived' },
    });
  };

  const categoryColors = {
    'בניה מאחור': 'bg-blue-100 text-blue-800',
    'מעבר הגנתי': 'bg-red-100 text-red-800',
    'מעבר התקפי': 'bg-green-100 text-green-800',
    'לחץ': 'bg-orange-100 text-orange-800',
    'שליש אחרון': 'bg-purple-100 text-purple-800',
    'ניהול משחק': 'bg-slate-100 text-slate-800',
  };

  // Calculate outliers
  const _outliers = profiles
    .filter(p => {
      const avgRiskLevel = profiles.reduce((acc, prof) => {
        if (prof.decision_tendencies?.risk_level === 'גבוה') return acc + 2;
        if (prof.decision_tendencies?.risk_level === 'בינוני') return acc + 1;
        return acc;
      }, 0) / profiles.length;

      const playerRisk = p.decision_tendencies?.risk_level === 'גבוה' ? 2 : 
                         p.decision_tendencies?.risk_level === 'בינוני' ? 1 : 0;

      return Math.abs(playerRisk - avgRiskLevel) > 0.8;
    })
    .map(p => ({
      ...p,
      player: players.find(pl => pl.id === p.player_id),
      outlierType: p.decision_tendencies?.risk_level === 'גבוה' ? 'aggressive' : 'conservative'
    }));

  // Generate comprehensive analytics
  const generateAnalytics = () => {
    if (!recentSummaries || recentSummaries.length === 0) return null;

    const totalDecisions = recentSummaries.length;
    const successfulDecisions = recentSummaries.filter(s => s.outcome === 'מוצלח').length;
    const problematicDecisions = recentSummaries.filter(s => s.outcome === 'בעייתי').length;
    const criticalErrors = recentSummaries.filter(s => s.outcome === 'בעייתי' && s.team_behavior === 'אגרסיבי').length;
    
    // Success rate
    const successRate = Math.round((successfulDecisions / totalDecisions) * 100);
    const errorRate = Math.round((problematicDecisions / totalDecisions) * 100);
    
    // Recurring errors
    const errorsBySituation = {};
    recentSummaries.filter(s => s.outcome === 'בעייתי').forEach(s => {
      const sit = situations.find(sit => sit.id === s.situation_id);
      if (sit) {
        errorsBySituation[sit.situation_name] = (errorsBySituation[sit.situation_name] || 0) + 1;
      }
    });
    const topErrors = Object.entries(errorsBySituation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // Problematic field areas (based on categories)
    const problemsByCategory = {};
    recentSummaries.filter(s => s.outcome === 'בעייתי').forEach(s => {
      const sit = situations.find(sit => sit.id === s.situation_id);
      if (sit) {
        problemsByCategory[sit.situation_category] = (problemsByCategory[sit.situation_category] || 0) + 1;
      }
    });
    
    // Trend data with training session details
    const trendData = recentSummaries
      .slice(0, trendTimeRange)
      .reverse()
      .map((s, _i) => {
        const situation = situations.find(sit => sit.id === s.situation_id);
        const involvedPlayerNames = s.involved_players?.map(pid => 
          players.find(p => p.id === pid)?.name
        ).filter(Boolean) || [];
        
        return {
          date: new Date(s.match_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
          fullDate: s.match_date,
          successRate: s.outcome === 'מוצלח' ? 100 : s.outcome === 'בעייתי' ? 0 : 50,
          situationName: situation?.situation_name || 'לא ידוע',
          category: situation?.situation_category || '',
          behavior: s.team_behavior,
          outcome: s.outcome,
          criticalErrors: s.outcome === 'בעייתי' && s.team_behavior === 'אגרסיבי' ? 1 : 0,
          players: involvedPlayerNames,
          note: s.coach_note,
          summaryId: s.id
        };
      });
    
    return {
      totalDecisions,
      successRate,
      errorRate,
      criticalErrors,
      topErrors,
      problemsByCategory,
      trendData
    };
  };

  // Organize decisions by tactical category
  const organizeByCategory = () => {
    const categories = {
      'בניה מאחור': [],
      'מעבר הגנתי': [],
      'מעבר התקפי': [],
      'לחץ': [],
      'שליש אחרון': [],
      'ניהול משחק': []
    };
    
    recentSummaries.forEach(summary => {
      const situation = situations.find(s => s.id === summary.situation_id);
      if (situation && categories[situation.situation_category]) {
        const playerNames = summary.involved_players?.map(pid => {
          const p = players.find(pl => pl.id === pid);
          return p?.name || 'לא ידוע';
        }) || [];
        
        categories[situation.situation_category].push({
          ...summary,
          situation,
          playerNames,
          severity: summary.outcome === 'בעייתי' && summary.team_behavior === 'אגרסיבי' ? 'קריטית' :
                   summary.outcome === 'בעייתי' ? 'גבוהה' :
                   summary.outcome === 'ניטרלי' ? 'בינונית' : 'נמוכה'
        });
      }
    });
    
    return categories;
  };

  // Find recurring patterns
  const findRecurringPatterns = () => {
    const patterns = {};
    
    recentSummaries.forEach(summary => {
      const situation = situations.find(s => s.id === summary.situation_id);
      if (situation && summary.outcome === 'בעייתי') {
        const key = `${situation.situation_name}-${summary.team_behavior}`;
        if (!patterns[key]) {
          patterns[key] = {
            situation: situation.situation_name,
            category: situation.situation_category,
            behavior: summary.team_behavior,
            count: 0,
            matches: [],
            players: new Set()
          };
        }
        patterns[key].count++;
        patterns[key].matches.push(summary.match_date);
        summary.involved_players?.forEach(pid => patterns[key].players.add(pid));
      }
    });
    
    return Object.values(patterns)
      .filter(p => p.count >= 2)
      .sort((a, b) => b.count - a.count)
      .map(p => ({
        ...p,
        players: Array.from(p.players).map(pid => players.find(pl => pl.id === pid)?.name).filter(Boolean)
      }));
  };

  const analytics = generateAnalytics();
  const categorizedDecisions = organizeByCategory();
  const recurringPatterns = findRecurringPatterns();

  if (hasPlan === null) return null;
  if (hasPlan === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">אין לך גישה לדף זה</h1>
          <p className="text-slate-400">אנא פנה למנהל המערכת להפעלת הגישה</p>
        </div>
      </div>
    );
  }

  // Apply filters
  const applyFilters = (decisions) => {
    return decisions.filter(d => {
      if (analysisFilters.severity !== 'all' && d.severity !== analysisFilters.severity) return false;
      if (analysisFilters.player !== 'all' && !d.involved_players?.includes(analysisFilters.player)) return false;
      if (analysisFilters.category !== 'all' && d.situation?.situation_category !== analysisFilters.category) return false;
      return true;
    });
  };

  if (!selectedTeamId) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">ניתוח קבלת החלטות</h1>
            <p className="text-slate-400">בחר קבוצה כדי להתחיל</p>
          </div>
          <TeamSelector teams={teams} onSelect={selectTeam} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 theme-cream" style={{ backgroundColor: '#F4EFE6' }}>
      <div className="w-full">
        <div className="mb-6">
          <PageHero
            icon={Brain}
            title="ניתוח קבלת החלטות"
            subtitle="ניהול מצבי משחק ותיעוד דפוסי החלטות"
            titleExtra={<HowItWorksButton page="DecisionAnalysis" />}
            style={{ border: '1px solid rgba(74,222,128,0.20)' }}
            actions={<TeamSelector teams={teams} selectedId={selectedTeamId} onSelect={selectTeam} />}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-900 border-slate-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              סקירת ביצועי משחק
            </TabsTrigger>
            <TabsTrigger value="patterns" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              דפוסים חוזרים
            </TabsTrigger>
            <TabsTrigger value="action" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              תוכנית פעולה
            </TabsTrigger>
            <TabsTrigger value="situations" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              הגדרת מצבי משחק
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Add New Decision */}
            <div className="flex items-center justify-end">
              <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={situations.length === 0}
                    onClick={() => setDecisionForm({
                      situation_id: '',
                      involved_players: [],
                      team_behavior: '',
                      outcome: '',
                      coach_note: '',
                      match_date: new Date().toISOString().split('T')[0],
                    })}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    תעד מצב משחק
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>תיעוד מצב משחק</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pl-2">
                    <div>
                      <Label>תאריך המשחק</Label>
                      <Input
                        type="date"
                        value={decisionForm.match_date}
                        onChange={(e) => setDecisionForm({ ...decisionForm, match_date: e.target.value })}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                    <div>
                      <Label>מצב משחק</Label>
                      <Select
                        value={decisionForm.situation_id}
                        onValueChange={(value) => setDecisionForm({ ...decisionForm, situation_id: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue placeholder="בחר מצב" />
                        </SelectTrigger>
                        <SelectContent>
                          {situations.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.situation_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>שחקנים מעורבים</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto bg-slate-800 p-3 rounded-lg border border-slate-700">
                        {players.map(player => (
                          <label key={player.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={decisionForm.involved_players.includes(player.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDecisionForm({
                                    ...decisionForm,
                                    involved_players: [...decisionForm.involved_players, player.id]
                                  });
                                } else {
                                  setDecisionForm({
                                    ...decisionForm,
                                    involved_players: decisionForm.involved_players.filter(id => id !== player.id)
                                  });
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{player.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>איכות הביצוע</Label>
                      <Select
                        value={decisionForm.team_behavior}
                        onValueChange={(value) => setDecisionForm({ ...decisionForm, team_behavior: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue placeholder="בחר התנהגות" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="שמרני">שמרני</SelectItem>
                          <SelectItem value="מאוזן">מאוזן</SelectItem>
                          <SelectItem value="אגרסיבי">אגרסיבי</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>תוצאה</Label>
                      <Select
                        value={decisionForm.outcome}
                        onValueChange={(value) => setDecisionForm({ ...decisionForm, outcome: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue placeholder="בחר תוצאה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="מוצלח">מוצלח</SelectItem>
                          <SelectItem value="ניטרלי">ניטרלי</SelectItem>
                          <SelectItem value="בעייתי">בעייתי</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>הערות (עד 200 תווים)</Label>
                      <Textarea
                        value={decisionForm.coach_note}
                        onChange={(e) => setDecisionForm({ ...decisionForm, coach_note: e.target.value.slice(0, 200) })}
                        className="bg-slate-800 border-slate-700"
                        placeholder="מה קרה במצב זה?"
                        rows={3}
                      />
                      <p className="text-xs text-slate-500 mt-1">{decisionForm.coach_note.length}/200</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleCreateDecision} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                        שמור תיעוד
                      </Button>
                      <Button variant="outline" onClick={() => setShowDecisionDialog(false)} className="flex-1">
                        ביטול
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {analytics && analytics.totalDecisions > 0 ? (
              <>
                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <span className="text-3xl font-bold text-white">{analytics.successRate}%</span>
                      </div>
                      <p className="text-sm text-slate-400">איכות החלטות</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span className="text-3xl font-bold text-white">
                          {Math.round((1 - analytics.errorRate / 100) * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">עמידות בלחץ</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        <span className="text-3xl font-bold text-white">
                          {analytics.totalDecisions > 5 ? 'גבוהה' : 'בינונית'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">יציבות מבנית</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        <span className="text-3xl font-bold text-white">
                          {analytics.successRate > 60 ? 'טובה' : 'דורשת שיפור'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">אפקטיביות במעברים</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Recurring Errors */}
                {analytics.topErrors.length > 0 && (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-red-400" />
                        סוגי טעויות שחזרו הכי הרבה
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.topErrors.map(([error, count], i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <span className="text-white font-medium">{error}</span>
                            <Badge className="bg-red-500/30 text-red-300">
                              {count} פעמים
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Trend Chart - Training Focus Performance */}
                {analytics.trendData.length > 0 && (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            מעקב טיפול בבעיות מקצועיות
                          </CardTitle>
                          <p className="text-sm text-slate-400 mt-1">תיעוד לפי תאריכים אמיתיים</p>
                        </div>
                        <Select value={trendTimeRange.toString()} onValueChange={(v) => setTrendTimeRange(parseInt(v))}>
                          <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 אחרונים</SelectItem>
                            <SelectItem value="10">10 אחרונים</SelectItem>
                            <SelectItem value="15">15 אחרונים</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={analytics.trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#94a3b8" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                          />
                          <YAxis stroke="#94a3b8" domain={[0, 100]} />
                          <ChartTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-4 shadow-2xl min-w-[280px]">
                                    <h4 className="text-white font-bold mb-3 text-lg">{data.situationName}</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                                        <span className="text-slate-400">תאריך:</span>
                                        <span className="text-white font-medium">{new Date(data.fullDate).toLocaleDateString('he-IL')}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400">קטגוריה:</span>
                                        <span className="text-blue-300">{data.category}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400">התנהגות:</span>
                                        <span className="text-slate-300">{data.behavior}</span>
                                      </div>
                                      <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                                        <span className="text-slate-400">תוצאה:</span>
                                        <span className={
                                          data.outcome === 'מוצלח' ? 'text-emerald-400 font-bold' :
                                          data.outcome === 'בעייתי' ? 'text-red-400 font-bold' :
                                          'text-slate-300'
                                        }>{data.outcome}</span>
                                      </div>
                                      <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-400">מדד אפקטיביות:</span>
                                        <span className="text-emerald-400 font-bold text-lg">{data.successRate}%</span>
                                      </div>
                                      {data.criticalErrors > 0 && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-slate-400">טעויות קריטיות:</span>
                                          <span className="text-red-400 font-bold">{data.criticalErrors}</span>
                                        </div>
                                      )}
                                      {data.players.length > 0 && (
                                        <div className="pt-2 border-t border-slate-700">
                                          <p className="text-slate-400 text-xs mb-2">שחקנים מעורבים:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {data.players.slice(0, 3).map((name, i) => (
                                              <span key={i} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                                {name}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {data.note && (
                                        <div className="pt-2 border-t border-slate-700">
                                          <p className="text-slate-400 text-xs mb-1">הערה:</p>
                                          <p className="text-slate-300 text-xs">{data.note.slice(0, 80)}...</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="successRate" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            dot={{ fill: '#10b981', r: 5, cursor: 'pointer' }}
                            activeDot={{ r: 7, onClick: (e, payload) => {
                              if (payload && payload.payload) {
                                // Could navigate to specific training session
                                console.log('Clicked on:', payload.payload);
                              }
                            }}}
                            name="אפקטיביות"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Recurring Patterns */}
                {recurringPatterns.length > 0 && (
                  <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        טעויות חוזרות - דפוסים שחוזרים על עצמם
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recurringPatterns.map((pattern, i) => (
                          <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-purple-500/20">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1">{pattern.situation}</h3>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-purple-500/20 text-purple-300">{pattern.category}</Badge>
                                  <Badge variant="outline" className="text-slate-300">{pattern.behavior}</Badge>
                                </div>
                              </div>
                              <Badge className="bg-red-500/30 text-red-300 text-lg px-3 py-1">
                                {pattern.count} פעמים
                              </Badge>
                            </div>
                            {pattern.players.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-slate-400 mb-1">שחקנים מעורבים:</p>
                                <div className="flex flex-wrap gap-2">
                                  {pattern.players.map((name, j) => (
                                    <Badge key={j} variant="outline" className="text-blue-300 border-blue-500/30">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Button 
                             size="sm" 
                             className="bg-emerald-500 hover:bg-emerald-600"
                             onClick={() => setSelectedPatternForAction(pattern)}
                            >
                             <Target className="w-4 h-4 ml-2" />
                             העבר למרכז אימונים
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Filters */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Filter className="w-5 h-5 text-slate-400" />
                      <Select value={analysisFilters.severity} onValueChange={(v) => setAnalysisFilters({...analysisFilters, severity: v})}>
                        <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
                          <SelectValue placeholder="חומרה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל רמות החומרה</SelectItem>
                          <SelectItem value="קריטית">קריטית</SelectItem>
                          <SelectItem value="גבוהה">גבוהה</SelectItem>
                          <SelectItem value="בינונית">בינונית</SelectItem>
                          <SelectItem value="נמוכה">נמוכה</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={analysisFilters.category} onValueChange={(v) => setAnalysisFilters({...analysisFilters, category: v})}>
                        <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700">
                          <SelectValue placeholder="קטגוריה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל הקטגוריות</SelectItem>
                          <SelectItem value="בניה מאחור">בניה מאחור</SelectItem>
                          <SelectItem value="מעבר הגנתי">מעבר הגנתי</SelectItem>
                          <SelectItem value="מעבר התקפי">מעבר התקפי</SelectItem>
                          <SelectItem value="לחץ">לחץ</SelectItem>
                          <SelectItem value="שליש אחרון">שליש אחרון</SelectItem>
                          <SelectItem value="ניהול משחק">ניהול משחק</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={analysisFilters.player} onValueChange={(v) => setAnalysisFilters({...analysisFilters, player: v})}>
                        <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700">
                          <SelectValue placeholder="שחקן" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל השחקנים</SelectItem>
                          {players.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {(analysisFilters.severity !== 'all' || analysisFilters.category !== 'all' || analysisFilters.player !== 'all') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setAnalysisFilters({ severity: 'all', player: 'all', category: 'all', fieldArea: 'all' })}
                          className="text-slate-400"
                        >
                          <X className="w-4 h-4 ml-2" />
                          נקה סינון
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Decisions by Game Phase */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-white">ניתוח לפי שלבי משחק</h2>
                  {Object.entries(categorizedDecisions).map(([category, decisions]) => {
                    const filteredDecisions = applyFilters(decisions);
                    if (filteredDecisions.length === 0) return null;

                    const categoryIcons = {
                      'בניה מאחור': Shield,
                      'מעבר הגנתי': TrendingDown,
                      'מעבר התקפי': TrendingUp,
                      'לחץ': Zap,
                      'שליש אחרון': Target,
                      'ניהול משחק': Activity
                    };
                    const Icon = categoryIcons[category] || BarChart3;

                    return (
                      <Card key={category} className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Icon className="w-5 h-5 text-emerald-400" />
                            {category}
                            <Badge variant="outline" className="mr-auto">{filteredDecisions.length} החלטות</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {filteredDecisions.map((decision, i) => (
                              <div key={i} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white mb-1">{decision.situation?.situation_name}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className={
                                        decision.severity === 'קריטית' ? 'bg-red-500/30 text-red-300' :
                                        decision.severity === 'גבוהה' ? 'bg-orange-500/30 text-orange-300' :
                                        decision.severity === 'בינונית' ? 'bg-yellow-500/30 text-yellow-300' :
                                        'bg-blue-500/30 text-blue-300'
                                      }>
                                        {decision.severity}
                                      </Badge>
                                      <Badge variant="outline" className="text-slate-300">{decision.team_behavior}</Badge>
                                      <Badge variant="outline" className="text-slate-400">
                                        <Calendar className="w-3 h-3 ml-1" />
                                        {decision.match_date}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs text-slate-500 font-bold mb-1">מה קרה:</p>
                                    <p className="text-sm text-slate-300">{decision.situation?.description || 'אין תיאור'}</p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-slate-500 font-bold mb-1">ההחלטה שהתקבלה:</p>
                                    <p className="text-sm text-slate-300">{decision.coach_note || 'לא צוין'}</p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs text-slate-500 font-bold mb-1">תוצאה:</p>
                                      <Badge className={
                                        decision.outcome === 'מוצלח' ? 'bg-green-500/20 text-green-300' :
                                        decision.outcome === 'בעייתי' ? 'bg-red-500/20 text-red-300' :
                                        'bg-slate-500/20 text-slate-300'
                                      }>
                                        {decision.outcome}
                                      </Badge>
                                    </div>
                                    {decision.playerNames.length > 0 && (
                                      <div>
                                        <p className="text-xs text-slate-500 font-bold mb-1">שחקנים:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {decision.playerNames.slice(0, 2).map((name, j) => (
                                            <Badge key={j} variant="outline" className="text-blue-300 text-xs">
                                              {name}
                                            </Badge>
                                          ))}
                                          {decision.playerNames.length > 2 && (
                                            <Badge variant="outline" className="text-slate-400 text-xs">
                                              +{decision.playerNames.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {decision.outcome === 'בעייתי' && (
                                    <div className="pt-3 border-t border-slate-700">
                                      <p className="text-xs text-emerald-400 font-bold mb-2">המלצת אימון:</p>
                                      <p className="text-sm text-slate-300 mb-3">
                                        תרגול ספציפי של מצב "{decision.situation?.situation_name}" עם דגש על קבלת החלטות תחת לחץ
                                      </p>
                                      <Button 
                                        size="sm" 
                                        className="bg-emerald-500 hover:bg-emerald-600"
                                        onClick={() => setSelectedPatternForAction({
                                          situation: decision.situation?.situation_name,
                                          category: decision.situation?.situation_category,
                                          count: 1,
                                          behavior: decision.team_behavior,
                                          matches: [decision.match_date],
                                          players: decision.playerNames
                                        })}
                                      >
                                        <Target className="w-4 h-4 ml-2" />
                                        העבר למרכז אימונים
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400 text-center">
                    טרם תועדו החלטות. התחל לתעד מצבי משחק בלשונית "תיעוד משחק".
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Situations Tab */}
          <TabsContent value="situations" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">מצבי משחק מרכזיים</h2>
                <p className="text-sm mt-1 text-slate-400">עד 10 מצבים פעילים</p>
              </div>
              <Dialog open={showSituationDialog} onOpenChange={setShowSituationDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={situations.length >= 10}
                    onClick={() => {
                      setEditingSituation(null);
                      setSituationForm({ situation_name: '', situation_category: '', description: '' });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף מצב חדש
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                  <DialogHeader>
                    <DialogTitle>{editingSituation ? 'ערוך מצב' : 'מצב משחק חדש'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>שם המצב</Label>
                      <Input
                        value={situationForm.situation_name}
                        onChange={(e) => setSituationForm({ ...situationForm, situation_name: e.target.value })}
                        className="bg-slate-800 border-slate-700"
                        placeholder="לדוגמה: בניה תחת לחץ גבוה"
                      />
                    </div>
                    <div>
                      <Label>קטגוריה</Label>
                      <Select
                        value={situationForm.situation_category}
                        onValueChange={(value) => setSituationForm({ ...situationForm, situation_category: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue placeholder="בחר קטגוריה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="בניה מאחור">בניה מאחור</SelectItem>
                          <SelectItem value="מעבר הגנתי">מעבר הגנתי</SelectItem>
                          <SelectItem value="מעבר התקפי">מעבר התקפי</SelectItem>
                          <SelectItem value="לחץ">לחץ</SelectItem>
                          <SelectItem value="שליש אחרון">שליש אחרון</SelectItem>
                          <SelectItem value="ניהול משחק">ניהול משחק</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>תיאור קצר</Label>
                      <Textarea
                        value={situationForm.description}
                        onChange={(e) => setSituationForm({ ...situationForm, description: e.target.value })}
                        className="bg-slate-800 border-slate-700"
                        placeholder="תאר את המצב בקצרה..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleCreateSituation} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        {editingSituation ? 'עדכן' : 'צור מצב'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowSituationDialog(false)} className="flex-1">
                        ביטול
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <SituationsGrid
              situations={situations}
              summaries={recentSummaries}
              onEdit={(situation) => {
                setEditingSituation(situation);
                setSituationForm({
                  situation_name: situation.situation_name,
                  situation_category: situation.situation_category,
                  description: situation.description || '',
                });
                setShowSituationDialog(true);
              }}
              onArchive={handleArchiveSituation}
              onView={(situation) => setViewingSituation(situation)}
            />

            {situations.length === 0 && (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400 text-center">
                    טרם הוגדרו מצבי משחק. התחל בהגדרת המצבים החשובים לקבוצה.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-6">

            {analytics && analytics.totalDecisions >= 5 ? (
              <>
                {/* Recurring Patterns - Neutral Tone */}
                {recurringPatterns.length > 0 ? (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-blue-400" />
                        תבניות שזוהו במשחקים האחרונים
                      </CardTitle>
                      <p className="text-sm text-slate-400 mt-2">
                        הנתונים מראים דפוסים מסוימים שחזרו על עצמם. זו הזדמנות להבין מה קורה במגרש.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recurringPatterns.map((pattern, i) => (
                          <div key={i} className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-2">{pattern.situation}</h3>
                                <div className="flex items-center gap-2 mb-3">
                                  <Badge className="bg-blue-500/20 text-blue-300">{pattern.category}</Badge>
                                  <Badge variant="outline" className="text-slate-300">{pattern.behavior}</Badge>
                                  <Badge className="bg-slate-700 text-slate-300">
                                    זוהה {pattern.count} פעמים
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs text-slate-500 font-bold mb-1">מה התבנית:</p>
                                <p className="text-sm text-slate-300">
                                  במצב "{pattern.situation}" הקבוצה נוטה להתנהגות {pattern.behavior}. 
                                  התבנית זוהתה ב-{pattern.count} משחקים שונים.
                                </p>
                              </div>

                              {pattern.players.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 font-bold mb-2">שחקנים שהיו מעורבים:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {pattern.players.map((name, j) => (
                                      <Badge key={j} variant="outline" className="text-blue-300 border-blue-500/30">
                                        {name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-3 border-t border-slate-700">
                                <p className="text-xs text-slate-500 font-bold mb-1">מתי זה קרה:</p>
                                <div className="flex flex-wrap gap-2">
                                  {pattern.matches.slice(0, 3).map((date, j) => (
                                    <Badge key={j} variant="outline" className="text-slate-400">
                                      {new Date(date).toLocaleDateString('he-IL')}
                                    </Badge>
                                  ))}
                                  {pattern.matches.length > 3 && (
                                    <Badge variant="outline" className="text-slate-500">
                                      +{pattern.matches.length - 3} נוספים
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Brain className="w-12 h-12 text-slate-600 mb-4" />
                      <p className="text-slate-400 text-center">
                        לא זוהו תבניות חוזרות עדיין. המשך לתעד משחקים.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Trend Analysis */}
                {analytics.trendData.length > 0 && (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        מגמה - 10 משחקים אחרונים
                      </CardTitle>
                      <p className="text-sm text-slate-400 mt-2">
                        גרף שמראה את השינוי באיכות הביצוע לאורך זמן
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analytics.trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="match" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" domain={[0, 100]} />
                          <ChartTooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                            labelStyle={{ color: '#e2e8f0' }}
                          />
                          <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} name="איכות ביצוע" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400 text-center mb-2">
                    נדרשים לפחות 5 תיעודים כדי לזהות דפוסים
                  </p>
                  <p className="text-sm text-slate-500 text-center">
                    כרגע יש {analytics?.totalDecisions || 0} תיעודים. המשך לשלב 1.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Action Tab */}
          <TabsContent value="action" className="space-y-6">
            {recurringPatterns.length > 0 ? (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">תוכנית פעולה</h2>
                  <p className="text-slate-400">כל בעיה מזוהה יכולה להפוך לאימון יישומי במרכז האימונים בלחיצה אחת</p>
                </div>
                {recurringPatterns.map((pattern, i) => (
                  <Card key={i} className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{pattern.situation}</h3>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-blue-500/20 text-blue-300">{pattern.category}</Badge>
                            <Badge className="bg-slate-700 text-slate-300">
                              {pattern.count} פעמים
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400 mb-4">
                            דפוס שזוהה במשחקים האחרונים. בחר כיצד לטפל בו באימונים.
                          </p>
                        </div>
                      </div>

                      <Button 
                        className="bg-emerald-500 hover:bg-emerald-600 w-full"
                        onClick={() => setSelectedPatternForAction(pattern)}
                      >
                        <Target className="w-4 h-4 ml-2" />
                        צור אימון מהתובנה
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400 text-center">
                    אין דפוסים זמינים להעברה כרגע
                  </p>
                  <p className="text-sm text-slate-500 text-center mt-2">
                    לאחר זיהוי דפוסים תוכל להעביר אותם כאן לפעולה
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {/* Header with filters */}
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>תובנות מקצועיות</h2>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                סיכום ממוקד על בסיס תיעודי משחק ומצבי משחק שתועדו
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')} • מספר תיעודים: {recentSummaries.length}
              </p>
            </div>

            {/* Filters */}
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <Select
                      value={insightFilters.timeRange}
                      onValueChange={(value) => setInsightFilters({ ...insightFilters, timeRange: value })}
                    >
                      <SelectTrigger className="w-28 bg-slate-800 border-slate-700" style={{ color: 'var(--text-secondary)' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 ימים</SelectItem>
                        <SelectItem value="14">14 ימים</SelectItem>
                        <SelectItem value="30">30 ימים</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Select
                    value={insightFilters.situation}
                    onValueChange={(value) => setInsightFilters({ ...insightFilters, situation: value })}
                  >
                    <SelectTrigger className="w-40 bg-slate-800 border-slate-700" style={{ color: 'var(--text-secondary)' }}>
                      <SelectValue placeholder="כל המצבים" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל המצבים</SelectItem>
                      {situations.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.situation_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={insightFilters.player}
                    onValueChange={(value) => setInsightFilters({ ...insightFilters, player: value })}
                  >
                    <SelectTrigger className="w-40 bg-slate-800 border-slate-700" style={{ color: 'var(--text-secondary)' }}>
                      <SelectValue placeholder="כל השחקנים" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל השחקנים</SelectItem>
                      {players.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {(() => {
              // Filter summaries by date range
              const daysAgo = parseInt(insightFilters.timeRange);
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
              
              let filteredSummaries = recentSummaries.filter(s => {
                const summaryDate = new Date(s.match_date || s.created_date);
                return summaryDate >= cutoffDate;
              });

              // Filter by situation
              if (insightFilters.situation !== 'all') {
                filteredSummaries = filteredSummaries.filter(s => s.situation_id === insightFilters.situation);
              }

              // Filter by player
              if (insightFilters.player !== 'all') {
                filteredSummaries = filteredSummaries.filter(s => s.involved_players?.includes(insightFilters.player));
              }

              if (filteredSummaries.length < 3) {
                return (
                  <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />
                      <p style={{ color: 'var(--text-secondary)' }} className="text-center">
                        אין מספיק תיעודי משחק כדי להפיק תובנות מקצועיות.
                      </p>
                      <p style={{ color: 'var(--text-muted)' }} className="text-sm text-center mt-2">
                        המשך לתעד מצבי משחק כדי לקבל סיכום מלא ושימושי.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              // Generate insights - "What Worked Well"
              const generateGoodInsights = () => {
                const insights = [];
                
                situations.forEach(situation => {
                  const sitSummaries = filteredSummaries.filter(s => s.situation_id === situation.id);
                  if (sitSummaries.length >= 2) {
                    const successfulCount = sitSummaries.filter(s => s.outcome === 'מוצלח').length;
                    if (successfulCount / sitSummaries.length > 0.7) {
                      const involvedPlayerIds = [...new Set(sitSummaries.flatMap(s => s.involved_players || []))];
                      const involvedPlayersList = involvedPlayerIds.map(id => players.find(p => p.id === id)).filter(Boolean).slice(0, 3);
                      
                      insights.push({
                        title: `${situation.situation_name} - ביצועים חזקים`,
                        summary: `הצלחנו ${successfulCount} מתוך ${sitSummaries.length} פעמים`,
                        type: 'good',
                        whatHappened: `במצב "${situation.situation_name}", הקבוצה הצליחה ב-${successfulCount} מתוך ${sitSummaries.length} המקרים שתועדו. הביצועים היו עקביים והתמודדות עם המצב הייתה טובה.`,
                        whatWasGood: [
                          'התמודדות מוצלחת עם המצב',
                          'ביצוע עקבי וטוב של הפתרונות הטקטיים'
                        ],
                        whatToImprove: [],
                        involvedPlayers: involvedPlayersList,
                        practicalActions: [
                          `המשך לתרגל את המצב הזה באימונים כדי לשמר את הרמה הגבוהה`
                        ],
                        howToMeasure: `ב-3 המשחקים הבאים: שמור על רמת הצלחה של 70% ומעלה במצב זה`,
                        count: sitSummaries.length
                      });
                    }
                  }
                });
                
                return insights.slice(0, 3);
              };

              // Generate insights - "What Needs Improvement"
              const generateFixInsights = () => {
                const insights = [];
                
                situations.forEach(situation => {
                  const sitSummaries = filteredSummaries.filter(s => s.situation_id === situation.id);
                  if (sitSummaries.length >= 2) {
                    const problematicCount = sitSummaries.filter(s => s.outcome === 'בעייתי').length;
                    const conservativeCount = sitSummaries.filter(s => s.team_behavior === 'שמרני').length;
                    const aggressiveCount = sitSummaries.filter(s => s.team_behavior === 'אגרסיבי').length;
                    
                    if (problematicCount / sitSummaries.length > 0.4) {
                      const involvedPlayerIds = [...new Set(sitSummaries.filter(s => s.outcome === 'בעייתי').flatMap(s => s.involved_players || []))];
                      const involvedPlayersList = involvedPlayerIds.map(id => players.find(p => p.id === id)).filter(Boolean).slice(0, 3);
                      
                      let whatToImprove = [];
                      let practicalActions = [];
                      
                      if (conservativeCount / sitSummaries.length > 0.6) {
                        whatToImprove.push('נטייה לבחירות שמרניות מדי שמאטות את הקצב');
                        practicalActions.push('תרגול קבלת החלטות מהירה תחת לחץ - רונדו 4v2 עם זמן מוגבל לכדור (2 מגעים)');
                      } else if (aggressiveCount / sitSummaries.length > 0.6) {
                        whatToImprove.push('בחירות אגרסיביות שמובילות לאובדני כדור');
                        practicalActions.push('תרגול זיהוי מצבי סיכון - משחק חצי מגרש עם דגש על "מתי להחזיק, מתי לדחוף"');
                      } else {
                        whatToImprove.push('קבלת החלטות תחת לחץ');
                        practicalActions.push('תרגול מצבי לחץ גבוה - משחק מצומצם עם מספר יריבים עודף');
                      }
                      
                      insights.push({
                        title: `${situation.situation_name} - דורש שיפור`,
                        summary: `${problematicCount} מתוך ${sitSummaries.length} מקרים היו בעייתיים`,
                        type: 'fix',
                        whatHappened: `במצב "${situation.situation_name}", נרשמו ${problematicCount} מקרים בעייתיים מתוך ${sitSummaries.length} שתועדו. ${conservativeCount > sitSummaries.length * 0.5 ? 'הקבוצה נטתה לבחירות שמרניות.' : aggressiveCount > sitSummaries.length * 0.5 ? 'הקבוצה נטתה לבחירות אגרסיביות.' : 'המצב דרש קבלת החלטות טובה יותר.'}`,
                        whatWasGood: [],
                        whatToImprove,
                        involvedPlayers: involvedPlayersList,
                        practicalActions,
                        howToMeasure: `ב-3 האימונים הבאים: פחות איבודים במצב זה, ושיפור בקריאת המצב`
                      });
                    }
                  }
                });
                
                return insights.slice(0, 3);
              };

              // Generate recommended actions
              const generateRecommendedActions = () => {
                const actions = [];
                
                // Based on problematic patterns
                const problematicSituations = situations
                  .map(sit => {
                    const sitSummaries = filteredSummaries.filter(s => s.situation_id === sit.id);
                    const problematicCount = sitSummaries.filter(s => s.outcome === 'בעייתי').length;
                    return {
                      situation: sit,
                      problematicCount,
                      total: sitSummaries.length,
                      rate: sitSummaries.length > 0 ? problematicCount / sitSummaries.length : 0
                    };
                  })
                  .filter(s => s.total >= 2 && s.rate > 0.3)
                  .sort((a, b) => b.rate - a.rate);
                
                if (problematicSituations.length > 0) {
                  const top = problematicSituations[0];
                  actions.push({
                    title: `תרגול ממוקד: ${top.situation.situation_name}`,
                    summary: `${top.problematicCount} מתוך ${top.total} פעמים היו בעייתיים`,
                    type: 'action',
                    whatHappened: `המצב "${top.situation.situation_name}" מהווה אתגר חוזר. מתוך ${top.total} מקרים שתועדו, ${top.problematicCount} הסתיימו בצורה בעייתית.`,
                    whatWasGood: [],
                    whatToImprove: [`שיפור קבלת החלטות במצב "${top.situation.situation_name}"`],
                    involvedPlayers: [],
                    practicalActions: [
                      `באימון הבא: 15 דקות תרגול ספציפי למצב "${top.situation.situation_name}"`,
                      `דגש על קריאת המצב והחלטה מהירה תחת לחץ`,
                      `סימולציה של ${top.situation.situation_category} במשחק מצומצם`
                    ],
                    howToMeasure: `במשחק הבא: לפחות 50% שיפור במצב זה (פחות תוצאות בעייתיות)`
                  });
                }
                
                return actions;
              };

              const goodInsights = generateGoodInsights();
              const fixInsights = generateFixInsights();
              const recommendedActions = generateRecommendedActions();

              if (filteredSummaries.length < 3) {
                return (
                  <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />
                      <p style={{ color: 'var(--text-secondary)' }} className="text-center">
                        אין מספיק תיעודי משחק בטווח הזמן שנבחר.
                      </p>
                      <p style={{ color: 'var(--text-muted)' }} className="text-sm text-center mt-2">
                        בחר טווח זמן רחב יותר או המשך לתעד משחקים.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <>
                  {/* A. What Worked Well */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--state-good-text)' }} />
                      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        מה עבד טוב
                      </h2>
                    </div>
                    
                    {goodInsights.length > 0 ? (
                      <div className="space-y-3">
                        {goodInsights.map((insight, i) => (
                          <Card 
                            key={i} 
                            className="cursor-pointer hover:shadow-lg transition-all"
                            style={{
                              backgroundColor: 'var(--state-good-bg)',
                              borderRight: '4px solid var(--state-good-border)'
                            }}
                            onClick={() => setSelectedInsight(insight)}
                          >
                            <CardContent className="p-4">
                              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                                {insight.title}
                              </h3>
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                                {insight.summary} • {insight.count} תיעודים
                              </p>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {insight.whatHappened.slice(0, 120)}...
                              </p>
                              <Button size="sm" variant="ghost" className="mt-2" style={{ color: 'var(--state-good-text)' }}>
                                פתח פירוט
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-6 text-center">
                          <p style={{ color: 'var(--text-muted)' }}>
                            לא זוהו דפוסים חיוביים בולטים בטווח הזמן שנבחר
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* B. What Needs Improvement */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-6 h-6" style={{ color: 'var(--state-fix-text)' }} />
                      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        מה דורש שיפור
                      </h2>
                    </div>
                    
                    {fixInsights.length > 0 ? (
                      <div className="space-y-3">
                        {fixInsights.map((insight, i) => (
                          <Card 
                            key={i} 
                            className="cursor-pointer hover:shadow-lg transition-all"
                            style={{
                              backgroundColor: 'var(--state-fix-bg)',
                              borderRight: '4px solid var(--state-fix-border)'
                            }}
                            onClick={() => setSelectedInsight(insight)}
                          >
                            <CardContent className="p-4">
                              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                                {insight.title}
                              </h3>
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                                {insight.summary}
                              </p>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {insight.whatHappened.slice(0, 120)}...
                              </p>
                              <Button size="sm" variant="ghost" className="mt-2" style={{ color: 'var(--state-fix-text)' }}>
                                פתח פירוט
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-6 text-center">
                          <p style={{ color: 'var(--text-muted)' }}>
                            לא זוהו דפוסים בעייתיים בטווח הזמן שנבחר
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* C. Recommended Actions */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="w-6 h-6" style={{ color: 'var(--state-note-text)' }} />
                      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        פעולות מומלצות השבוע
                      </h2>
                    </div>
                    
                    {recommendedActions.length > 0 ? (
                      <div className="space-y-3">
                        {recommendedActions.map((insight, i) => (
                          <Card 
                            key={i} 
                            className="cursor-pointer hover:shadow-lg transition-all"
                            style={{
                              backgroundColor: 'var(--state-note-bg)',
                              borderRight: '4px solid var(--state-note-border)'
                            }}
                            onClick={() => setSelectedInsight(insight)}
                          >
                            <CardContent className="p-4">
                              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                                {insight.title}
                              </h3>
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                                {insight.summary}
                              </p>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {insight.whatHappened.slice(0, 120)}...
                              </p>
                              <Button size="sm" variant="ghost" className="mt-2" style={{ color: 'var(--state-note-text)' }}>
                                פתח פירוט
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-6 text-center">
                          <p style={{ color: 'var(--text-muted)' }}>
                            אין המלצות ספציפיות כרגע
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              );
            })()}
          </TabsContent>
        </Tabs>

      </div>

      {/* Insight Detail Modal */}
      <InsightDetailModal
        isOpen={!!selectedInsight}
        onClose={() => setSelectedInsight(null)}
        insight={selectedInsight}
      />

      {/* Action Hub Modal */}
      {selectedPatternForAction && (
        <ActionHub
          pattern={selectedPatternForAction}
          players={players}
          teamId={selectedTeamId}
          isOpen={!!selectedPatternForAction}
          onClose={() => setSelectedPatternForAction(null)}
        />
      )}

      {/* Situation Detail View */}
      {viewingSituation && (
        <Dialog open={!!viewingSituation} onOpenChange={() => setViewingSituation(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{viewingSituation.situation_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div>
                <h3 className="text-sm font-bold text-slate-400 mb-3">פרטים כלליים</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">קטגוריה</p>
                    <Badge className={categoryColors[viewingSituation.situation_category]}>
                      {viewingSituation.situation_category}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">מספר הופעות</p>
                    <p className="text-white font-bold">{recentSummaries.filter(s => s.situation_id === viewingSituation.id).length}</p>
                  </div>
                </div>
              </div>

              {viewingSituation.description && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 mb-2">תיאור</h3>
                  <p className="text-slate-300">{viewingSituation.description}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-400 mb-3">טיימליין הופעות</h3>
                <div className="space-y-2">
                  {recentSummaries
                    .filter(s => s.situation_id === viewingSituation.id)
                    .slice(0, 5)
                    .map((summary, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">
                            {new Date(summary.match_date).toLocaleDateString('he-IL')}
                          </span>
                          <Badge className={
                            summary.outcome === 'מוצלח' ? 'bg-green-500/20 text-green-300' :
                            summary.outcome === 'בעייתי' ? 'bg-red-500/20 text-red-300' :
                            'bg-slate-500/20 text-slate-300'
                          }>
                            {summary.outcome}
                          </Badge>
                        </div>
                        {summary.coach_note && (
                          <p className="text-sm text-slate-400">{summary.coach_note}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => {
          setDecisionForm({
            situation_id: '',
            involved_players: [],
            team_behavior: '',
            outcome: '',
            coach_note: '',
            match_date: new Date().toISOString().split('T')[0],
          });
          setShowDecisionDialog(true);
        }}
        disabled={situations.length === 0}
        className="fixed bottom-8 left-8 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed z-30"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>
    </div>
  );
}