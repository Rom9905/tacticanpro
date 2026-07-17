import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import { useSubscriptionGuard } from '@/components/useSubscriptionGuard';
import {
  Plus,
  BarChart3,
  Video,
  FileText,
  Loader2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TeamSelector from '../components/team/TeamSelector';
import HowItWorksButton from '../components/HowItWorksButton';
import MatchReportCard from '../components/analysis/MatchReportCard';
import MatchAnalysisHero from '../components/analysis/MatchAnalysisHero';
import { MA, matchAnalysisStyles } from '../components/analysis/matchAnalysisTheme';
import StatisticsAnalysis from '../components/analysis/StatisticsAnalysis';
import VideoAnalysis from '../components/analysis/VideoAnalysis';
import FreeFormAnalysis from '../components/analysis/FreeFormAnalysis';
import WeeklySummary from '../components/analysis/WeeklySummary';
import ProblemHeatmap from '../components/analysis/ProblemHeatmap';
import TrendsTab from '../components/analysis/TrendsTab';
import MatchAnalysisModal from '../components/analysis/MatchAnalysisModal';
import { syncMatchRatingsToPlayers } from '@/lib/playerRatingSync';

// Score can come from the linked ProfessionalSummary or the analysis itself.
const scoreOur = a => a._summary?.result_our ?? a.result?.our_score ?? null;
const scoreOpp = a => a._summary?.result_opponent ?? a.result?.opponent_score ?? null;
const outcomeOf = (a) => {
  const our = scoreOur(a), opp = scoreOpp(a);
  if (our == null || opp == null) return null;
  return our > opp ? 'win' : our < opp ? 'loss' : 'draw';
};

export default function MatchAnalysis() {
  const hasPlan = useSubscriptionGuard();
  const { t, dir } = useLang();
  const isHe = t.lang === 'he';
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showNewAnalysis, setShowNewAnalysis] = useState(false);
  const [analysisMode, setAnalysisMode] = useState(null);
  const [view, setView] = useState('list');
  const [addingToMatch, setAddingToMatch] = useState(null);
  const [editingRatings, setEditingRatings] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [trainingGuideAction, setTrainingGuideAction] = useState(null);

  const loadTeams = async () => {
    const data = await base44.entities.Team.list();
    setTeams(data);
    if (data.length > 0) {
      setSelectedTeamId(data[0].id);
    }
  };

  const loadAnalyses = async (teamId) => {
    setLoading(true);
    const [analysesData, summariesData] = await Promise.all([
      base44.entities.MatchAnalysis.filter({ team_id: teamId }, '-date', 50),
      base44.entities.ProfessionalSummary.filter({ team_id: teamId, event_type: 'match' }, '-event_date', 50),
    ]);

    // Merge summaries into analyses (by summary_id or by opponent+date)
    const merged = analysesData.map(a => {
      const linked = a.summary_id
        ? summariesData.find(s => s.id === a.summary_id)
        : summariesData.find(s => s.event_date === a.date && (s.event_label || '').includes(a.opponent));
      return { ...a, _summary: linked || null };
    });

    // Also include match summaries that have NO MatchAnalysis yet (summary-only matches)
    const usedSummaryIds = new Set(merged.map(a => a.summary_id).filter(Boolean));
    const summaryOnly = summariesData
      .filter(s => !usedSummaryIds.has(s.id))
      .map(s => ({
        id: `summary_${s.id}`,
        _summaryOnly: true,
        _summary: s,
        team_id: s.team_id,
        opponent: s.event_label?.replace('מול ', '') || 'לא ידוע',
        date: s.event_date,
        result: s.result_our != null ? { our_score: s.result_our, opponent_score: s.result_opponent } : null,
      }));

    const sorted = [...merged, ...summaryOnly].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setAnalyses(sorted);
    setLoading(false);
    return sorted;
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadAnalyses(selectedTeamId);
    }
  }, [selectedTeamId]);

  // Season scoreboard — only matches with a recorded result count toward W/D/L and goals.
  const seasonStats = React.useMemo(() => {
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    analyses.forEach(a => {
      const outcome = outcomeOf(a);
      if (!outcome) return;
      goalsFor += scoreOur(a);
      goalsAgainst += scoreOpp(a);
      if (outcome === 'win') wins++;
      else if (outcome === 'loss') losses++;
      else draws++;
    });
    return { matches: analyses.length, wins, draws, losses, goalsFor, goalsAgainst };
  }, [analyses]);

  // Form strip: most recent first (analyses are already sorted newest → oldest).
  const form = React.useMemo(
    () => analyses.map(outcomeOf).filter(Boolean).slice(0, 5),
    [analyses],
  );

  // Season averages power the "מול ממוצע העונה" markers on the modal's stat bars.
  const seasonAverages = React.useMemo(() => {
    const totals = {}, counts = {};
    analyses.forEach(a => {
      Object.entries(a.stats || {}).forEach(([k, v]) => {
        const num = Number(v);
        if (v == null || Number.isNaN(num)) return;
        totals[k] = (totals[k] || 0) + num;
        counts[k] = (counts[k] || 0) + 1;
      });
    });
    const out = {};
    Object.keys(totals).forEach(k => { out[k] = totals[k] / counts[k]; });
    return out;
  }, [analyses]);

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

  const handleDeleteMatch = async (analysis) => {
    if (analysis._summaryOnly && analysis._summary) {
      // Just a summary — delete the ProfessionalSummary and its GameSchedule
      try {
        await base44.entities.ProfessionalSummary.delete(analysis._summary.id);
        if (analysis._summary.event_id) {
          try { await base44.entities.GameSchedule.delete(analysis._summary.event_id); } catch {}
        }
      } catch (e) { console.error(e); }
      loadAnalyses(selectedTeamId);
      return;
    }
    // Real MatchAnalysis — delete it + linked summary + linked game
    try {
      if (analysis.summary_id) {
        try {
          await base44.entities.ProfessionalSummary.delete(analysis.summary_id);
        } catch {}
      }
      // Also try to find and delete the GameSchedule
      const user = await base44.auth.me();
      const events = await base44.entities.GameSchedule.filter({ team_id: selectedTeamId, opponent: analysis.opponent, created_by: user.email });
      for (const ev of events) {
        try { await base44.entities.GameSchedule.delete(ev.id); } catch {}
      }
      await base44.entities.MatchAnalysis.delete(analysis.id);
    } catch (e) { console.error(e); }
    if (selectedAnalysis?.id === analysis.id) setSelectedAnalysis(null);
    loadAnalyses(selectedTeamId);
  };

  const handleDeleteAnalysisType = async (analysis, typeToRemove) => {
    const currentTypes = analysis.analysis_types || [];
    const newTypes = currentTypes.filter(t => t !== typeToRemove);
    
    const updatePayload = { analysis_types: newTypes };
    
    // Clear the corresponding data
    if (typeToRemove === 'statistics' || typeToRemove === 'stats') {
      updatePayload.stats = null;
    }
    if (typeToRemove === 'video') {
      updatePayload.video_moments = [];
    }
    if (typeToRemove === 'freeform') {
      updatePayload.free_notes = '';
    }

    await base44.entities.MatchAnalysis.update(analysis.id, updatePayload);
    setSelectedAnalysis(null);
    loadAnalyses(selectedTeamId);
  };

  const handleSaveAnalysis = async (data) => {
    if (addingToMatch) {
      // If this is a summary-only record (no real MatchAnalysis), create a new one instead
      if (addingToMatch._summaryOnly) {
        const created = await base44.entities.MatchAnalysis.create({
          ...data,
          team_id: selectedTeamId,
          summary_id: addingToMatch._summary?.id,
          opponent: addingToMatch.opponent,
          date: addingToMatch.date,
          result: addingToMatch.result,
        });
        await syncMatchRatingsToPlayers(created, data.player_ratings || []);
        setAddingToMatch(null);
        loadAnalyses(selectedTeamId);
        setShowNewAnalysis(false);
        setAnalysisMode(null);
        return;
      }

      // Add analysis layer to existing match
      const existing = addingToMatch;
      const existingTypes = existing.analysis_types || [existing.analysis_mode].filter(Boolean);
      const newTypes = [...new Set([...existingTypes, ...data.analysis_types])];
      
      await base44.entities.MatchAnalysis.update(addingToMatch.id, {
        ...existing,
        analysis_types: newTypes,
        // Merge stats
        stats: { ...existing.stats, ...data.stats },
        // Append video moments
        video_moments: [...(existing.video_moments || []), ...(data.video_moments || [])],
        // Merge free notes
        free_notes: existing.free_notes 
          ? `${existing.free_notes}\n\n---\n\n${data.free_notes || ''}`
          : data.free_notes,
        // Merge player ratings (array)
        player_ratings: [...(existing.player_ratings || []), ...(data.player_ratings || [])],
        // Keep the most detailed game_plan
        game_plan: data.game_plan || existing.game_plan,
        // Merge phase analysis
        phase_analysis: {
          buildup: {
            strengths: [...(existing.phase_analysis?.buildup?.strengths || []), ...(data.phase_analysis?.buildup?.strengths || [])],
            issues: [...(existing.phase_analysis?.buildup?.issues || []), ...(data.phase_analysis?.buildup?.issues || [])],
            recommendations: [...(existing.phase_analysis?.buildup?.recommendations || []), ...(data.phase_analysis?.buildup?.recommendations || [])],
          },
          transitions: {
            attack: {
              strengths: [...(existing.phase_analysis?.transitions?.attack?.strengths || []), ...(data.phase_analysis?.transitions?.attack?.strengths || [])],
              issues: [...(existing.phase_analysis?.transitions?.attack?.issues || []), ...(data.phase_analysis?.transitions?.attack?.issues || [])],
              recommendations: [...(existing.phase_analysis?.transitions?.attack?.recommendations || []), ...(data.phase_analysis?.transitions?.attack?.recommendations || [])],
            },
            defense: {
              strengths: [...(existing.phase_analysis?.transitions?.defense?.strengths || []), ...(data.phase_analysis?.transitions?.defense?.strengths || [])],
              issues: [...(existing.phase_analysis?.transitions?.defense?.issues || []), ...(data.phase_analysis?.transitions?.defense?.issues || [])],
              recommendations: [...(existing.phase_analysis?.transitions?.defense?.recommendations || []), ...(data.phase_analysis?.transitions?.defense?.recommendations || [])],
            }
          },
          organized_defense: {
            strengths: [...(existing.phase_analysis?.organized_defense?.strengths || []), ...(data.phase_analysis?.organized_defense?.strengths || [])],
            issues: [...(existing.phase_analysis?.organized_defense?.issues || []), ...(data.phase_analysis?.organized_defense?.issues || [])],
            recommendations: [...(existing.phase_analysis?.organized_defense?.recommendations || []), ...(data.phase_analysis?.organized_defense?.recommendations || [])],
          },
          set_pieces: {
            strengths: [...(existing.phase_analysis?.set_pieces?.strengths || []), ...(data.phase_analysis?.set_pieces?.strengths || [])],
            issues: [...(existing.phase_analysis?.set_pieces?.issues || []), ...(data.phase_analysis?.set_pieces?.issues || [])],
            recommendations: [...(existing.phase_analysis?.set_pieces?.recommendations || []), ...(data.phase_analysis?.set_pieces?.recommendations || [])],
          }
        },
        // Merge training actions
        training_actions: [...(existing.training_actions || []), ...(data.training_actions || [])],
        // Merge recurring patterns
        recurring_patterns: [...(existing.recurring_patterns || []), ...(data.recurring_patterns || [])],
        // Update legacy report
        report: {
          summary: data.report?.summary || existing.report?.summary,
          positives: [...(existing.report?.positives || []), ...(data.report?.positives || [])],
          issues: [...(existing.report?.issues || []), ...(data.report?.issues || [])],
          recommendations: [...(existing.report?.recommendations || []), ...(data.report?.recommendations || [])],
        }
      });
      await syncMatchRatingsToPlayers(addingToMatch, data.player_ratings || []);
      setAddingToMatch(null);
    } else {
      // Create new match analysis
      const created = await base44.entities.MatchAnalysis.create({
        ...data,
        team_id: selectedTeamId,
      });
      await syncMatchRatingsToPlayers(created, data.player_ratings || []);
    }
    // Create TacticalGoal entries from training_actions and report.issues
    const goalSources = [
      ...(data.training_actions || []).map(a => ({ title: a.focus, description: a.drill_suggestion || '', priority: a.priority || 'medium' })),
      ...(data.report?.issues || []).map(issue => ({ title: issue.substring(0, 80), description: issue, priority: 'medium' })),
    ];
    for (const goal of goalSources) {
      try {
        await base44.entities.TacticalGoal.create({
          team_id: selectedTeamId,
          title: goal.title,
          description: goal.description,
          priority: goal.priority,
          status: 'active',
          source: 'match',
        });
      } catch {}
    }

    loadAnalyses(selectedTeamId);
    setShowNewAnalysis(false);
    setAnalysisMode(null);
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  // Mode Selection Dialog
  const ModeSelectionDialog = () => {
    const existingTypes = addingToMatch?.analysis_types || [addingToMatch?.analysis_mode].filter(Boolean) || [];
    const mIsHe = t.lang === 'he';
    
    return (
      <Dialog open={showNewAnalysis && !analysisMode} onOpenChange={() => { setShowNewAnalysis(false); setAddingToMatch(null); }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {addingToMatch ? (mIsHe ? `הוסף ניתוח למשחק מול ${addingToMatch.opponent}` : `Add analysis for match vs ${addingToMatch.opponent}`) : (mIsHe ? 'בחר סוג ניתוח' : 'Select Analysis Type')}
            </DialogTitle>
            {addingToMatch && existingTypes.length > 0 && (
              <p className="text-sm text-slate-400 mt-2">
                {mIsHe ? 'כבר קיימים:' : 'Already exists:'} {existingTypes.map(tp => 
                  tp === 'statistics' || tp === 'stats' ? (mIsHe ? 'סטטיסטיקה' : 'Statistics') : 
                  tp === 'video' ? (mIsHe ? 'וידאו' : 'Video') : 
                  (mIsHe ? 'חופשי' : 'Free Form')
                ).join(', ')}
              </p>
            )}
          </DialogHeader>
        
        <div className="grid md:grid-cols-3 gap-4 py-4">
          {/* Statistics Mode */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setAnalysisMode('stats')}
            className="p-6 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500 cursor-pointer transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{mIsHe ? 'ניתוח סטטיסטיקה' : 'Statistics Analysis'}</h3>
            <p className="text-sm text-slate-400 mb-3">
              {mIsHe ? 'הזן נתונים בסיסיים ומספרים, והמערכת תעזור לפרש אותם דרך שאלות ותובנות.' : 'Enter basic data and numbers, and the system will help interpret them through questions and insights.'}
            </p>
            <div className="text-xs text-slate-500">
              ⏱️ {mIsHe ? '5-10 דקות • 📊 מבוסס מספרים' : '5-10 min • 📊 Number-based'}
            </div>
          </motion.div>

          {/* Video Mode */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setAnalysisMode('video')}
            className="p-6 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500 cursor-pointer transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
              <Video className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{mIsHe ? 'ניתוח וידאו' : 'Video Analysis'}</h3>
            <p className="text-sm text-slate-400 mb-3">
              {mIsHe ? 'תעד רגעים חשובים בזמן צפייה, תייג מצבים והמערכת תזהה דפוסים חוזרים.' : 'Record key moments while watching, tag situations and the system will identify recurring patterns.'}
            </p>
            <div className="text-xs text-slate-500">
              ⏱️ {mIsHe ? '90+ דקות • 🎥 מבוסס צפייה' : '90+ min • 🎥 View-based'}
            </div>
          </motion.div>

          {/* Free Form Mode */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setAnalysisMode('freeform')}
            className="p-6 rounded-xl bg-slate-800 border border-slate-700 hover:border-purple-500 cursor-pointer transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{mIsHe ? 'מחברת חופשית' : 'Free Notebook'}</h3>
            <p className="text-sm text-slate-400 mb-3">
              {mIsHe ? 'כתוב הערות, תן ציונים איכותיים, סמן השפעה על המבנה הקבוצתי.' : 'Write notes, give qualitative ratings, mark impact on team structure.'}
            </p>
            <div className="text-xs text-slate-500">
              ⏱️ {mIsHe ? 'גמיש • ✍️ מבוסס כתיבה' : 'Flexible • ✍️ Writing-based'}
            </div>
          </motion.div>
        </div>
        
        {addingToMatch && (
          <div className="text-xs text-slate-500 mt-4 p-3 rounded-lg bg-slate-800/50">
            💡 {mIsHe ? 'כל סוג ניתוח מוסיף שכבה נוספת להבנת המשחק. הנתונים ישולבו יחד למסמך אחד.' : 'Each analysis type adds another layer to match understanding. Data will be combined into one document.'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
  };

  return (
    <div className="min-h-screen theme-cream" style={{ backgroundColor: MA.bgPage, padding: '28px 16px', fontFamily: MA.body, color: MA.textPrimary }} dir={dir}>
      <style>{matchAnalysisStyles}</style>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ background: MA.bgContainer, borderRadius: 20, overflow: 'hidden', boxShadow: MA.containerShadow }}>
          <MatchAnalysisHero
            stats={seasonStats}
            form={form}
            view={view}
            onViewChange={setView}
            onNewAnalysis={() => setShowNewAnalysis(true)}
            teamSelector={<TeamSelector teams={teams} selectedTeamId={selectedTeamId} onSelect={setSelectedTeamId} />}
            titleExtra={<HowItWorksButton page="MatchAnalysis" />}
            isHe={isHe}
          />

          <div className="ma-pad">
            {view === 'list' && (
              loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: MA.greenMain }} />
                </div>
              ) : analyses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {analyses.map((analysis, i) => (
                    <div key={analysis.id} className="ma-row" style={{ position: 'relative' }}>
                      <MatchReportCard
                        analysis={analysis}
                        index={i}
                        onClick={() => setSelectedAnalysis(analysis)}
                        onDelete={handleDeleteMatch}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingToMatch(analysis);
                          setShowNewAnalysis(true);
                        }}
                        className="ma-row-action"
                        style={{
                          position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: MA.successBg, color: MA.greenMain, fontSize: 11, fontWeight: 700,
                          fontFamily: MA.body,
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        {isHe ? 'הוסף ניתוח' : 'Add Analysis'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: MA.card, borderRadius: 16, boxShadow: MA.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
                  <BarChart3 className="w-12 h-12 mx-auto mb-4" style={{ color: MA.textMuted }} />
                  <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, fontFamily: MA.heading, color: MA.textPrimary }}>
                    {isHe ? 'אין ניתוחים' : 'No Analyses'}
                  </h3>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: MA.textMuted }}>
                    {isHe ? 'התחל עם המשחק הראשון' : 'Start with the first match'}
                  </p>
                  <button onClick={() => setShowNewAnalysis(true)} className="ma-hit"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12,
                      border: 'none', background: MA.greenAccent, color: '#0D1A12', fontWeight: 700, fontSize: 15,
                      fontFamily: MA.body, cursor: 'pointer',
                    }}>
                    <Plus className="w-4 h-4" />
                    {isHe ? 'ניתוח חדש' : 'New Analysis'}
                  </button>
                </div>
              )
            )}

            {view === 'weekly' && <WeeklySummary analyses={analyses} teamId={selectedTeamId} />}
            {view === 'heatmap' && <ProblemHeatmap analyses={analyses} teamId={selectedTeamId} />}
            {view === 'trends' && <TrendsTab analyses={analyses} teamId={selectedTeamId} />}
          </div>
        </div>

        {/* Mode Selection */}
        <ModeSelectionDialog />

        {/* Analysis Forms */}
        <StatisticsAnalysis
          isOpen={analysisMode === 'stats'}
          onClose={() => { setAnalysisMode(null); setShowNewAnalysis(false); setAddingToMatch(null); }}
          onSave={handleSaveAnalysis}
          team={selectedTeam}
          existingMatch={addingToMatch}
        />

        <VideoAnalysis
          isOpen={analysisMode === 'video'}
          onClose={() => { setAnalysisMode(null); setShowNewAnalysis(false); setAddingToMatch(null); }}
          onSave={handleSaveAnalysis}
          team={selectedTeam}
          existingMatch={addingToMatch}
        />

        <FreeFormAnalysis
          isOpen={analysisMode === 'freeform'}
          onClose={() => { setAnalysisMode(null); setShowNewAnalysis(false); setAddingToMatch(null); }}
          onSave={handleSaveAnalysis}
          team={selectedTeam}
          existingMatch={addingToMatch}
        />

        {/* New Analysis Modal */}
        <MatchAnalysisModal
          open={!!selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
          analysis={selectedAnalysis}
          teamName={selectedTeam?.name}
          seasonAverages={seasonAverages}
          onRefresh={async () => {
            const refreshed = await loadAnalyses(selectedTeamId);
            if (selectedAnalysis) {
              const updated = refreshed.find(a => a.id === selectedAnalysis.id);
              if (updated) setSelectedAnalysis(updated);
            }
          }}
          onDeleteAnalysisType={handleDeleteAnalysisType}
        />

        {/* Edit Ratings Dialog */}
        <Dialog open={!!editingRatings} onOpenChange={() => setEditingRatings(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
            {editingRatings && (
              <>
                <DialogHeader>
                  <DialogTitle>ערוך ציוני שחקנים - {editingRatings.opponent}</DialogTitle>
                </DialogHeader>
                <EditRatingsForm 
                  match={editingRatings}
                  onSave={async (updatedRatings) => {
                    if (editingRatings._summaryOnly) { setEditingRatings(null); return; }
                    await base44.entities.MatchAnalysis.update(editingRatings.id, {
                      player_ratings: updatedRatings
                    });
                    await syncMatchRatingsToPlayers(editingRatings, updatedRatings);
                    loadAnalyses(selectedTeamId);
                    setEditingRatings(null);
                    if (selectedAnalysis?.id === editingRatings.id) {
                      setSelectedAnalysis({ ...editingRatings, player_ratings: updatedRatings });
                    }
                  }}
                  onCancel={() => setEditingRatings(null)}
                />
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Training Guide Dialog */}
        {trainingGuideAction && (
          <TrainingGuideModal
            action={trainingGuideAction}
            matchOpponent={selectedAnalysis?.opponent}
            analysis={selectedAnalysis}
            onClose={() => setTrainingGuideAction(null)}
          />
        )}

        {/* Edit Training Actions Dialog */}
        <Dialog open={!!editingTraining} onOpenChange={() => setEditingTraining(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            {editingTraining && (
              <>
                <DialogHeader>
                  <DialogTitle>דגשים לעבודה - {editingTraining.opponent}</DialogTitle>
                </DialogHeader>
                <EditTrainingForm 
                  match={editingTraining}
                  onSave={async (updatedActions) => {
                    if (editingTraining._summaryOnly) { setEditingTraining(null); return; }
                    await base44.entities.MatchAnalysis.update(editingTraining.id, {
                      training_actions: updatedActions
                    });
                    loadAnalyses(selectedTeamId);
                    setEditingTraining(null);
                    if (selectedAnalysis?.id === editingTraining.id) {
                      setSelectedAnalysis({ ...editingTraining, training_actions: updatedActions });
                    }
                  }}
                  onCancel={() => setEditingTraining(null)}
                />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Edit Ratings Form Component
function EditRatingsForm({ match, onSave, onCancel }) {
  const [ratings, setRatings] = useState(match.player_ratings || []);

  const updateRating = (index, field, value) => {
    const updated = [...ratings];
    updated[index] = { ...updated[index], [field]: value };
    setRatings(updated);
  };

  const removeRating = (index) => {
    setRatings(ratings.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto space-y-3">
        {ratings.map((rating, index) => (
          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
            <input
              type="text"
              value={rating.note || ''}
              onChange={(e) => updateRating(index, 'note', e.target.value)}
              placeholder="שם שחקן"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
            />
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={rating.rating || 0}
              onChange={(e) => updateRating(index, 'rating', parseFloat(e.target.value))}
              className="w-20 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm text-center"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeRating(index)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {ratings.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          אין ציוני שחקנים למשחק זה
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <Button variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button onClick={() => onSave(ratings)} className="bg-emerald-600 hover:bg-emerald-700">
          שמור שינויים
        </Button>
      </div>
    </div>
  );
}

// Training Guide Modal Component
function TrainingGuideModal({ action, matchOpponent, analysis, onClose }) {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t: gLangT } = useLang();
  const gIsHe = gLangT.lang === 'he';

  useEffect(() => {
    const cacheKey = action.focus;
    const cached = analysis?.training_guides?.[cacheKey];
    if (cached && !cached.error) {
      setGuide(cached);
      setLoading(false);
    } else {
      generateGuide();
    }
  }, [action]);

  const generateGuide = async () => {
    setLoading(true);
    try {
      const replyLang = gIsHe ? 'Hebrew' : 'English';
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an experienced football coach. Match against ${matchOpponent || 'opponent'}.

Main issue to work on: ${action.focus}
Suggested work direction: ${action.drill_suggestion}

Provide professional coaching direction at a diagnostic level — do NOT design specific drills.

Create a response in 3 parts:
1. Issue Analysis — deep explanation of why this problem occurs and its impact on the game
2. Main Work Direction — what to focus on with the team and why, what will tactically solve the problem
3. Key Points for Player Discussion — what to talk about, what to emphasize, and the central message

Write clearly and simply, no special characters or asterisks. Plain readable text. Reply in ${replyLang}.`,
        response_json_schema: {
          type: "object",
          properties: {
            focus_explanation: { type: "string" },
            main_drill: { type: "string" },
            mental_focus: { type: "string" }
          }
        }
      });
      const result = response?.__ai_error ? { error: response.__ai_error } : response;
      setGuide(result);
      if (!result.error && analysis?.id) {
        try {
          const existingGuides = analysis.training_guides || {};
          await base44.entities.MatchAnalysis.update(analysis.id, {
            training_guides: { ...existingGuides, [action.focus]: result }
          });
        } catch (e) { console.warn('Failed to cache training guide:', e); }
      }
    } catch (error) {
      console.error('Error generating guide:', error);
      setGuide({ error: 'שגיאה בהפקת ההנחיות. נסה שוב מאוחר יותר.' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="text-emerald-400">🎯</span>
            {gIsHe ? `כיוון עבודה: ${action.focus}` : `Work Direction: ${action.focus}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
            <span className="text-slate-400">{gIsHe ? 'מכינים הנחיות מדויקות...' : 'Preparing precise guidance...'}</span>
          </div>
        ) : guide?.error ? (
          <div className="text-center py-8">
            <p className="text-amber-400 font-semibold mb-1">⚠ {gIsHe ? 'השירות אינו זמין' : 'Service unavailable'}</p>
            <p className="text-slate-400 text-sm">{guide.error}</p>
          </div>
        ) : guide ? (
          <div className="space-y-5">
            {/* Focus Explanation */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-lg font-bold text-emerald-400">
                  {gIsHe ? 'ממוקד על הבעיה' : 'Problem Focus'}
                </h3>
              </div>
              <p className="text-slate-200 leading-relaxed text-[15px]">
                {guide.focus_explanation}
              </p>
            </div>

            {/* Work Direction */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-2xl">⚽</span>
                </div>
                <h3 className="text-lg font-bold text-blue-400">
                  {gIsHe ? 'כיוון עבודה מרכזי' : 'Main Work Direction'}
                </h3>
              </div>
              <div className="text-slate-200 leading-relaxed text-[15px] space-y-3">
                {(guide.main_drill || '').split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            {/* Mental Focus */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-lg font-bold text-purple-400">
                  {gIsHe ? 'דגשים מנטליים' : 'Mental Emphasis'}
                </h3>
              </div>
              <div className="text-slate-200 leading-relaxed text-[15px] space-y-3">
                {(guide.mental_focus || '').split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            {/* Action Details */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-slate-500">{gIsHe ? 'עדיפות: ' : 'Priority: '}</span>
                  <span className={`font-medium ${
                    action.priority === 'high' ? 'text-red-400' :
                    action.priority === 'medium' ? 'text-amber-400' :
                    'text-blue-400'
                  }`}>
                    {action.priority === 'high' ? (gIsHe ? 'גבוהה' : 'High') : action.priority === 'medium' ? (gIsHe ? 'בינונית' : 'Medium') : (gIsHe ? 'נמוכה' : 'Low')}
                  </span>
                </div>
                {action.target_date && (
                  <div className="text-sm">
                    <span className="text-slate-500">יעד: </span>
                    <span className="text-white font-medium">
                      {new Date(action.target_date).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            {gIsHe ? 'לא היתה אפשרות ליצור הנחיות' : 'Could not generate guidance'}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
          <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
            {gIsHe ? 'סגור' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Training Actions Form Component
function EditTrainingForm({ match, onSave, onCancel }) {
  const [actions, setActions] = useState(match.training_actions || []);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAction, setNewAction] = useState({
    focus: '',
    drill_suggestion: '',
    priority: 'medium',
    target_date: '',
    completed: false
  });

  // Get issues from the match report as suggestions
  const suggestedIssues = [
    ...(match.report?.issues || []),
    ...(match.phase_analysis?.buildup?.issues || []),
    ...(match.phase_analysis?.transitions?.attack?.issues || []),
    ...(match.phase_analysis?.transitions?.defense?.issues || []),
    ...(match.phase_analysis?.organized_defense?.issues || []),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 10);

  const addAction = () => {
    if (newAction.focus && newAction.drill_suggestion) {
      setActions([...actions, { ...newAction }]);
      setNewAction({
        focus: '',
        drill_suggestion: '',
        priority: 'medium',
        target_date: '',
        completed: false
      });
      setShowNewForm(false);
    }
  };

  const updateAction = (index, field, value) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const removeAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const toggleCompleted = (index) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setActions(updated);
  };

  return (
    <div className="space-y-4">
      {/* Help Text */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm text-slate-300">
        <p className="mb-1">💡 הגדר את נושאי העבודה שזוהו במשחק:</p>
        <ul className="text-xs text-slate-400 space-y-0.5 mr-4">
          <li>• בחר בעיה מהניתוח או הגדר דגש חדש</li>
          <li>• נסח את כיוון העבודה — על מה צריך לעבוד ולמה</li>
          <li>• קבע עדיפות ויעד זמן</li>
        </ul>
      </div>

      {/* Existing Actions */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {actions.map((action, index) => (
          <div key={index} className="p-3 rounded-lg bg-slate-800/70 border border-slate-700">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={action.completed || false}
                onChange={() => toggleCompleted(index)}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={action.focus}
                  onChange={(e) => updateAction(index, 'focus', e.target.value)}
                  placeholder="על מה עובדים?"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                />
                <textarea
                  value={action.drill_suggestion}
                  onChange={(e) => updateAction(index, 'drill_suggestion', e.target.value)}
                  placeholder="איך עובדים? (משחקונים, דגשים, שיחות...)"
                  rows={2}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm resize-none"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={action.priority}
                    onChange={(e) => updateAction(index, 'priority', e.target.value)}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                  >
                    <option value="high">עדיפות גבוהה</option>
                    <option value="medium">עדיפות בינונית</option>
                    <option value="low">עדיפות נמוכה</option>
                  </select>
                  <input
                    type="date"
                    value={action.target_date || ''}
                    onChange={(e) => updateAction(index, 'target_date', e.target.value)}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAction(index)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Action Form */}
      {showNewForm ? (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-emerald-500/30 space-y-3">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">בעיה/דגש לעבודה</label>
            {suggestedIssues.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {suggestedIssues.slice(0, 5).map((issue, i) => (
                  <button
                    key={i}
                    onClick={() => setNewAction({ ...newAction, focus: issue })}
                    className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    {issue.substring(0, 40)}...
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={newAction.focus}
              onChange={(e) => setNewAction({ ...newAction, focus: e.target.value })}
              placeholder="לדוגמה: לחץ על המגן, קבלת החלטות בשליש האחרון"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-slate-400">כיוון העבודה</label>
            <textarea
              value={newAction.drill_suggestion}
              onChange={(e) => setNewAction({ ...newAction, drill_suggestion: e.target.value })}
              placeholder="לדוגמה: עבודה על קבלת החלטות מהירה תחת לחץ, שיפור התיאום בין קווים, שיחה קבוצתית על תזמון..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={newAction.priority}
              onChange={(e) => setNewAction({ ...newAction, priority: e.target.value })}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
            >
              <option value="high">עדיפות גבוהה</option>
              <option value="medium">עדיפות בינונית</option>
              <option value="low">עדיפות נמוכה</option>
            </select>
            <input
              type="date"
              value={newAction.target_date}
              onChange={(e) => setNewAction({ ...newAction, target_date: e.target.value })}
              placeholder="יעד זמן"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
              ביטול
            </Button>
            <Button size="sm" onClick={addAction} className="bg-emerald-600 hover:bg-emerald-700">
              הוסף
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowNewForm(true)}
          variant="outline"
          className="w-full border-dashed border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף נושא עבודה
        </Button>
      )}

      {actions.length === 0 && !showNewForm && (
        <div className="text-center py-8 text-slate-500">
          טרם הוגדרו פעולות אימון
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <Button variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button onClick={() => onSave(actions)} className="bg-emerald-600 hover:bg-emerald-700">
          שמור שינויים
        </Button>
      </div>
    </div>
  );
}