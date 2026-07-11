import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, CheckCircle2, AlertCircle, Clock, Eye, Target, Brain } from 'lucide-react';

export default function TrainingHistory({ outcomes = [], reviews = [] }) {
  const [selectedReview, setSelectedReview] = useState(null);

  if (outcomes.length === 0) {
    return null;
  }

  const outcomeColors = {
    'יעיל': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle2 },
    'יעיל חלקית': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Clock },
    'לא יעיל': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: AlertCircle },
  };

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500" />
            היסטוריית תוכניות אימונים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {outcomes.map((outcome) => {
            const review = reviews.find(r => r.id === outcome.review_id);
            const colors = outcomeColors[outcome.outcome_status];
            const Icon = colors.icon;

            return (
              <div
                key={outcome.id}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {outcome.program_data?.focus_title}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                        <Icon className="w-3 h-3 ml-1" />
                        {outcome.outcome_status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {outcome.program_data?.primary_weakness}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {outcome.program_data?.duration_weeks} שבועות • {outcome.program_data?.sessions_completed} אימונים
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Insight */}
                {outcome.ai_evaluation_summary && (
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-emerald-400 font-medium mb-1 flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      תובנת AI
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {outcome.ai_evaluation_summary}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    הושלם ב-{new Date(outcome.completion_date).toLocaleDateString('he-IL')}
                  </span>
                  {review && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedReview(review)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Eye className="w-3 h-3 ml-1" />
                      צפה בביקורת
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Review Details Dialog */}
      {selectedReview && (
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>פרטי ביקורת תוכנית</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Coach Evaluation */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    הערכת מאמן
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">הערכה:</span>
                      <Badge className={
                        selectedReview.coach_evaluation === 'השתפר'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : selectedReview.coach_evaluation === 'ללא שינוי'
                          ? 'bg-slate-500/20 text-slate-400'
                          : 'bg-red-500/20 text-red-400'
                      }>
                        {selectedReview.coach_evaluation}
                      </Badge>
                    </div>
                    {selectedReview.coach_summary_note && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">הערת סיכום:</p>
                        <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded">
                          {selectedReview.coach_summary_note}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Evaluation */}
              {selectedReview.ai_detected_changes && (
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-emerald-400" />
                      הערכת AI
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">שינויים שזוהו:</p>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {selectedReview.ai_detected_changes}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">רמת השפעה:</span>
                        <Badge className={
                          selectedReview.ai_impact_level === 'גבוה'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : selectedReview.ai_impact_level === 'בינוני'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }>
                          {selectedReview.ai_impact_level}
                        </Badge>
                      </div>
                      {selectedReview.ai_data_reliability && (
                        <div className="pt-2 border-t border-slate-700">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>אמינות:</span>
                            <span>
                              מבוסס על {selectedReview.ai_data_reliability.based_on_matches} משחקים •{' '}
                              {selectedReview.ai_data_reliability.reliability_score}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button onClick={() => setSelectedReview(null)} className="bg-slate-700 hover:bg-slate-600">
                  סגור
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}