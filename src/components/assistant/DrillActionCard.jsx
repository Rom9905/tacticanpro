import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Calendar, 
  AlertCircle, 
  Check,
  Clock,
  Users,
  Target
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';

export default function DrillActionCard({ drill, teamId, relatedIssue, nextGame, onAdded }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [priority, setPriority] = useState('high');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddToSchedule = async () => {
    setLoading(true);
    try {
      await base44.entities.TrainingAction.create({
        team_id: teamId,
        action_type: 'drill',
        pattern_situation: relatedIssue || drill.name,
        pattern_category: drill.category || 'אימון כללי',
        priority,
        severity: priority === 'high' ? 'high' : priority === 'medium' ? 'medium' : 'low',
        scheduled_date: selectedDate,
        notes: notes || drill.description,
        status: 'pending',
        related_game_id: nextGame?.id,
      });

      onAdded?.();
      setShowDialog(false);
    } catch (error) {
      console.error('Failed to add drill:', error);
    }
    setLoading(false);
  };

  const priorityColors = {
    high: 'bg-red-500/20 text-red-300 border-red-500/40',
    medium: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    low: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };

  return (
    <>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h4 className="text-white font-bold mb-2">{drill.name}</h4>
            <p className="text-slate-300 text-sm mb-3">{drill.description}</p>
              
              <div className="flex flex-wrap gap-2 text-xs mb-3">
                {drill.duration && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{drill.duration}</span>
                  </div>
                )}
                {drill.players_needed && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Users className="w-3 h-3" />
                    <span>{drill.players_needed}</span>
                  </div>
                )}
                {drill.focus && (
                  <Badge className="bg-purple-500/20 text-purple-300">
                    {drill.focus}
                  </Badge>
                )}
              </div>

              {drill.key_points && (
                <div className="text-xs text-slate-400 space-y-1">
                  {drill.key_points.map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Target className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => setShowDialog(true)}
              className="bg-violet-600 hover:bg-violet-700 shrink-0"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף ללו״ז
            </Button>
          </div>

        {nextGame && (
          <div className="text-xs text-violet-400/70 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>יעד: לפני המשחק מול {nextGame.opponent}</span>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>הוסף תרגיל ללוח אימונים</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">{drill.name}</h4>
              <p className="text-sm text-slate-400">{drill.description}</p>
            </div>

            <div>
              <Label className="text-slate-300">תאריך מתוכנן</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">עדיפות</Label>
              <div className="flex gap-2">
                {[
                  { value: 'high', label: 'גבוהה', color: 'red' },
                  { value: 'medium', label: 'בינונית', color: 'orange' },
                  { value: 'low', label: 'נמוכה', color: 'blue' }
                ].map((p) => (
                  <Button
                    key={p.value}
                    variant={priority === p.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriority(p.value)}
                    className={priority === p.value ? priorityColors[p.value] : ''}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-slate-300">הערות נוספות</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות לאימון..."
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>

            {relatedIssue && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>מחובר לבעיה: {relatedIssue}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDialog(false)}>
                ביטול
              </Button>
              <Button 
                onClick={handleAddToSchedule}
                disabled={!selectedDate || loading}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Check className="w-4 h-4 ml-1" />
                {loading ? 'מוסיף...' : 'הוסף'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}