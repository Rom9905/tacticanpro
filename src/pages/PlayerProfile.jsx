import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,

  Target,
  Edit3,
  Plus,
  Zap,
  Shield,
  FileText,
  Star,
  Calendar,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TrainingProgramCard from '../components/training/TrainingProgramCard';
import TrainingProgramModal from '../components/training/TrainingProgramModal';
import PlayerDecisionProfile from '../components/player/PlayerDecisionProfile';
import ProgramReviewDialog from '../components/training/ProgramReviewDialog';
import TrainingHistory from '../components/training/TrainingHistory';
import SkillRatingsEditor from '../components/comparison/SkillRatingsEditor';
import PlayerReportModal from '../components/player/PlayerReportModal';
import PlayerPhotoUpload from '../components/player/PlayerPhotoUpload';
import CoachNotesEditor from '../components/player/CoachNotesEditor';
import EditProgramModal from '../components/training/EditProgramModal';
import ProfessionalTipsModal from '../components/player/ProfessionalTipsModal';
import BottomLine from '../components/ui/BottomLine';
import { useGameStyle } from '../hooks/useGameStyle';

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

export default function PlayerProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get('id');

  const [player, setPlayer] = useState(null);
  const [trainingProgram, setTrainingProgram] = useState(null);
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditStats, setShowEditStats] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingProgram, setGeneratingProgram] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showEditProgram, setShowEditProgram] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  const queryClient = useQueryClient();

  const [editedStats, setEditedStats] = useState({ goals: 0, assists: 0, games: 0, minutes: 0 });

  // Load team game style for player fit analysis
  const { gameStyle, gameStyleNotes } = useGameStyle(player?.team_id);

  // Add match: pick from existing analyses or free form
  const [existingAnalyses, setExistingAnalyses] = useState([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');
  const [matchMode, setMatchMode] = useState('existing'); // 'existing' | 'new'
  const [newMatch, setNewMatch] = useState({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    focus_appeared: false,
    note: '',
    trend: 'ללא שינוי',
    goals: 0,
    assists: 0,
    rating: '',
    match_id: '',
  });

  const { data: decisionProfile } = useQuery({
    queryKey: ['decisionProfile', playerId],
    queryFn: async () => {
      const profiles = await base44.entities.PlayerDecisionProfile.filter({ player_id: playerId });
      return profiles[0] || null;
    },
    enabled: !!playerId,
  });

  const { data: situations = [] } = useQuery({
    queryKey: ['situations', player?.team_id],
    queryFn: () => base44.entities.KeyMatchSituation.filter({ team_id: player.team_id }),
    enabled: !!player?.team_id,
  });

  const { data: matchAnalyses = [] } = useQuery({
    queryKey: ['matchAnalyses', player?.team_id],
    queryFn: () => base44.entities.MatchAnalysis.filter({ team_id: player.team_id }, '-date', 50),
    enabled: !!player?.team_id,
  });

  const { data: programOutcomes = [] } = useQuery({
    queryKey: ['programOutcomes', playerId],
    queryFn: () => base44.entities.ProgramOutcome.filter({ player_id: playerId }, '-completion_date'),
    enabled: !!playerId,
  });

  const { data: programReviews = [] } = useQuery({
    queryKey: ['programReviews', playerId],
    queryFn: () => base44.entities.TrainingProgramReview.filter({ player_id: playerId }),
    enabled: !!playerId,
  });

  const { data: trainingEvaluations = [] } = useQuery({
    queryKey: ['trainingEvaluations', playerId],
    queryFn: () => base44.entities.TrainingSessionEvaluation.filter({ player_id: playerId }, '-training_date', 10),
    enabled: !!playerId,
  });

  useEffect(() => {
    if (playerId) {
      loadPlayer();
      import('@/hooks/useAnalytics').then(m => m.trackEvent('open_player_profile', { player_id: playerId }));
    }
  }, [playerId]);

  const loadPlayer = async () => {
    setLoading(true);
    const players = await base44.entities.Player.filter({ id: playerId });
    const found = players[0];
    setPlayer(found);
    if (found) {
      setEditedStats({
        goals: found.season_goals || 0,
        assists: found.season_assists || 0,
        games: found.games_played || 0,
        minutes: found.minutes_played || 0,
      });
      const [programs, analyses, allTeamPlayers] = await Promise.all([
        base44.entities.TrainingProgram.filter({ player_id: found.id, status: 'active' }),
        base44.entities.MatchAnalysis.filter({ team_id: found.team_id }, '-date', 50),
        base44.entities.Player.filter({ team_id: found.team_id }),
      ]);
      const activeProgram = programs[0];
      setTrainingProgram(activeProgram || null);
      setExistingAnalyses(analyses);
      setTeamPlayers(allTeamPlayers);
      if (activeProgram?.drills?.length > 0) {
        const allDrills = await base44.entities.DrillLibrary.list();
        setDrills(activeProgram.drills.map(pd => allDrills.find(d => d.id === pd.drill_id)).filter(Boolean));
      }
    }
    setLoading(false);
  };

  const handleSaveStats = async () => {
    await base44.entities.Player.update(playerId, {
      season_goals: editedStats.goals,
      season_assists: editedStats.assists,
      games_played: editedStats.games,
      minutes_played: editedStats.minutes,
    });
    loadPlayer();
    setShowEditStats(false);
  };

  const handleAddMatch = async () => {
    let matchEntry = { ...newMatch, rating: newMatch.rating ? parseFloat(newMatch.rating) : null };

    if (matchMode === 'existing' && selectedAnalysisId) {
      const analysis = existingAnalyses.find(a => a.id === selectedAnalysisId);
      if (analysis) {
        matchEntry = {
          ...matchEntry,
          opponent: analysis.opponent,
          date: analysis.date,
          match_id: analysis.id,
        };
        // Update the analysis player_ratings with the new rating/note
        const existingRatings = analysis.player_ratings || [];
        const existingIdx = existingRatings.findIndex(r => r.player_id === playerId);
        let updatedRatings;
        if (existingIdx >= 0) {
          updatedRatings = existingRatings.map((r, i) =>
            i === existingIdx
              ? { ...r, rating: matchEntry.rating ? parseFloat(matchEntry.rating) : r.rating, note: matchEntry.note || r.note }
              : r
          );
        } else {
          updatedRatings = [...existingRatings, {
            player_id: playerId,
            rating: matchEntry.rating ? parseFloat(matchEntry.rating) : undefined,
            note: matchEntry.note || '',
          }];
        }
        await base44.entities.MatchAnalysis.update(selectedAnalysisId, { player_ratings: updatedRatings });
      }
    }

    // Replace an existing entry for the same match instead of duplicating it
    const existingHistory = player.match_history || [];
    const dupIdx = matchEntry.match_id
      ? existingHistory.findIndex(h => h.match_id === matchEntry.match_id)
      : -1;
    const updatedHistory = dupIdx >= 0
      ? existingHistory.map((h, i) => (i === dupIdx ? { ...h, ...matchEntry } : h))
      : [...existingHistory, matchEntry];
    await base44.entities.Player.update(playerId, {
      match_history: updatedHistory,
      season_goals: (player.season_goals || 0) + (matchEntry.goals || 0),
      season_assists: (player.season_assists || 0) + (matchEntry.assists || 0),
    });

    // Trigger AI attribute evaluation every 5th match
    if (updatedHistory.length >= 5 && updatedHistory.length % 5 === 0) {
      supabase.functions.invoke('evaluate-player-attributes', {
        body: { player_id: playerId },
      }).then(({ data }) => {
        if (data?.adjusted) {
          setAiInsight(data);
          loadPlayer();
        }
      }).catch(e => console.warn('AI evaluation failed:', e));
    }

    loadPlayer();
    setShowAddMatch(false);
    setSelectedAnalysisId('');
    setMatchMode('existing');
    setNewMatch({
      opponent: '', date: new Date().toISOString().split('T')[0],
      focus_appeared: false, note: '', trend: 'ללא שינוי', goals: 0, assists: 0, rating: '', match_id: '',
    });
  };

  const handleSaveNote = async (analysisId) => {
    setSavingNote(true);
    const analysis = existingAnalyses.find(a => a.id === analysisId);
    if (analysis) {
      const updatedRatings = (analysis.player_ratings || []).map(r =>
        r.player_id === playerId ? { ...r, note: editingNoteText } : r
      );
      await base44.entities.MatchAnalysis.update(analysisId, { player_ratings: updatedRatings });
      await loadPlayer();
    }
    setSavingNote(false);
    setEditingNoteId(null);
  };

  if (loading || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EFE6' }}>
        <div style={{ color: '#7A6B57' }}>טוען...</div>
      </div>
    );
  }

  const statusConfig = {
    'בהתקדמות': { icon: TrendingUp, color: '#2A7050', bg: 'rgba(42,112,80,0.1)', border: 'rgba(42,112,80,0.3)' },
    'יציב': { icon: Minus, color: '#2A5FA8', bg: 'rgba(41,95,168,0.1)', border: 'rgba(41,95,168,0.3)' },
    'בירידה': { icon: TrendingDown, color: '#B94040', bg: 'rgba(185,64,64,0.1)', border: 'rgba(185,64,64,0.3)' },
  };
  const currentStatus = statusConfig[player.professional_status || 'יציב'];
  const StatusIcon = currentStatus.icon;

  const recentMatches = (player.match_history || []).slice(-5).reverse();

  // Get ratings from matchAnalyses for this player — include DNP entries for display, mark them
  const playerRatingsFromAnalyses = matchAnalyses
    .map(a => {
      const r = a.player_ratings?.find(r => r.player_id === playerId);
      if (!r) return null;
      return { opponent: a.opponent, date: a.date, rating: r.did_not_play ? null : r.rating, note: r.did_not_play ? null : r.note, did_not_play: !!r.did_not_play, id: a.id };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const avgRating = playerRatingsFromAnalyses.filter(r => r.rating).length > 0
    ? (playerRatingsFromAnalyses.filter(r => r.rating).reduce((s, r) => s + r.rating, 0) / playerRatingsFromAnalyses.filter(r => r.rating).length).toFixed(1)
    : null;

  // Count total games played from all analyses (where player has rating and did NOT have did_not_play)
  const gamesPlayedFromAnalyses = matchAnalyses.filter(a =>
    a.player_ratings?.some(r => r.player_id === playerId && !r.did_not_play && r.rating)
  ).length;

  const availabilityColors = {
    'זמין': { bg: 'rgba(42,112,80,0.1)', color: '#2A7050', border: 'rgba(42,112,80,0.3)' },
    'פצוע': { bg: 'rgba(185,64,64,0.1)', color: '#B94040', border: 'rgba(185,64,64,0.3)' },
    'מושעה': { bg: 'rgba(180,140,30,0.1)', color: '#9A6A10', border: 'rgba(180,140,30,0.3)' },
    'לא זמין': { bg: 'rgba(139,115,85,0.1)', color: '#7A6B57', border: 'rgba(139,115,85,0.25)' },
  };
  const avail = availabilityColors[player.availability] || availabilityColors['זמין'];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen"
      style={{ backgroundColor: '#F4EFE6' }}
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto px-4 py-5 pb-16">

        {/* ── Back + Compare ── */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => window.location.href = createPageUrl('Home') + '?view=team'}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: '#7A6B57' }}
          >
            <ArrowRight className="w-4 h-4" />
            חזור לניהול הקבוצה
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.location.href = `/?view=team&tab=comparison&preselect=${encodeURIComponent(playerId)}`; }}
            style={{ borderColor: 'rgba(139,115,85,0.3)', color: '#5C4E38', fontSize: '0.8rem' }}
          >
            השווה לשחקנים אחרים
          </Button>
        </div>

        {/* ── AI Insight Notification ── */}
        <AnimatePresence>
          {aiInsight && aiInsight.adjusted && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="rounded-2xl p-4 mb-5 relative"
              style={{ backgroundColor: '#F0FDF4', border: '1px solid rgba(74,222,128,0.3)' }}
            >
              <button
                onClick={() => setAiInsight(null)}
                className="absolute top-3 left-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 flex-shrink-0" style={{ backgroundColor: 'rgba(74,222,128,0.2)' }}>
                  <Sparkles className="w-5 h-5" style={{ color: '#16A34A' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm mb-1" style={{ color: '#15803D' }}>
                    הערכת AI — עדכון יכולות
                  </h4>
                  <p className="text-sm mb-3" style={{ color: '#166534' }}>
                    {aiInsight.summary}
                  </p>
                  <div className="space-y-1.5">
                    {aiInsight.adjustments?.map((adj, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm" style={{ color: '#1E3A2F' }}>
                        <span
                          className="font-bold text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: adj.change > 0 ? 'rgba(74,222,128,0.2)' : 'rgba(245,158,11,0.2)',
                            color: adj.change > 0 ? '#16A34A' : '#D97706',
                          }}
                        >
                          {adj.change > 0 ? '↑' : '↓'} {adj.old_value} → {adj.new_value}
                        </span>
                        <span className="font-medium">{adj.attribute_name}</span>
                        <span style={{ color: '#4B5563' }}>— {adj.reasoning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Player Header ── */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Photo */}
            {player.photo_url && (
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                style={{ border: '2px solid rgba(139,115,85,0.20)' }}>
                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-bold" style={{ color: '#2C2416' }}>
                  {player.number ? `#${player.number} ` : ''}{player.name}
                </h1>
                {/* Status */}
                <span
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: currentStatus.bg, color: currentStatus.color, border: `1px solid ${currentStatus.border}` }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {player.professional_status || 'יציב'}
                </span>
                {/* Availability */}
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: avail.bg, color: avail.color, border: `1px solid ${avail.border}` }}
                >
                  {player.availability || 'זמין'}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm" style={{ color: '#7A6B57' }}>
                <span>{player.position}</span>
                {player.role && <span>• {player.role}</span>}
                {player.dominant_foot && <span>• רגל {player.dominant_foot}</span>}
                {player.squad_status && (
                  <span className="px-2 py-0 rounded-full text-xs" style={{ backgroundColor: 'rgba(139,115,85,0.1)', color: '#5C4E38' }}>
                    {player.squad_status}
                  </span>
                )}
              </div>
            </div>
            {/* Report button */}
            <Button
              onClick={() => setShowReportModal(true)}
              className="gap-2 shrink-0"
              style={{ backgroundColor: '#2A7050', color: '#fff', fontWeight: 600 }}
            >
              <FileText className="w-4 h-4" />
              דוח שחקן
            </Button>
          </div>
        </div>

        {/* ── Bottom Line — AI Insight ── */}
        <div className="mb-5">
          <BottomLine
            dataForAI={{
              name: player.name,
              position: player.position,
              role: player.role,
              professional_status: player.professional_status,
              availability: player.availability,
              strengths: player.strengths,
              improvements: player.improvements,
              season_goals: player.season_goals,
              season_assists: player.season_assists,
              games_played: player.games_played,
              recent_match_trends: (player.match_history || []).slice(-5).map(m => m.trend),
              active_program_focus: trainingProgram?.focus_title,
              avg_rating: avgRating,
              recent_training_ratings: trainingEvaluations.slice(0, 3).map(e => e.rating),
            }}
            context="פרופיל שחקן כדורגל"
            cacheKey={`player-${player.id}-${player.updated_date}`}
            color={player.professional_status === 'בירידה' ? '#B94040' : player.professional_status === 'בהתקדמות' ? '#2A7050' : '#2A5FA8'}
            gameStyle={gameStyle}
            gameStyleNotes={gameStyleNotes}
          />
        </div>

        {/* ── Photo Upload ── */}
        <div className="mb-5">
          <PlayerPhotoUpload player={player} onUpdate={loadPlayer} />
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'משחקים', value: Math.max(player.games_played || 0, gamesPlayedFromAnalyses), color: '#2C2416' },
            { label: 'גולים', value: player.season_goals || 0, color: '#2A7050' },
            { label: 'בישולים', value: player.season_assists || 0, color: '#2A5FA8' },
            { label: 'דקות', value: player.minutes_played || 0, color: '#7A4FA0' },
          ].map(kpi => (
            <div
              key={kpi.label}
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}
            >
              <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#9A8672' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* ── Extra KPIs: avg rating, trend ── */}
        {(avgRating || player.match_history?.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {avgRating && (
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}>
                <div className="text-2xl font-bold" style={{ color: '#9A6A10' }}>{avgRating}</div>
                <div className="text-xs mt-0.5" style={{ color: '#9A8672' }}>ציון ממוצע</div>
              </div>
            )}
            {player.match_history?.length > 0 && (
              <>
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}>
                  <div className="text-2xl font-bold" style={{ color: '#2A7050' }}>
                    {player.match_history.filter(m => m.trend === 'התקדמות').length}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#9A8672' }}>משחקים בהתקדמות</div>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}>
                  <div className="text-2xl font-bold" style={{ color: '#5C4E38' }}>
                    {((player.match_history.filter(m => m.focus_appeared).length / player.match_history.length) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#9A8672' }}>הופעת פוקוס</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Skill Ratings ── */}
        <div className="mb-5">
          <SkillRatingsEditor
            player={player}
            onUpdate={(updatedRatings) => setPlayer(prev => ({ ...prev, skill_ratings: updatedRatings }))}
          />
        </div>

        {/* ── Coach Professional Notes ── */}
        <CoachNotesEditor player={player} onUpdate={loadPlayer} />

        {/* ── Strengths & Improvements ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" style={{ color: '#2A7050' }} />
              <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>חוזקות</span>
            </div>
            {player.strengths?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {player.strengths.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(42,112,80,0.1)', color: '#2A7050', border: '1px solid rgba(42,112,80,0.25)' }}>
                    {s}
                  </span>
                ))}
              </div>
            ) : <p className="text-xs" style={{ color: '#9A8672' }}>לא הוגדרו</p>}
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: '#9A6A10' }} />
              <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>נקודות לשיפור</span>
            </div>
            {player.improvements?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {player.improvements.map((imp, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(180,140,30,0.1)', color: '#9A6A10', border: '1px solid rgba(180,140,30,0.25)' }}>
                    {imp}
                  </span>
                ))}
              </div>
            ) : <p className="text-xs" style={{ color: '#9A8672' }}>לא הוגדרו</p>}
          </div>
        </div>

        {/* ── Training Program ── */}
        {trainingProgram ? (
          <div
            className="rounded-xl p-5 mb-5"
            style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(122,79,160,0.25)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: '#7A4FA0' }} />
                <span className="font-semibold text-sm" style={{ color: '#7A4FA0' }}>תוכנית אישית פעילה</span>
              </div>
            </div>
            <h4 className="font-bold mb-3" style={{ color: '#2C2416' }}>{trainingProgram.focus_title}</h4>
            
            {/* Work Topics */}
            {trainingProgram.work_topics && trainingProgram.work_topics.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2" style={{ color: '#7A6B57' }}>נושאי עבודה:</p>
                <div className="space-y-1">
                  {trainingProgram.work_topics.map((topic, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm" style={{ color: '#5C4E38' }}>
                      <span style={{ color: '#2A7050' }}>•</span>
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Development Trend — replaces progress bar */}
            {(() => {
              const evals = trainingEvaluations || [];
              let trendLabel = 'עדיין לא עקבי';
              let TIcon = Minus;
              let tColor = '#9A8672';
              if (evals.length >= 2) {
                const avgR = (evals[0].rating + evals[1].rating) / 2;
                const avgO = evals.length >= 4 ? (evals[2].rating + evals[3].rating) / 2 : avgR;
                if (avgR > avgO + 0.5) { trendLabel = '↑ שיפור יציב'; TIcon = TrendingUp; tColor = '#2A7050'; }
                else if (avgR < avgO - 0.5) { trendLabel = '↓ דורש עבודה'; TIcon = TrendingDown; tColor = '#B94040'; }
                else { trendLabel = '→ יציב'; tColor = '#2A5FA8'; }
              }
              return (
                <div className="flex items-center gap-3 p-3 rounded-lg mb-1"
                  style={{ backgroundColor: `${tColor}12`, border: `1px solid ${tColor}30` }}>
                  <TIcon className="w-4 h-4 flex-shrink-0" style={{ color: tColor }} />
                  <div>
                    <p className="text-xs" style={{ color: '#9A8672' }}>מגמת התפתחות</p>
                    <p className="text-sm font-bold" style={{ color: tColor }}>{trendLabel}</p>
                  </div>
                </div>
              );
            })()}
            
            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => setShowProgramModal(true)}
                variant="outline"
                size="sm"
                className="flex-1"
                style={{ borderColor: 'rgba(122,79,160,0.3)', color: '#7A4FA0' }}
              >
                פרטי התוכנית
              </Button>
              <Button
                onClick={() => setShowEditProgram(true)}
                variant="outline"
                size="sm"
                style={{ borderColor: 'rgba(139,115,85,0.3)', color: '#7A6B57' }}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-5 mb-5 text-center" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}>
            <Target className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8BFB3' }} />
            <p className="text-sm font-medium mb-1" style={{ color: '#2C2416' }}>אין תוכנית אישית פעילה</p>
            <p className="text-xs mb-4" style={{ color: '#9A8672' }}>צור תוכנית מותאמת אישית לשחקן</p>
            {player?.improvements?.length > 0 ? (
              <Button
                onClick={async (e) => {
                  e.stopPropagation();
                  setGeneratingProgram(true);
                  try {
                    const workTopics = player.improvements.slice(0, 4);
                    await base44.entities.TrainingProgram.create({
                      team_id: player.team_id,
                      player_id: player.id,
                      status: 'active',
                      focus_title: `פיתוח אישי - ${player.name}`,
                      work_topics: workTopics,
                      progress_percentage: 0,
                      goal_statement: `שיפור ${workTopics.join(', ')}`,
                      ai_generated: true,
                      ai_rationale: 'נוצר על בסיס נקודות השיפור של השחקן'
                    });
                    loadPlayer();
                  } catch (error) { console.error(error); }
                  setGeneratingProgram(false);
                }}
                disabled={generatingProgram}
                style={{ backgroundColor: '#7A4FA0', color: '#fff' }}
              >
                <Plus className="w-4 h-4 ml-1" />
                {generatingProgram ? 'יוצר...' : 'צור תוכנית אישית'}
              </Button>
            ) : (
              <p className="text-xs" style={{ color: '#9A6A10' }}>הגדר נקודות לשיפור לפני יצירת תוכנית</p>
            )}
          </div>
        )}

        {/* ── Professional Tips ── */}
        {(() => {
          const tips = [];
          
          // Based on work topics in active program
          if (trainingProgram?.work_topics?.length > 0) {
            trainingProgram.work_topics.slice(0, 3).forEach(topic => {
              tips.push(`לעבוד על ${topic} באימונים הקבוצתיים`);
            });
          } else if (player.improvements?.length > 0) {
            player.improvements.slice(0, 3).forEach(imp => {
              tips.push(`לעבוד על ${imp} באימונים הקבוצתיים`);
            });
          }
          
          // Based on recent match trends
          const recentTrends = (player.match_history || []).slice(-3);
          const declines = recentTrends.filter(m => m.trend === 'ירידה').length;
          if (declines >= 2) {
            tips.push('להתמקד בשיפור הביטחון העצמי באימונים');
          }
          
          // Based on coach notes
          if (player.coach_professional_notes?.includes('לחץ')) {
            tips.push('לשפר קבלת החלטות תחת לחץ במצבי משחק');
          }
          
          // Based on training evaluations
          const recentEvals = trainingEvaluations.slice(0, 3);
          const lowRatings = recentEvals.filter(e => e.rating < 6).length;
          if (lowRatings >= 2) {
            tips.push('שיפור מוטיבציה והתמדה באימונים');
          }
          
          return tips.length > 0 ? (
            <button
              onClick={() => setShowTipsModal(true)}
              className="w-full rounded-xl p-5 mb-5 text-right hover:shadow-md transition-all"
              style={{ backgroundColor: 'rgba(42,112,80,0.06)', border: '1px solid rgba(42,112,80,0.20)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: '#2A7050' }} />
                  <span className="font-semibold text-sm" style={{ color: '#2A7050' }}>טיפים מקצועיים לשיפור</span>
                </div>
                <ArrowRight className="w-4 h-4" style={{ color: '#2A7050' }} />
              </div>
              <div className="space-y-2">
                {tips.slice(0, 3).map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm" style={{ color: '#2C2416' }}>
                    <span style={{ color: '#2A7050' }}>✓</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
              {tips.length > 3 && (
                <p className="text-xs mt-2" style={{ color: '#7A6B57' }}>לחץ לטיפים נוספים ופירוט...</p>
              )}
            </button>
          ) : null;
        })()}



        {/* ── Training Evaluations ── */}
        {trainingEvaluations.length > 0 && (
          <div className="rounded-xl mb-5"
            style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(139,115,85,0.12)' }}>
              <Star className="w-4 h-4" style={{ color: '#9A6A10' }} />
              <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>הערכות אימונים אחרונות</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(139,115,85,0.08)' }}>
              {trainingEvaluations.slice(0, 5).map((evaluation, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: '#2C2416' }}>
                      {new Date(evaluation.training_date).toLocaleDateString('he-IL')}
                    </div>
                    {evaluation.coach_note && (
                      <div className="text-xs mt-0.5" style={{ color: '#7A6B57' }}>{evaluation.coach_note}</div>
                    )}
                    {evaluation.improvement_observed && (
                      <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#2A7050' }}>
                        <CheckCircle2 className="w-3 h-3" /> נצפה שיפור
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold"
                      style={{ color: evaluation.rating >= 7 ? '#2A7050' : evaluation.rating >= 5 ? '#9A6A10' : '#B94040' }}>
                      {evaluation.rating}
                    </span>
                    <span className="text-xs" style={{ color: '#9A8672' }}>/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Training History ── */}
        <div className="mb-5">
          <TrainingHistory outcomes={programOutcomes} reviews={programReviews} />
        </div>

        {/* ── Last 5 Matches ── */}
        <div
          className="rounded-xl mb-5"
          style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.16)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(139,115,85,0.12)' }}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: '#2A7050' }} />
              <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>5 משחקים אחרונים</span>
              {avgRating && (
                <span className="px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: 'rgba(180,140,30,0.1)', color: '#9A6A10', border: '1px solid rgba(180,140,30,0.25)' }}>
                  ממוצע {avgRating}/10
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddMatch(true)}
              style={{ backgroundColor: '#2A7050', color: '#fff', fontSize: '0.75rem', padding: '4px 12px' }}
            >
              <Plus className="w-3 h-3 ml-1" />
              הוסף
            </Button>
          </div>

          {/* Ratings from analyses */}
          {playerRatingsFromAnalyses.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'rgba(139,115,85,0.08)' }}>
              {playerRatingsFromAnalyses.map((r, i) => (
                <div key={i} className="px-5 py-3" style={{
                  backgroundColor: r.did_not_play ? 'rgba(139,115,85,0.06)' : 'transparent',
                  opacity: r.did_not_play ? 0.75 : 1
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: '#2C2416' }}>מול {r.opponent}</div>
                      <div className="text-xs" style={{ color: '#9A8672' }}>{new Date(r.date).toLocaleDateString('he-IL')}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.did_not_play ? (
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ backgroundColor: '#F1EEE8', color: '#7D766B', border: '1px solid rgba(139,115,85,0.2)' }}
                        >
                          לא שותף
                        </span>
                      ) : (
                        <>
                          {r.rating && (
                            <span className="text-lg font-bold" style={{ color: r.rating >= 7 ? '#2A7050' : r.rating >= 5 ? '#9A6A10' : '#B94040' }}>
                              {r.rating}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              if (editingNoteId === r.id) {
                                setEditingNoteId(null);
                              } else {
                                setEditingNoteId(r.id);
                                setEditingNoteText(r.note || '');
                              }
                            }}
                            className="p-1 rounded transition-colors"
                            style={{ color: editingNoteId === r.id ? '#2A7050' : '#9A8672' }}
                            title="ערוך הערה"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Note display / edit — only for played matches */}
                  {!r.did_not_play && (
                    editingNoteId === r.id ? (
                      <div className="mt-2 flex gap-2 items-end">
                        <Textarea
                          value={editingNoteText}
                          onChange={e => setEditingNoteText(e.target.value)}
                          rows={2}
                          placeholder="הערת מאמן..."
                          className="text-xs flex-1"
                          style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416', resize: 'none' }}
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleSaveNote(r.id)}
                            disabled={savingNote}
                            className="p-1 rounded"
                            style={{ color: '#2A7050' }}
                            title="שמור"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="p-1 rounded"
                            style={{ color: '#B94040' }}
                            title="בטל"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : r.note ? (
                      <div className="text-xs mt-1" style={{ color: '#7A6B57' }}>{r.note}</div>
                    ) : (
                      <button
                        onClick={() => { setEditingNoteId(r.id); setEditingNoteText(''); }}
                        className="text-xs mt-1 transition-colors"
                        style={{ color: '#C8BFB3' }}
                      >
                        + הוסף הערה
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          ) : recentMatches.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'rgba(139,115,85,0.08)' }}>
              {recentMatches.map((match, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#2C2416' }}>מול {match.opponent || '?'}</div>
                    <div className="text-xs" style={{ color: '#9A8672' }}>{match.date}</div>
                    {match.note && <div className="text-xs mt-0.5" style={{ color: '#7A6B57' }}>{match.note}</div>}
                    {(match.goals > 0 || match.assists > 0) && (
                      <div className="flex gap-2 mt-0.5 text-xs" style={{ color: '#7A6B57' }}>
                        {match.goals > 0 && <span>⚽ {match.goals}</span>}
                        {match.assists > 0 && <span>🎯 {match.assists}</span>}
                      </div>
                    )}
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: match.trend === 'התקדמות' ? 'rgba(42,112,80,0.1)' : match.trend === 'ירידה' ? 'rgba(185,64,64,0.1)' : 'rgba(139,115,85,0.1)',
                      color: match.trend === 'התקדמות' ? '#2A7050' : match.trend === 'ירידה' ? '#B94040' : '#7A6B57',
                    }}
                  >
                    {match.trend || 'ללא שינוי'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: '#9A8672' }}>אין משחקים רשומים</p>
            </div>
          )}
        </div>

        {/* ── Edit Stats Dialog ── */}
        <Dialog open={showEditStats} onOpenChange={setShowEditStats}>
          <DialogContent style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }} dir="rtl">
            <DialogHeader>
              <DialogTitle style={{ color: '#2C2416' }}>עדכון סטטיסטיקה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {[
                { key: 'goals', label: 'גולים עונתיים' },
                { key: 'assists', label: 'בישולים עונתיים' },
                { key: 'games', label: 'משחקים ששוחקו' },
                { key: 'minutes', label: 'דקות משחק' },
              ].map(f => (
                <div key={f.key}>
                  <Label style={{ color: '#5C4E38' }}>{f.label}</Label>
                  <Input
                    type="number" min="0"
                    value={editedStats[f.key]}
                    onChange={(e) => setEditedStats(prev => ({ ...prev, [f.key]: parseInt(e.target.value) || 0 }))}
                    style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowEditStats(false)} style={{ color: '#7A6B57' }}>ביטול</Button>
                <Button onClick={handleSaveStats} style={{ backgroundColor: '#2A7050', color: '#fff' }}>שמור</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Add Match Dialog ── */}
        <Dialog open={showAddMatch} onOpenChange={setShowAddMatch}>
          <DialogContent
            className="max-w-md max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }}
            dir="rtl"
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#2C2416' }}>הוספת משחק</DialogTitle>
            </DialogHeader>

            {/* Toggle */}
            <div className="flex rounded-lg overflow-hidden mb-4" style={{ border: '1px solid rgba(139,115,85,0.25)' }}>
              {[{ v: 'existing', label: 'בחר ממשחקים קיימים' }, { v: 'new', label: 'הוסף ידנית' }].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setMatchMode(opt.v)}
                  className="flex-1 py-2 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: matchMode === opt.v ? '#2A7050' : 'transparent',
                    color: matchMode === opt.v ? '#fff' : '#7A6B57',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {matchMode === 'existing' && (
              <div className="space-y-4">
                <div>
                  <Label style={{ color: '#5C4E38' }}>בחר משחק</Label>
                  <Select value={selectedAnalysisId} onValueChange={(v) => {
                    setSelectedAnalysisId(v);
                    const a = existingAnalyses.find(x => x.id === v);
                    if (a) setNewMatch(prev => ({ ...prev, opponent: a.opponent, date: a.date, match_id: a.id }));
                  }}>
                    <SelectTrigger style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}>
                      <SelectValue placeholder="בחר משחק..." />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}>
                      {existingAnalyses.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.opponent} — {new Date(a.date).toLocaleDateString('he-IL')}
                          {a.player_ratings?.some(r => r.player_id === playerId) ? ' ✓' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAnalysisId && (() => {
                  const a = existingAnalyses.find(x => x.id === selectedAnalysisId);
                  const existing = a?.player_ratings?.find(r => r.player_id === playerId);
                  return (
                    <div className="rounded-lg p-3" style={{ backgroundColor: '#EDE8DF', border: '1px solid rgba(139,115,85,0.2)' }}>
                      {existing ? (
                        <div className="text-xs mb-2" style={{ color: '#9A6A10' }}>
                          ✏️ קיים ציון: {existing.rating || '—'} | הערה: {existing.note || '—'}. ניתן לשנות:
                        </div>
                      ) : (
                        <div className="text-xs mb-2" style={{ color: '#7A6B57' }}>הוסף ציון והערה למשחק זה:</div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs" style={{ color: '#5C4E38' }}>ציון (1–10)</Label>
                          <Input type="number" min="1" max="10" step="0.5"
                            value={newMatch.rating}
                            onChange={e => setNewMatch(p => ({ ...p, rating: e.target.value }))}
                            style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs" style={{ color: '#5C4E38' }}>מגמה</Label>
                          <Select value={newMatch.trend} onValueChange={v => setNewMatch(p => ({ ...p, trend: v }))}>
                            <SelectTrigger style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}>
                              <SelectItem value="התקדמות">התקדמות</SelectItem>
                              <SelectItem value="ללא שינוי">ללא שינוי</SelectItem>
                              <SelectItem value="ירידה">ירידה</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs" style={{ color: '#5C4E38' }}>הערה</Label>
                        <Textarea value={newMatch.note} onChange={e => setNewMatch(p => ({ ...p, note: e.target.value }))}
                          rows={2} placeholder="הוסף הערה..."
                          style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {matchMode === 'new' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label style={{ color: '#5C4E38' }}>יריבה</Label>
                    <Input value={newMatch.opponent} onChange={e => setNewMatch(p => ({ ...p, opponent: e.target.value }))}
                      style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }} />
                  </div>
                  <div>
                    <Label style={{ color: '#5C4E38' }}>תאריך</Label>
                    <Input type="date" value={newMatch.date} onChange={e => setNewMatch(p => ({ ...p, date: e.target.value }))}
                      style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label style={{ color: '#5C4E38' }}>גולים</Label>
                    <Input type="number" min="0" value={newMatch.goals} onChange={e => setNewMatch(p => ({ ...p, goals: parseInt(e.target.value) || 0 }))}
                      style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }} />
                  </div>
                  <div>
                    <Label style={{ color: '#5C4E38' }}>בישולים</Label>
                    <Input type="number" min="0" value={newMatch.assists} onChange={e => setNewMatch(p => ({ ...p, assists: parseInt(e.target.value) || 0 }))}
                      style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }} />
                  </div>
                  <div>
                    <Label style={{ color: '#5C4E38' }}>ציון (1–10)</Label>
                    <Input type="number" min="1" max="10" step="0.5" value={newMatch.rating} onChange={e => setNewMatch(p => ({ ...p, rating: e.target.value }))}
                      style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }} />
                  </div>
                </div>
                <div>
                  <Label style={{ color: '#5C4E38' }}>מגמה</Label>
                  <Select value={newMatch.trend} onValueChange={v => setNewMatch(p => ({ ...p, trend: v }))}>
                    <SelectTrigger style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}>
                      <SelectItem value="התקדמות">התקדמות</SelectItem>
                      <SelectItem value="ללא שינוי">ללא שינוי</SelectItem>
                      <SelectItem value="ירידה">ירידה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label style={{ color: '#5C4E38' }}>הופעת הפוקוס?</Label>
                  <div className="flex gap-2 mt-1">
                    {[{ v: true, label: 'כן', color: '#2A7050' }, { v: false, label: 'לא', color: '#B94040' }].map(opt => (
                      <button key={String(opt.v)} onClick={() => setNewMatch(p => ({ ...p, focus_appeared: opt.v }))}
                        className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                          backgroundColor: newMatch.focus_appeared === opt.v ? opt.color : 'rgba(139,115,85,0.08)',
                          color: newMatch.focus_appeared === opt.v ? '#fff' : '#7A6B57',
                          border: `1px solid ${newMatch.focus_appeared === opt.v ? opt.color : 'rgba(139,115,85,0.2)'}`,
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label style={{ color: '#5C4E38' }}>הערה</Label>
                  <Textarea value={newMatch.note} onChange={e => setNewMatch(p => ({ ...p, note: e.target.value }))}
                    rows={2} placeholder="הערה על ביצועים..."
                    style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddMatch(false)} style={{ color: '#7A6B57' }}>ביטול</Button>
              <Button
                onClick={handleAddMatch}
                disabled={matchMode === 'existing' ? !selectedAnalysisId : !newMatch.opponent}
                style={{ backgroundColor: '#2A7050', color: '#fff' }}
              >
                שמור
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Training Program Modal ── */}
        <TrainingProgramModal
          isOpen={showProgramModal}
          onClose={() => setShowProgramModal(false)}
          program={trainingProgram}
          player={player}
          trainingEvaluations={trainingEvaluations}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['trainingEvaluations', playerId] });
            loadPlayer();
          }}
        />

        {/* ── Program Review ── */}
        {trainingProgram && player && (
          <ProgramReviewDialog
            isOpen={showReviewDialog}
            onClose={() => setShowReviewDialog(false)}
            program={trainingProgram}
            player={player}
            onComplete={() => { setShowReviewDialog(false); loadPlayer(); }}
          />
        )}

        {/* ── Edit Program Modal ── */}
        <EditProgramModal
          open={showEditProgram}
          onClose={() => setShowEditProgram(false)}
          program={trainingProgram}
          player={player}
          onSaved={() => {
            setShowEditProgram(false);
            loadPlayer();
          }}
        />

        {/* ── Player Report Modal ── */}
        <PlayerReportModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          player={player}
          matchAnalyses={matchAnalyses}
          teamPlayers={teamPlayers}
        />

        {/* ── Professional Tips Modal ── */}
        <ProfessionalTipsModal
          open={showTipsModal}
          onClose={() => setShowTipsModal(false)}
          player={player}
          trainingProgram={trainingProgram}
          matchAnalyses={matchAnalyses}
          trainingEvaluations={trainingEvaluations}
        />
      </div>
    </motion.div>
  );
}