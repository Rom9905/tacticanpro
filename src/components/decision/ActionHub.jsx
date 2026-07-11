import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, User, Calendar, CheckCircle2, Target } from 'lucide-react';
import { createPageUrl } from '../../utils';

export default function ActionHub({ pattern, players, isOpen, onClose, teamId }) {
  const [actionType, setActionType] = useState(null);
  const [actionForm, setActionForm] = useState({
    selectedPlayers: [],
    scheduledDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    notes: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const actions = [
    {
      id: 'team',
      icon: Users,
      title: 'צור תרגיל קבוצתי',
      description: 'תרגיל לכל הקבוצה באימון הבא',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'personal',
      icon: User,
      title: 'תרגיל לשחקן ספציפי',
      description: 'תוכנית אישית לשחקן שמעורב בדפוס',
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'schedule',
      icon: Calendar,
      title: 'הוסף ללו״ז השבועי',
      description: 'קבע תאריך ספציפי באימונים',
      color: 'from-emerald-500 to-emerald-600'
    }
  ];

  const handleSubmit = async () => {
    // Save to database
    await base44.entities.TrainingAction.create({
      team_id: teamId,
      action_type: actionType,
      pattern_situation: pattern.situation,
      pattern_category: pattern.category,
      pattern_count: pattern.count,
      selected_players: actionForm.selectedPlayers,
      scheduled_date: actionForm.scheduledDate,
      priority: actionForm.priority,
      notes: actionForm.notes,
      status: 'pending'
    });

    setShowSuccess(true);
    setTimeout(() => {
      window.location.href = createPageUrl('TrainingCenter');
    }, 1500);
  };

  if (showSuccess) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-emerald-500/30 max-w-md">
          <div className="text-center py-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">התווסף למרכז אימונים</h3>
            <p className="text-slate-400">מעביר אותך למרכז אימונים...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!actionType) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">הפוך תובנה לאימון מעשי</DialogTitle>
            <p className="text-sm text-slate-400 mt-2">בחר כיצד להפוך את הדפוס שזוהה לתרגיל אימון ממוקד</p>
          </DialogHeader>

          <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-2">{pattern.situation}</h3>
            <p className="text-sm text-slate-400">זוהה {pattern.count} פעמים במשחקים האחרונים</p>
          </div>

          <div className="space-y-3">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.id}
                  className="bg-slate-800/50 border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-all"
                  onClick={() => setActionType(action.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{action.title}</h3>
                        <p className="text-sm text-slate-400">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose} className="border-slate-700">
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedAction = actions.find(a => a.id === actionType);
  const Icon = selectedAction.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedAction.color} flex items-center justify-center`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{selectedAction.title}</DialogTitle>
              <p className="text-slate-400 text-sm">{selectedAction.description}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="text-sm font-bold text-slate-400 mb-2">סיכום מצב</h3>
          <p className="text-white font-medium mb-1">{pattern.situation}</p>
          <p className="text-sm text-slate-400">זוהה {pattern.count} פעמים • {pattern.category}</p>
        </div>

        <div className="space-y-4">
          {actionType === 'personal' && (
            <div>
              <Label className="text-white">בחר שחקנים</Label>
              <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto bg-slate-800 p-3 rounded-lg border border-slate-700">
                {players.map(player => (
                  <label key={player.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={actionForm.selectedPlayers.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActionForm({...actionForm, selectedPlayers: [...actionForm.selectedPlayers, player.id]});
                        } else {
                          setActionForm({...actionForm, selectedPlayers: actionForm.selectedPlayers.filter(id => id !== player.id)});
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-white">{player.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-white">תאריך אימון</Label>
            <Input
              type="date"
              value={actionForm.scheduledDate}
              onChange={(e) => setActionForm({...actionForm, scheduledDate: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label className="text-white">עדיפות</Label>
            <Select value={actionForm.priority} onValueChange={(v) => setActionForm({...actionForm, priority: v})}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">גבוהה</SelectItem>
                <SelectItem value="medium">בינונית</SelectItem>
                <SelectItem value="low">נמוכה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white">הערות נוספות (אופציונלי)</Label>
            <Textarea
              value={actionForm.notes}
              onChange={(e) => setActionForm({...actionForm, notes: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="דגשים מיוחדים לתרגיל..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              onClick={handleSubmit}
            >
              <Target className="w-4 h-4 ml-2" />
              צור אימון מהתובנה
            </Button>
            <Button variant="outline" onClick={() => setActionType(null)} className="flex-1 border-slate-700">
              חזור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}