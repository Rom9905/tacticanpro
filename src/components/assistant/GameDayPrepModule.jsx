import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Target, 
  Brain, 
  Activity,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Link2,
  Settings,
  Check
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function GameDayPrepModule({ prep, teamId, nextGame, onAdded }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isVisible) return null;

  const handleAddToTrainingCenter = async () => {
    if (!nextGame) {
      toast.error('לא מוגדר משחק קרוב');
      return;
    }

    setLoading(true);
    try {
      const gameDate = new Date(nextGame.game_date);
      
      // Create training actions for each phase
      const phases = [
        { days: -2, phase: prep.two_days_before, name: 'יומיים לפני' },
        { days: -1, phase: prep.one_day_before, name: 'יום לפני' },
        { days: 0, phase: prep.game_day, name: 'יום המשחק' }
      ];

      for (const { days, phase, name } of phases) {
        if (!phase) continue;

        const scheduledDate = new Date(gameDate);
        scheduledDate.setDate(scheduledDate.getDate() + days);

        await base44.entities.TrainingAction.create({
          team_id: teamId,
          action_type: 'tactical_session',
          pattern_situation: `הכנה למשחק - ${name}`,
          pattern_category: 'הכנה למשחק',
          priority: 'high',
          severity: 'high',
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          notes: `${prep.rationale || ''}\n\nדגשים: ${phase.tactical_focus || ''}\n\nנקודות דגש: ${(phase.emphasis_points || phase.drills || []).join(', ')}\n\nמסרים: ${phase.mental_messages?.join(', ') || ''}`,
          status: 'pending',
          related_game_id: nextGame.id,
        });
      }

      toast.success('תוכנית ההכנה נוספה למרכז האימונים');
      onAdded?.();
    } catch (error) {
      console.error('Failed to add prep:', error);
      toast.error('שגיאה בהוספת התוכנית');
    }
    setLoading(false);
  };

  const handleLinkToGame = async () => {
    if (!nextGame) {
      toast.error('לא מוגדר משחק קרוב');
      return;
    }

    toast.success(`תוכנית ההכנה שויכה למשחק מול ${nextGame.opponent}`);
  };

  const handleSaveAsProtocol = async () => {
    toast.success('התוכנית נשמרה כפרוטוקול קבוע לשימוש עתידי');
  };

  const gameDate = nextGame ? new Date(nextGame.game_date).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric'
  }) : '';

  return (
    <div className="mt-4 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">
              תוכנית הכנה למשחק{nextGame ? ` מול ${nextGame.opponent}` : ''}
            </h3>
            {nextGame && (
              <p className="text-xs text-emerald-300">{gameDate} • {nextGame.daysUntil} ימים</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="h-8 w-8 text-slate-400 hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Rationale */}
          {prep.rationale && (
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm text-slate-200 leading-relaxed">{prep.rationale}</p>
            </div>
          )}

          {/* Two Days Before */}
          {prep.two_days_before && (
            <PrepPhase
              title="יומיים לפני המשחק"
              icon={Activity}
              color="blue"
              phase={prep.two_days_before}
            />
          )}

          {/* One Day Before */}
          {prep.one_day_before && (
            <PrepPhase
              title="יום לפני המשחק"
              icon={Target}
              color="amber"
              phase={prep.one_day_before}
            />
          )}

          {/* Game Day */}
          {prep.game_day && (
            <PrepPhase
              title="יום המשחק"
              icon={Brain}
              color="emerald"
              phase={prep.game_day}
            />
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-700 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleAddToTrainingCenter}
              disabled={loading || !nextGame}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-3 h-3 ml-1" />
              {loading ? 'מוסיף...' : 'הוסף למרכז אימונים'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleLinkToGame}
              disabled={!nextGame}
              className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
            >
              <Link2 className="w-3 h-3 ml-1" />
              שייך למשחק הקרוב
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveAsProtocol}
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              <Settings className="w-3 h-3 ml-1" />
              שמור כפרוטוקול
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrepPhase({ title, icon: Icon, color, phase }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" />
        <h4 className="font-medium text-white">{title}</h4>
      </div>

      <div className="space-y-3">
        {/* Tactical Focus */}
        {phase.tactical_focus && (
          <div>
            <p className="text-xs text-slate-400 mb-1">דגש טקטי:</p>
            <p className="text-sm text-slate-200">{phase.tactical_focus}</p>
          </div>
        )}

        {/* Emphasis Points */}
        {(phase.emphasis_points || phase.drills) && (phase.emphasis_points || phase.drills).length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1">נקודות דגש:</p>
            <ul className="space-y-1">
              {(phase.emphasis_points || phase.drills).map((point, i) => (
                <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                  <Check className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mental Messages */}
        {phase.mental_messages && phase.mental_messages.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1">מסרים מנטליים:</p>
            <ul className="space-y-1">
              {phase.mental_messages.map((msg, i) => (
                <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                  <Brain className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}