import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TrainingEvaluationModal({ open, onClose, trainingEvent, teamId, onSaved }) {
  const [players, setPlayers] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && teamId) {
      loadPlayers();
    }
  }, [open, teamId]);

  const loadPlayers = async () => {
    const teamPlayers = await base44.entities.Player.filter({ team_id: teamId });
    setPlayers(teamPlayers);
    
    // Load existing evaluations for this training
    if (trainingEvent?.id) {
      const existing = await base44.entities.TrainingSessionEvaluation.filter({
        training_event_id: trainingEvent.id
      });
      const evalMap = {};
      existing.forEach(e => {
        evalMap[e.player_id] = {
          rating: e.rating,
          coach_note: e.coach_note,
          improvement_observed: e.improvement_observed
        };
      });
      setEvaluations(evalMap);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save evaluations for each player that has a rating
      for (const [playerId, data] of Object.entries(evaluations)) {
        if (data.rating) {
          // Check if evaluation exists
          const existing = await base44.entities.TrainingSessionEvaluation.filter({
            training_event_id: trainingEvent.id,
            player_id: playerId
          });
          
          const evalData = {
            team_id: teamId,
            player_id: playerId,
            program_id: data.program_id || null,
            training_event_id: trainingEvent.id,
            training_date: trainingEvent.game_date.split('T')[0],
            rating: parseFloat(data.rating),
            coach_note: data.coach_note || '',
            improvement_observed: data.improvement_observed || false
          };
          
          if (existing.length > 0) {
            await base44.entities.TrainingSessionEvaluation.update(existing[0].id, evalData);
          } else {
            await base44.entities.TrainingSessionEvaluation.create(evalData);
          }
          
          // Update player's training program progress if they have one
          const programs = await base44.entities.TrainingProgram.filter({
            player_id: playerId,
            status: 'active'
          });
          
          if (programs.length > 0) {
            const prog = programs[0];
            // Increase progress slightly based on rating
            const increment = data.rating >= 7 ? 5 : data.rating >= 5 ? 3 : 1;
            const newProgress = Math.min(100, (prog.progress_percentage || 0) + increment);
            await base44.entities.TrainingProgram.update(prog.id, {
              progress_percentage: newProgress
            });
          }
        }
      }
      onSaved && onSaved();
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
    }
    setSaving(false);
  };

  const updateEvaluation = (playerId, field, value) => {
    setEvaluations(prev => ({
      ...prev,
      [playerId]: { ...(prev[playerId] || {}), [field]: value }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#2C2416' }}>
            הערכת שחקנים באימון
            {trainingEvent && (
              <span className="text-sm font-normal mr-2" style={{ color: '#9A8672' }}>
                {new Date(trainingEvent.game_date).toLocaleDateString('he-IL')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {players.map(player => {
            const playerEval = evaluations[player.id] || {};
            const hasRating = !!playerEval.rating;
            
            return (
              <div
                key={player.id}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: hasRating ? 'rgba(42,112,80,0.05)' : '#EDE8DF',
                  border: `1px solid ${hasRating ? 'rgba(42,112,80,0.22)' : 'rgba(139,115,85,0.18)'}`
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={player.name}
                      className="w-10 h-10 rounded-full object-cover"
                      style={{ border: '2px solid rgba(139,115,85,0.2)' }} />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: 'rgba(42,112,80,0.12)', color: '#2A7050' }}>
                      {player.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: '#2C2416' }}>{player.name}</p>
                    <p className="text-xs" style={{ color: '#9A8672' }}>{player.position}</p>
                  </div>
                  {hasRating && (
                    <CheckCircle2 className="w-5 h-5" style={{ color: '#2A7050' }} />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <Label className="text-xs" style={{ color: '#5C4E38' }}>ציון (1-10)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={playerEval.rating || ''}
                      onChange={(e) => updateEvaluation(player.id, 'rating', e.target.value)}
                      placeholder="7.5"
                      style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => updateEvaluation(player.id, 'improvement_observed', !playerEval.improvement_observed)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full justify-center"
                      style={{
                        backgroundColor: playerEval.improvement_observed ? 'rgba(42,112,80,0.12)' : 'rgba(139,115,85,0.08)',
                        color: playerEval.improvement_observed ? '#2A7050' : '#7A6B57',
                        border: `1px solid ${playerEval.improvement_observed ? 'rgba(42,112,80,0.30)' : 'rgba(139,115,85,0.20)'}`
                      }}
                    >
                      <Star className="w-3.5 h-3.5" />
                      {playerEval.improvement_observed ? 'נצפה שיפור' : 'סמן שיפור'}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs" style={{ color: '#5C4E38' }}>הערה</Label>
                  <Textarea
                    value={playerEval.coach_note || ''}
                    onChange={(e) => updateEvaluation(player.id, 'coach_note', e.target.value)}
                    rows={2}
                    placeholder="הראה שיפור בלחץ אבל עדיין מתקשה בקבלת החלטות..."
                    style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-3" style={{ borderTop: '1px solid rgba(139,115,85,0.14)' }}>
          <Button variant="ghost" onClick={onClose} style={{ color: '#7A6B57' }}>
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || Object.keys(evaluations).length === 0}
            style={{ backgroundColor: '#2A7050', color: '#fff' }}
          >
            {saving ? 'שומר...' : 'שמור הערכות'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}