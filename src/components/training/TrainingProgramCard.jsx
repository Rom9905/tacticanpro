import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Dumbbell, 
  Users, 
  Clock, 
  CheckCircle2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function TrainingProgramCard({ program, drills, onMarkSession, onGenerateNew, onSwapDrill }) {
  const completedSessions = program.sessions_log?.filter(s => s.completed).length || 0;
  const totalSessions = program.review_after_games || 3;
  const progressPercent = (completedSessions / totalSessions) * 100;

  return (
    <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-white mb-2">
              <Target className="w-5 h-5 text-violet-400" />
              תוכנית אימונים פעילה
            </CardTitle>
            <h3 className="text-xl font-bold text-white mb-1">{program.focus_title}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                {program.primary_weakness}
              </Badge>
              {program.secondary_weakness && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {program.secondary_weakness}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateNew}
            className="text-violet-400 hover:bg-violet-500/10"
          >
            <RefreshCw className="w-3 h-3 ml-1" />
            יצירה מחדש
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Goal Statement */}
        <div className="p-3 rounded-lg bg-slate-800/50">
          <p className="text-sm text-slate-300">{program.goal_statement}</p>
        </div>

        {/* Success Metric */}
        {program.success_metric_title && (
          <div className="p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">מדד הצלחה</span>
              <span className="text-emerald-400 font-medium">
                יעד: {program.success_metric_target} {program.success_metric_unit}
              </span>
            </div>
            <p className="text-white font-medium">{program.success_metric_title}</p>
          </div>
        )}

        {/* Drills */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            תרגילים בתוכנית
          </h4>
          
          {drills.map((drill, index) => {
            const slotLabels = {
              personal_1: 'אישי 1',
              personal_2: 'אישי 2',
              team_drill: 'קבוצתי'
            };
            const programDrill = program.drills?.find(d => d.drill_id === drill.id);
            
            return (
              <div key={index} className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {slotLabels[programDrill?.slot]}
                      </Badge>
                      {drill.is_group_drill && (
                        <Users className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    <h5 className="font-medium text-white">{drill.title}</h5>
                    {programDrill?.why_this_drill && (
                      <p className="text-xs text-slate-400 mt-1">
                        {programDrill.why_this_drill}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSwapDrill(programDrill?.slot)}
                    className="text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {programDrill?.custom_duration_min || drill.duration_min} דק׳
                  </span>
                  {(programDrill?.custom_sets_reps || drill.sets_reps) && (
                    <span>{programDrill?.custom_sets_reps || drill.sets_reps}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="p-4 rounded-lg bg-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">התקדמות</span>
            <span className="text-white font-medium">{completedSessions}/{totalSessions} אימונים</span>
          </div>
          <Progress value={progressPercent} className="h-2 mb-3" />
          <Button
            onClick={onMarkSession}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4 ml-2" />
            סמן אימון בוצע
          </Button>
        </div>

        {/* Coach Notes */}
        {program.notes_for_coach && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-400">
              💡 {program.notes_for_coach}
            </p>
          </div>
        )}

        {/* Auto-generated Rationale */}
        {program.ai_generated && program.ai_rationale && (
          <div className="p-3 rounded-lg bg-slate-800/50 text-xs text-slate-400">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span className="text-violet-400 font-medium">נוצר אוטומטית</span>
            </div>
            <p>{program.ai_rationale}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}