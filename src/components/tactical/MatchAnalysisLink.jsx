import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { BarChart3, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function MatchAnalysisLink({ teamId, onCreateFromAnalysis }) {
  const [showDialog, setShowDialog] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [situations, setSituations] = useState([]);
  const [selectedType, setSelectedType] = useState('analysis'); // 'analysis' or 'situation'

  useEffect(() => {
    if (showDialog && teamId) {
      loadData();
    }
  }, [showDialog, teamId]);

  const loadData = async () => {
    const [analysesData, situationsData] = await Promise.all([
      base44.entities.MatchAnalysis.filter({ team_id: teamId }, '-date', 10),
      base44.entities.KeyMatchSituation.filter({ team_id: teamId, status: 'active' }, '-updated_date', 20),
    ]);
    setAnalyses(analysesData);
    setSituations(situationsData);
  };

  const handleCreateFromAnalysis = async (analysis) => {
    // Create tactical board from match analysis insights
    const insights = analysis.insights || [];
    const issues = insights.filter(i => i.category === 'issue');
    
    if (issues.length === 0) {
      toast.error('לא נמצאו בעיות בניתוח זה');
      return;
    }

    const firstIssue = issues[0];
    
    const boardData = {
      name: `פתרון: ${firstIssue.content?.substring(0, 40)}...`,
      description: `לוח טקטי שנוצר מניתוח משחק ${analysis.opponent}`,
      source_analysis_id: analysis.id,
      category: firstIssue.phase === 'buildup' ? 'התקפה' : firstIssue.phase === 'organized_defense' ? 'הגנה' : 'מעבר',
      frames: [{
        homePlayers: [],
        awayPlayers: [],
        ball: { x: 100, y: 45 },
        drawings: [],
        layers: {
          buildup: firstIssue.phase === 'buildup',
          pressing: firstIssue.phase === 'transition_defense',
          restDefense: firstIssue.phase === 'organized_defense',
          setPieces: firstIssue.phase === 'set_piece',
        },
        heatZones: [{
          id: 'problem-zone',
          x: 60,
          y: 30,
          width: 50,
          height: 30,
          color: '#ef4444',
          opacity: 0.3,
          label: 'אזור בעייתי',
          tacticalGoal: firstIssue.content || 'דורש טיפול',
          layerType: firstIssue.phase,
        }]
      }],
      tags: ['מניתוח', analysis.opponent],
    };

    onCreateFromAnalysis(boardData);
    setShowDialog(false);
    toast.success('לוח טקטי נוצר מהניתוח');
  };

  const handleCreateFromSituation = async (situation) => {
    const boardData = {
      name: `טיפול ב: ${situation.situation_name}`,
      description: `לוח טקטי לטיפול במצב: ${situation.situation_name}`,
      source_situation_id: situation.id,
      category: situation.situation_category,
      frames: [{
        homePlayers: [],
        awayPlayers: [],
        ball: { x: 100, y: 45 },
        drawings: [],
        layers: {
          buildup: situation.situation_category === 'בנייה מאחור',
          pressing: situation.situation_category === 'לחץ',
          restDefense: situation.situation_category === 'מעבר הגנתי',
          setPieces: situation.situation_category === 'שליש אחרון',
        },
        heatZones: [{
          id: 'situation-zone',
          x: 70,
          y: 35,
          width: 40,
          height: 25,
          color: '#f59e0b',
          opacity: 0.3,
          label: situation.situation_name,
          tacticalGoal: situation.description || 'דורש פתרון',
          layerType: situation.situation_category,
        }]
      }],
      tags: ['ממצב משחק', situation.situation_category],
    };

    onCreateFromAnalysis(boardData);
    setShowDialog(false);
    toast.success('לוח טקטי נוצר מהמצב');
  };

  const _handleConvertToTraining = async (_boardId) => {
    const nextGame = await base44.entities.GameSchedule.filter(
      { team_id: teamId, status: 'scheduled' },
      'game_date',
      1
    );

    const deadline = nextGame.length > 0 
      ? new Date(nextGame[0].game_date) 
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await base44.entities.TrainingAction.create({
      team_id: teamId,
      action_type: 'tactical_session',
      pattern_situation: 'מלוח טקטי',
      priority: 'high',
      notes: `תרגול מצב מלוח טקטי`,
      related_game_id: nextGame[0]?.id,
      deadline: deadline.toISOString(),
    });

    toast.success('הומר לפעולת אימון במרכז האימונים');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="w-full text-xs text-slate-400"
      >
        <BarChart3 className="w-3 h-3 ml-1" />
        צור מניתוח
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>צור לוח טקטי מניתוח</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type Selector */}
            <div className="flex gap-2 border-b border-slate-700 pb-3">
              <button
                onClick={() => setSelectedType('analysis')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedType === 'analysis'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ניתוחי משחק
              </button>
              <button
                onClick={() => setSelectedType('situation')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedType === 'situation'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                מצבי משחק
              </button>
            </div>

            {/* Match Analyses */}
            {selectedType === 'analysis' && (
              <div className="space-y-2">
                {analyses.length > 0 ? (
                  analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-500/30 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white">{analysis.opponent}</h4>
                            <span className="text-xs text-slate-500">
                              {new Date(analysis.date).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                          {analysis.insights && (
                            <p className="text-xs text-slate-400">
                              {analysis.insights.filter(i => i.category === 'issue').length} בעיות זוהו
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateFromAnalysis(analysis)}
                          className="bg-emerald-600 hover:bg-emerald-700 opacity-0 group-hover:opacity-100"
                        >
                          <Zap className="w-3 h-3 ml-1" />
                          צור לוח
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-8">אין ניתוחי משחק זמינים</p>
                )}
              </div>
            )}

            {/* Key Situations */}
            {selectedType === 'situation' && (
              <div className="space-y-2">
                {situations.length > 0 ? (
                  situations.map((situation) => (
                    <div
                      key={situation.id}
                      className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">{situation.situation_name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                              {situation.situation_category}
                            </span>
                            <span className="text-xs text-slate-500">
                              חזר {situation.occurrence_count || 0} פעמים
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateFromSituation(situation)}
                          className="bg-amber-600 hover:bg-amber-700 opacity-0 group-hover:opacity-100"
                        >
                          <Zap className="w-3 h-3 ml-1" />
                          צור לוח
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-8">אין מצבי משחק פעילים</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}