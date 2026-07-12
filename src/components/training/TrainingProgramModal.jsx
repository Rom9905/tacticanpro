import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Edit3, Plus, CheckCircle2, Calendar, Trash2,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ── Helpers ──────────────────────────────────────────────────────────
function calcTrend(evals) {
  if (!evals || evals.length < 2) return { label: 'עדיין לא עקבי', icon: Minus, color: '#9A8672', bg: 'rgba(139,115,85,0.08)' };
  const recent = evals.slice(0, 2).map(e => e.rating);
  const older  = evals.slice(2, 4).map(e => e.rating);
  const avgR = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgO = older.length ? older.reduce((s, v) => s + v, 0) / older.length : avgR;
  if (avgR > avgO + 0.5) return { label: 'שיפור יציב', icon: TrendingUp, color: '#2A7050', bg: 'rgba(42,112,80,0.08)' };
  if (avgR < avgO - 0.5) return { label: 'דורש עבודה', icon: TrendingDown, color: '#B94040', bg: 'rgba(185,64,64,0.08)' };
  return { label: 'יציב', icon: Minus, color: '#2A5FA8', bg: 'rgba(41,95,168,0.08)' };
}

function topicStatus(topic, evals) {
  const relevant = evals.filter(e => e.topic_scores?.[topic] != null);
  if (relevant.length === 0) return { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#9A8672' };
  const scores = relevant.slice(0, 3).map(e => e.topic_scores[topic]);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const isRecent = relevant.some(e => {
    const d = new Date(e.training_date);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 21;
  });
  if (!isRecent) return { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#9A8672' };
  if (scores.length >= 2 && scores[0] > scores[scores.length - 1] + 0.5)
    return { label: 'שיפור עקבי', icon: TrendingUp, color: '#2A7050' };
  if (avg < 5) return { label: 'דורש עבודה', icon: TrendingDown, color: '#B94040' };
  if (avg >= 7) return { label: 'שיפור באימונים', icon: TrendingUp, color: '#2A7050' };
  return { label: 'בעבודה', icon: Minus, color: '#2A5FA8' };
}

// ── Component ─────────────────────────────────────────────────────────
export default function TrainingProgramModal({ 
  isOpen, onClose, program, player, trainingEvaluations, onRefresh
}) {
  const [coachNote, setCoachNote] = useState(program?.notes_for_coach || '');
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [showAddEval, setShowAddEval] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Training sessions from GameSchedule
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // New eval state
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [overallRatingInput, setOverallRatingInput] = useState('');
  const [checkedTopics, setCheckedTopics] = useState({});   // { topic: bool }
  const [topicScores, setTopicScores] = useState({});       // { topic: number }
  const [evalNote, setEvalNote] = useState('');

  useEffect(() => {
    if (isOpen && player?.team_id) {
      setLoadingSessions(true);
      base44.entities.GameSchedule.filter({ team_id: player.team_id, context: 'חברית' }, '-game_date', 50)
        .then(async (results) => {
          // Also fetch training sessions — GameSchedule doesn't have a "training" context type so we filter by event_type in ProfessionalSummary or use a separate approach
          // Actually fetch all GameSchedule and filter those that are training events
          const allEvents = await base44.entities.GameSchedule.filter({ team_id: player.team_id }, '-game_date', 100);
          // Training sessions are typically logged via ProfessionalSummary with event_type='training'
          const summaries = await base44.entities.ProfessionalSummary.filter({ team_id: player.team_id, event_type: 'training' }, '-event_date', 50);
          setTrainingSessions(summaries);
          setLoadingSessions(false);
        })
        .catch(() => setLoadingSessions(false));
    }
  }, [isOpen, player?.team_id]);

  if (!program || !player) return null;

  const recentEvals = trainingEvaluations?.slice(0, 8) || [];
  const trend = calcTrend(recentEvals);
  const TrendIcon = trend.icon;

  const workTopics = program.work_topics || [];

  const toggleTopic = (topic) => {
    setCheckedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
    if (!checkedTopics[topic] && !topicScores[topic]) {
      setTopicScores(prev => ({ ...prev, [topic]: 7 }));
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    await base44.entities.TrainingProgram.update(program.id, { notes_for_coach: coachNote });
    onRefresh?.();
    setEditingNote(false);
    setSavingNote(false);
  };

  const handleAddEvaluation = async () => {
    if (!selectedSessionId) return;
    setSaving(true);

    const session = trainingSessions.find(s => s.id === selectedSessionId);
    const trainingDate = session?.event_date || new Date().toISOString().split('T')[0];

    const selectedTopics = workTopics.filter(t => checkedTopics[t]);
    const scores = {};
    selectedTopics.forEach(t => { scores[t] = parseFloat(topicScores[t]) || 5; });

    // Use manual overall rating if provided, else avg of topic scores, else 5
    let overallRating = parseFloat(overallRatingInput);
    if (!overallRating || isNaN(overallRating)) {
      const vals = Object.values(scores);
      overallRating = vals.length > 0
        ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
        : 5;
    }
    overallRating = Math.min(10, Math.max(1, overallRating));

    await base44.entities.TrainingSessionEvaluation.create({
      team_id: player.team_id,
      player_id: player.id,
      program_id: program?.id || null,
      training_event_id: selectedSessionId,
      training_date: trainingDate,
      rating: overallRating,
      coach_note: evalNote,
      improvement_observed: overallRating >= 7,
      focus_areas: selectedTopics,
      topic_scores: scores,
    });

    onRefresh?.();
    setShowAddEval(false);
    setSelectedSessionId('');
    setOverallRatingInput('');
    setCheckedTopics({});
    setTopicScores({});
    setEvalNote('');
    setSaving(false);
  };

  const handleDeleteEvaluation = async (evalId) => {
    setDeletingId(evalId);
    await base44.entities.TrainingSessionEvaluation.delete(evalId);
    onRefresh?.();
    setDeletingId(null);
    setCheckedTopics({});
    setTopicScores({});
    setEvalNote('');
    setSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#2C2416' }}>תוכנית אישית — {player.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* 1. Goal */}
          <div className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(122,79,160,0.08)', border: '1px solid rgba(122,79,160,0.25)' }}>
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#7A4FA0' }} />
              <div>
                <h3 className="font-bold text-base mb-1" style={{ color: '#7A4FA0' }}>{program.focus_title}</h3>
                {program.goal_statement && (
                  <p className="text-sm leading-relaxed" style={{ color: '#5C4E38' }}>{program.goal_statement}</p>
                )}
                {program.ai_rationale && (
                  <p className="text-xs mt-1 italic" style={{ color: '#9A8672' }}>{program.ai_rationale}</p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Development Trend — replaces progress bar */}
          <div className="p-4 rounded-xl flex items-center gap-4"
            style={{ backgroundColor: trend.bg, border: `1px solid ${trend.color}30` }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${trend.color}20` }}>
              <TrendIcon className="w-5 h-5" style={{ color: trend.color }} />
            </div>
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: trend.color }}>מגמת התפתחות</p>
              <p className="text-base font-bold" style={{ color: '#2C2416' }}>{trend.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A8672' }}>
                מבוסס על {recentEvals.length} הערכות אימון אחרונות
              </p>
            </div>
          </div>

          {/* 3. Work Topics with dynamic status */}
          {workTopics.length > 0 && (
            <div className="p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(41,82,168,0.06)', border: '1px solid rgba(41,82,168,0.18)' }}>
              <p className="text-xs font-bold mb-3" style={{ color: '#2A5FA8' }}>נושאי עבודה — סטטוס נוכחי</p>
              <div className="space-y-2">
                {workTopics.map((topic, i) => {
                  const ts = topicStatus(topic, recentEvals);
                  const TSIcon = ts.icon;
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg"
                      style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.12)' }}>
                      <span className="text-sm" style={{ color: '#2C2416' }}>• {topic}</span>
                      <div className="flex items-center gap-1.5">
                        <TSIcon className="w-3.5 h-3.5" style={{ color: ts.color }} />
                        <span className="text-xs font-semibold" style={{ color: ts.color }}>{ts.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Training Evaluations */}
          <div className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(139,115,85,0.06)', border: '1px solid rgba(139,115,85,0.18)' }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm" style={{ color: '#2C2416' }}>הערכות אימונים</h4>
              <Button
                size="sm"
                onClick={() => setShowAddEval(!showAddEval)}
                style={{ backgroundColor: '#2A7050', color: '#fff', fontSize: '0.75rem', padding: '4px 10px' }}
              >
                <Plus className="w-3 h-3 ml-1" />
                הוסף הערכה
              </Button>
            </div>

            {/* Add eval form */}
            {showAddEval && (
              <div className="mb-4 p-3 rounded-lg space-y-4"
                style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.22)' }}>
                
                {/* Session selector */}
                <div>
                  <Label className="text-xs" style={{ color: '#5C4E38' }}>בחר אימון קבוצתי</Label>
                  {loadingSessions ? (
                    <p className="text-xs mt-1" style={{ color: '#9A8672' }}>טוען אימונים...</p>
                  ) : trainingSessions.length === 0 ? (
                    <p className="text-xs mt-1" style={{ color: '#9A8672' }}>לא נמצאו אימונים קבוצתיים במערכת</p>
                  ) : (
                    <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                      <SelectTrigger style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}>
                        <SelectValue placeholder="בחר אימון..." />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}>
                        {trainingSessions.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {new Date(s.event_date).toLocaleDateString('he-IL')}
                            {s.event_label ? ` — ${s.event_label}` : ''}
                            {s.topic ? ` (${s.topic})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Overall rating */}
                <div>
                  <Label className="text-xs" style={{ color: '#5C4E38' }}>ציון כללי לשחקן (1–10)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number" min="1" max="10" step="0.5"
                      value={overallRatingInput}
                      onChange={e => setOverallRatingInput(e.target.value)}
                      placeholder="לדוגמה: 7.5"
                      className="w-28"
                      style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
                    />
                    <span className="text-xs" style={{ color: '#9A8672' }}>/10</span>
                  </div>
                </div>

                {/* Topics checklist */}
                {workTopics.length > 0 && (
                  <div>
                    <Label className="text-xs mb-2 block" style={{ color: '#5C4E38' }}>נושאים שנבדקו באימון</Label>
                    <div className="space-y-2">
                      {workTopics.map((topic, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between p-2 rounded-lg cursor-pointer"
                            style={{ backgroundColor: checkedTopics[topic] ? 'rgba(42,112,80,0.08)' : 'rgba(139,115,85,0.06)', border: `1px solid ${checkedTopics[topic] ? 'rgba(42,112,80,0.25)' : 'rgba(139,115,85,0.14)'}` }}
                            onClick={() => toggleTopic(topic)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                                style={{ borderColor: checkedTopics[topic] ? '#2A7050' : 'rgba(139,115,85,0.4)', backgroundColor: checkedTopics[topic] ? '#2A7050' : 'transparent' }}>
                                {checkedTopics[topic] && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm" style={{ color: '#2C2416' }}>{topic}</span>
                            </div>
                            {checkedTopics[topic] && (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <span className="text-xs" style={{ color: '#7A6B57' }}>ציון:</span>
                                <Input
                                  type="number" min="1" max="10"
                                  value={topicScores[topic] || ''}
                                  onChange={e => setTopicScores(prev => ({ ...prev, [topic]: e.target.value }))}
                                  className="w-14 text-center text-sm h-7"
                                  style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(42,112,80,0.3)', color: '#2C2416' }}
                                />
                                <span className="text-xs" style={{ color: '#9A8672' }}>/10</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coach note */}
                <div>
                  <Label className="text-xs" style={{ color: '#5C4E38' }}>הערה מקצועית</Label>
                  <Textarea value={evalNote} rows={2}
                    onChange={e => setEvalNote(e.target.value)}
                    placeholder="הערות על ביצועים באימון..."
                    style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddEval(false)} style={{ color: '#7A6B57' }}>ביטול</Button>
                  <Button size="sm" onClick={handleAddEvaluation} disabled={saving || !selectedSessionId}
                    style={{ backgroundColor: '#2A7050', color: '#fff' }}>
                    {saving ? 'שומר...' : 'שמור הערכה'}
                  </Button>
                </div>
              </div>
            )}

            {/* Eval list */}
            {recentEvals.length > 0 ? (
              <div className="space-y-2">
                {recentEvals.slice(0, 5).map((ev, i) => (
                  <div key={i} className="p-2.5 rounded-lg"
                    style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.14)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9A8672' }} />
                        <span className="text-sm font-medium" style={{ color: '#2C2416' }}>
                          {new Date(ev.training_date).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold"
                          style={{ color: ev.rating >= 7 ? '#2A7050' : ev.rating >= 5 ? '#9A6A10' : '#B94040' }}>
                          {ev.rating}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteEvaluation(ev.id); }}
                          disabled={deletingId === ev.id}
                          className="p-1 rounded transition-colors hover:bg-red-50"
                          title="מחק הערכה"
                          style={{ color: deletingId === ev.id ? '#C8BFB3' : '#B94040' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Topic scores */}
                    {ev.topic_scores && Object.keys(ev.topic_scores).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.entries(ev.topic_scores).map(([topic, score]) => (
                          <span key={topic} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(139,115,85,0.08)', color: '#5C4E38' }}>
                            {topic}: {score}
                          </span>
                        ))}
                      </div>
                    )}
                    {ev.coach_note && (
                      <p className="text-xs mt-1" style={{ color: '#7A6B57' }}>{ev.coach_note}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-4" style={{ color: '#9A8672' }}>אין הערכות אימון עדיין</p>
            )}
          </div>

          {/* 5. Coach Notes */}
          <div className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.22)' }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm" style={{ color: '#D97706' }}>הערות מקצועיות של המאמן</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditingNote(!editingNote)}
                style={{ color: '#D97706', padding: '4px 8px' }}>
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            </div>
            {editingNote ? (
              <div className="space-y-2">
                <Textarea value={coachNote} onChange={e => setCoachNote(e.target.value)} rows={4}
                  placeholder="הערות מקצועיות על השחקן..."
                  style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingNote(false)} style={{ color: '#7A6B57' }}>ביטול</Button>
                  <Button size="sm" onClick={handleSaveNote} disabled={savingNote}
                    style={{ backgroundColor: '#D97706', color: '#fff' }}>
                    {savingNote ? 'שומר...' : 'שמור'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap" style={{ color: coachNote ? '#5C4E38' : '#9A8672' }}>
                {coachNote || 'לחץ לכתיבת הערות מקצועיות על השחקן...'}
              </p>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}