import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProfessionalTipsModal({ 
  open, 
  onClose, 
  player,
  trainingProgram,
  matchAnalyses,
  trainingEvaluations 
}) {
  const [generating, setGenerating] = useState(false);
  const [tips, setTips] = useState(null);

  const generateDetailedTips = async () => {
    setGenerating(true);
    try {
      const recentEvals = trainingEvaluations?.slice(0, 5) || [];
      const recentMatches = matchAnalyses?.slice(0, 3) || [];
      
      const prompt = `אתה מאמן כדורגל מקצועי. צור טיפים מקצועיים מפורטים לשיפור עבור השחקן.

### פרופיל השחקן:
- שם: ${player.name}
- עמדה: ${player.position}
- תפקיד: ${player.role || 'לא מוגדר'}
- חוזקות: ${player.strengths?.join(', ') || 'לא מוגדרו'}
- נקודות לשיפור: ${player.improvements?.join(', ') || 'לא מוגדרו'}
- הערות מאמן: ${player.coach_professional_notes || 'אין'}

### תוכנית אישית נוכחית:
${trainingProgram ? `
- מטרה: ${trainingProgram.focus_title}
- נושאי עבודה: ${trainingProgram.work_topics?.join(', ') || 'אין'}
- התקדמות: ${trainingProgram.progress_percentage || 0}%
` : 'אין תוכנית פעילה'}

### הערכות אימונים אחרונות:
${recentEvals.map(e => `- ${e.training_date}: ציון ${e.rating}/10${e.coach_note ? `, ${e.coach_note}` : ''}${e.improvement_observed ? ' (נצפה שיפור)' : ''}`).join('\n')}

### ביצועים במשחקים אחרונים:
${recentMatches.map(m => `- מול ${m.opponent} (${m.date}): ${m.player_ratings?.find(r => r.player_id === player.id)?.note || 'אין הערה'}`).join('\n')}

צור טיפים מקצועיים מפורטים בפורמט הבא:
1. טיפ עיקרי (למשל: "לעבוד על תנועה ללא כדור")
2. הסבר מפורט למה זה חשוב
3. 2-3 טיפים נוספים/משניים שקשורים לשחקן`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            main_tip: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                explanation: { type: 'string' },
                priority: { type: 'string', enum: ['גבוה', 'בינוני', 'נמוך'] }
              }
            },
            secondary_tips: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  brief_explanation: { type: 'string' }
                }
              }
            },
            contextual_analysis: { type: 'string' }
          }
        }
      });

      if (result?.__ai_error) {
        setTips({ error: result.__ai_error });
      } else {
        setTips(result);
        try {
          await base44.entities.Player.update(player.id, { ai_tips: result, ai_tips_updated_at: new Date().toISOString() });
        } catch (e) { console.warn('Failed to cache player tips:', e); }
      }
    } catch (error) {
      console.error('Error generating tips:', error);
      setTips({ error: 'שגיאה בהפקת הטיפים. נסה שוב מאוחר יותר.' });
    }
    setGenerating(false);
  };

  useEffect(() => {
    if (open && !tips) {
      if (player?.ai_tips && !player.ai_tips.error) {
        setTips(player.ai_tips);
      } else {
        generateDetailedTips();
      }
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#2C2416' }}>
            <Lightbulb className="w-5 h-5" style={{ color: '#2A7050' }} />
            טיפים מקצועיים לשיפור - {player.name}
          </DialogTitle>
        </DialogHeader>

        {generating ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: 'rgba(42,112,80,0.2)', borderTopColor: '#2A7050' }} />
            <p className="text-sm" style={{ color: '#7A6B57' }}>מייצר טיפים מקצועיים...</p>
          </div>
        ) : tips?.error ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: '#D97706' }}>⚠ שירות ה-AI אינו זמין</p>
            <p className="text-xs" style={{ color: '#7A6B57' }}>{tips.error}</p>
          </div>
        ) : tips ? (
          <div className="space-y-4">
            {/* Main Tip */}
            {tips.main_tip && (
              <div className="p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(42,112,80,0.10)', border: '1px solid rgba(42,112,80,0.30)' }}>
                <div className="flex items-start gap-2 mb-2">
                  <Target className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#2A7050' }} />
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1" style={{ color: '#2A7050' }}>
                      {tips.main_tip.title}
                    </h3>
                    <Badge style={{ backgroundColor: 'rgba(42,112,80,0.15)', color: '#2A7050', fontSize: '9px' }}>
                      עדיפות {tips.main_tip.priority}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#2C2416' }}>
                  {tips.main_tip.explanation}
                </p>
              </div>
            )}

            {/* Secondary Tips */}
            {tips.secondary_tips?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#7A6B57' }}>
                  טיפים נוספים:
                </p>
                <div className="space-y-2">
                  {tips.secondary_tips.map((tip, i) => (
                    <div key={i} className="p-3 rounded-lg"
                      style={{ backgroundColor: 'rgba(139,115,85,0.06)', border: '1px solid rgba(139,115,85,0.14)' }}>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold flex-shrink-0"
                          style={{ color: '#2A5FA8' }}>
                          {i + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-0.5" style={{ color: '#2C2416' }}>
                            {tip.title}
                          </p>
                          <p className="text-xs" style={{ color: '#7A6B57' }}>
                            {tip.brief_explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate button */}
            <div className="flex justify-end">
              <button
                onClick={() => { setTips(null); generateDetailedTips(); }}
                disabled={generating}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#7A6B57', border: '1px solid rgba(139,115,85,0.25)' }}
              >
                {generating ? 'מייצר...' : 'ייצר מחדש'}
              </button>
            </div>

            {/* Contextual Analysis */}
            {tips.contextual_analysis && (
              <div className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(122,79,160,0.08)', border: '1px solid rgba(122,79,160,0.22)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" style={{ color: '#7A4FA0' }} />
                  <p className="text-xs font-semibold" style={{ color: '#7A4FA0' }}>
                    ניתוח הקשרי
                  </p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#5C4E38' }}>
                  {tips.contextual_analysis}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}