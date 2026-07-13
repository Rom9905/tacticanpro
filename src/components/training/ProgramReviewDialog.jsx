import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, TrendingUp, TrendingDown, Minus, AlertTriangle, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProgramReviewDialog({ isOpen, onClose, program, player, onComplete }) {
  const [coachEvaluation, setCoachEvaluation] = useState('');
  const [coachNote, setCoachNote] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!program || !player) return null;

  const handleSubmit = async () => {
    if (!coachEvaluation) return;
    
    setSubmitting(true);
    try {
      // Get player's match history for AI analysis
      const matchesDuringProgram = player.match_history?.filter(m => {
        const matchDate = new Date(m.date);
        const programStart = new Date(program.start_date);
        return matchDate >= programStart;
      }) || [];

      // Simple AI evaluation based on match trends
      const improvementMatches = matchesDuringProgram.filter(m => m.trend === 'התקדמות').length;
      const declineMatches = matchesDuringProgram.filter(m => m.trend === 'ירידה').length;
      
      let aiImpactLevel = 'נמוך';
      let aiDetectedChanges = '';
      
      if (improvementMatches >= 2) {
        aiImpactLevel = 'גבוה';
        aiDetectedChanges = `זוהתה מגמת שיפור ברורה: ${improvementMatches} משחקים עם התקדמות. השחקן מראה עליה עקבית בביצועים הקשורים ל-${program.focus_title}.`;
      } else if (improvementMatches > declineMatches) {
        aiImpactLevel = 'בינוני';
        aiDetectedChanges = `זוהה שיפור מתון: ${improvementMatches} משחקים חיוביים מול ${declineMatches} שליליים. יש התקדמות אך לא עקבית.`;
      } else {
        aiDetectedChanges = `לא זוהה שינוי משמעותי בדפוסי המשחק הקשורים ל-${program.focus_title}. ייתכן שהתוכנית זקוקה להתאמה.`;
      }

      // Determine outcome status
      let outcomeStatus = 'לא יעיל';
      if (coachEvaluation === 'השתפר' && aiImpactLevel === 'גבוה') {
        outcomeStatus = 'יעיל';
      } else if (coachEvaluation === 'השתפר' || aiImpactLevel === 'בינוני') {
        outcomeStatus = 'יעיל חלקית';
      }

      // Create review
      const review = await base44.entities.TrainingProgramReview.create({
        program_id: program.id,
        player_id: player.id,
        coach_evaluation: coachEvaluation,
        coach_summary_note: coachNote.slice(0, 300),
        review_date: new Date().toISOString().split('T')[0],
        ai_detected_changes: aiDetectedChanges,
        ai_affected_situations: [],
        ai_impact_level: aiImpactLevel,
        ai_data_reliability: {
          based_on_matches: matchesDuringProgram.length,
          reliability_score: matchesDuringProgram.length >= 3 ? 'גבוה' : matchesDuringProgram.length >= 2 ? 'בינוני' : 'נמוך'
        }
      });

      // Calculate duration
      const startDate = new Date(program.start_date);
      const endDate = new Date();
      const durationWeeks = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));

      // Create outcome
      await base44.entities.ProgramOutcome.create({
        program_id: program.id,
        player_id: player.id,
        outcome_status: outcomeStatus,
        coach_evaluation: coachEvaluation,
        ai_evaluation_summary: aiDetectedChanges,
        completion_date: new Date().toISOString().split('T')[0],
        review_id: review.id,
        program_data: {
          focus_title: program.focus_title,
          duration_weeks: durationWeeks,
          sessions_completed: 0
        }
      });

      // Archive program
      await base44.entities.TrainingProgram.update(program.id, {
        status: 'completed'
      });

      onComplete(nextStep);
    } catch (error) {
      console.error('Error completing program review:', error);
    }
    setSubmitting(false);
  };

  const completedSessions = program.progress_percentage ? Math.round(program.progress_percentage / 100 * 3) : 0;
  const totalSessions = 3;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">סיכום תוכנית אימונים</DialogTitle>
          <p className="text-slate-400 text-sm mt-2">סקירה חובה לפני סגירת התוכנית</p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Program Summary */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-400" />
                סיכום התוכנית
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">מטרה:</span>
                  <span className="text-white font-medium">{program.focus_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">חולשה עיקרית:</span>
                  <Badge className="bg-violet-500/20 text-violet-400">{program.primary_weakness}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">אימונים שהושלמו:</span>
                  <span className="text-white font-medium">{completedSessions}/{totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">תאריך התחלה:</span>
                  <span className="text-white">{new Date(program.start_date).toLocaleDateString('he-IL')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coach Evaluation */}
          <div>
            <Label className="text-white mb-3 block">הערכת מאמן *</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={coachEvaluation === 'השתפר' ? 'default' : 'outline'}
                onClick={() => setCoachEvaluation('השתפר')}
                className={`h-auto py-4 flex flex-col gap-2 ${
                  coachEvaluation === 'השתפר'
                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500'
                    : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span>השתפר</span>
              </Button>
              <Button
                type="button"
                variant={coachEvaluation === 'ללא שינוי' ? 'default' : 'outline'}
                onClick={() => setCoachEvaluation('ללא שינוי')}
                className={`h-auto py-4 flex flex-col gap-2 ${
                  coachEvaluation === 'ללא שינוי'
                    ? 'bg-slate-600 hover:bg-slate-700 border-slate-500'
                    : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Minus className="w-5 h-5" />
                <span>ללא שינוי</span>
              </Button>
              <Button
                type="button"
                variant={coachEvaluation === 'לא השתפר' ? 'default' : 'outline'}
                onClick={() => setCoachEvaluation('לא השתפר')}
                className={`h-auto py-4 flex flex-col gap-2 ${
                  coachEvaluation === 'לא השתפר'
                    ? 'bg-red-600 hover:bg-red-700 border-red-500'
                    : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <TrendingDown className="w-5 h-5" />
                <span>לא השתפר</span>
              </Button>
            </div>
          </div>

          {/* Coach Note */}
          <div>
            <Label className="text-white mb-2 block">הערת סיכום (אופציונלי, עד 300 תווים)</Label>
            <Textarea
              value={coachNote}
              onChange={(e) => setCoachNote(e.target.value.slice(0, 300))}
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              placeholder="תאר בקצרה את השינויים שראית, או מה לא עבד..."
            />
            <p className="text-xs text-slate-500 mt-1">{coachNote.length}/300</p>
          </div>

          {/* Next Step */}
          <div>
            <Label className="text-white mb-3 block">מה הצעד הבא? *</Label>
            <div className="space-y-2">
              <Button
                type="button"
                variant={nextStep === 'continue' ? 'default' : 'outline'}
                onClick={() => setNextStep('continue')}
                className={`w-full justify-start ${
                  nextStep === 'continue'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 ml-2" />
                המשך עם תוכנית מותאמת (אותו פוקוס)
              </Button>
              <Button
                type="button"
                variant={nextStep === 'new' ? 'default' : 'outline'}
                onClick={() => setNextStep('new')}
                className={`w-full justify-start ${
                  nextStep === 'new'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Target className="w-4 h-4 ml-2" />
                בחר מטרת פיתוח חדשה
              </Button>
              <Button
                type="button"
                variant={nextStep === 'none' ? 'default' : 'outline'}
                onClick={() => setNextStep('none')}
                className={`w-full justify-start ${
                  nextStep === 'none'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Minus className="w-4 h-4 ml-2" />
                השאר ללא תוכנית פעילה
              </Button>
            </div>
          </div>

          {/* Warning */}
          {(!coachEvaluation || !nextStep) && (
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-amber-400 font-medium mb-1">שדות חובה</p>
                  <p className="text-amber-300/80">יש לבחור הערכת מאמן וצעד הבא לפני סיום הביקורת</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-700"
              disabled={submitting}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!coachEvaluation || !nextStep || submitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? 'שומר...' : 'סיים תוכנית'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}