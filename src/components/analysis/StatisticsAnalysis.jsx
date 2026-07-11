import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, Zap } from 'lucide-react';

export default function StatisticsAnalysis({ isOpen, onClose, onSave, team, existingMatch }) {
  const [formData, setFormData] = useState({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    result: { our_score: 0, opponent_score: 0 },
    stats: {
      shots: undefined,
      shots_on_target: undefined,
      xg: undefined,
      possession: undefined,
      passes: undefined,
      pass_accuracy: undefined,
      tackles: undefined,
      interceptions: undefined,
      turnovers: undefined,
      critical_errors: undefined,
    },
  });
  const [generating, setGenerating] = useState(false);
  
  // Pre-fill from existing match when adding analysis
  React.useEffect(() => {
    if (existingMatch && isOpen) {
      setFormData({
        opponent: existingMatch.opponent,
        date: existingMatch.date,
        result: existingMatch.result,
        stats: existingMatch.stats || formData.stats,
      });
    }
  }, [existingMatch, isOpen]);

  const handleStatChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      stats: { ...prev.stats, [key]: value === '' ? undefined : parseFloat(value) }
    }));
  };

  const generateReport = async () => {
    setGenerating(true);
    
    const filledStats = Object.entries(formData.stats)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const prompt = `אתה מנתח כדורגל מקצועי מומחה. תפקידך לנתח משחקי כדורגל בלבד. אל תתייחס לנושאים שאינם קשורים לכדורגל - טקטיקה, שחקנים, מצבי משחק, ביצועים על המגרש בלבד. נתח את המשחק הבא דרך תהליך חשיבה מונחה ומקצועי.

### הקשר
קבוצה: ${team?.name || 'הקבוצה שלנו'}
סגנון משחק: ${team?.playing_style || 'לא צוין'}
מערך: ${team?.formation || 'לא צוין'}
נגד: ${formData.opponent}
תוצאה: ${formData.result.our_score}-${formData.result.opponent_score}
נתונים: ${filledStats || 'לא הוזנו'}

### תהליך החשיבה המונחה
עליך לענות על 5 השאלות המרכזיות:
1. **מה ניסינו לעשות?** - מה הייתה הכוונה הטקטית? איזה רעיון משחק רצינו ליישם?
2. **מה קרה בפועל?** - איך המשחק התפתח? מה באמת קרה על המגרש?
3. **איפה זה נשבר?** - באיזה שלב/שלבים התוכנית לא עבדה? באיזה מצבים היו בעיות?
4. **למה זה נשבר?** - מה הסיבות השורשיות? (טכני, טקטי, פיזי, מנטלי, החלטות)
5. **מה עושים הלאה?** - פעולות אימון קונקרטיות לשבוע הבא

### חלוקה לפי שלבי משחק
נתח את כל שלב בנפרד:
- **בניית התקפה**: איך בנינו משחק מאחור? האם הצלחנו להעביר את הכדור מהשליש ההגנתי?
- **מעברים התקפיים**: איך טיפלנו באובדן כדור של היריב? האם ניצלנו קונטרות?
- **מעברים הגנתיים**: איך הגבנו לאובדן שלנו? היה לנו תגובה מיידית?
- **הגנה מסודרת**: איך הגנו בבלוק נמוך? האם סגרנו חללים?
- **מצבים נייחים**: כדורים קבועים בהגנה ובהתקפה

### המלצות אופרטיביות
כל המלצה חייבת להיות:
- **מחוברת לדגש אימוני ברור** (למשל: "עבודה על הגנת חצי מרחב בבלוק נמוך")
- **פרקטית ומעשית** (לא "לשפר מסירות" אלא "תרגול מסירות תחת לחץ במרחבים צרים")
- **קשורה למה שצריך לקרות בשבוע הבא**

התייחס לנתונים אם הוזנו, אל תמציא מספרים. השתמש במונחים מקצועיים בעברית.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          game_plan: {
            type: 'object',
            properties: {
              intended_strategy: { type: 'string' },
              what_happened: { type: 'string' },
              where_it_broke: { type: 'string' },
              why_it_broke: { type: 'string' },
              next_steps: { type: 'string' }
            }
          },
          phase_analysis: {
            type: 'object',
            properties: {
              buildup: {
                type: 'object',
                properties: {
                  strengths: { type: 'array', items: { type: 'string' } },
                  issues: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } }
                }
              },
              transitions: {
                type: 'object',
                properties: {
                  attack: {
                    type: 'object',
                    properties: {
                      strengths: { type: 'array', items: { type: 'string' } },
                      issues: { type: 'array', items: { type: 'string' } },
                      recommendations: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  defense: {
                    type: 'object',
                    properties: {
                      strengths: { type: 'array', items: { type: 'string' } },
                      issues: { type: 'array', items: { type: 'string' } },
                      recommendations: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              },
              organized_defense: {
                type: 'object',
                properties: {
                  strengths: { type: 'array', items: { type: 'string' } },
                  issues: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } }
                }
              },
              set_pieces: {
                type: 'object',
                properties: {
                  strengths: { type: 'array', items: { type: 'string' } },
                  issues: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          },
          training_actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                focus: { type: 'string' },
                drill_suggestion: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] }
              }
            }
          },
          summary: { type: 'string' }
        },
      },
    });

    setGenerating(false);
    
    // Convert to legacy format for backward compatibility
    const legacyReport = {
      summary: response.summary,
      positives: [
        ...(response.phase_analysis?.buildup?.strengths || []),
        ...(response.phase_analysis?.transitions?.attack?.strengths || []),
      ].slice(0, 5),
      issues: [
        ...(response.phase_analysis?.buildup?.issues || []),
        ...(response.phase_analysis?.transitions?.defense?.issues || []),
        ...(response.phase_analysis?.organized_defense?.issues || []),
      ].slice(0, 5),
      recommendations: response.training_actions?.map(a => `${a.focus}: ${a.drill_suggestion}`).slice(0, 5) || [],
    };
    
    onSave({
      ...formData,
      analysis_types: ['statistics'],
      game_plan: response.game_plan,
      phase_analysis: response.phase_analysis,
      training_actions: response.training_actions,
      report: legacyReport,
      analysis_mode: 'stats',
    });
  };

  const statFields = [
    { key: 'shots', label: 'בעיטות לשער' },
    { key: 'shots_on_target', label: 'בעיטות למסגרת' },
    { key: 'xg', label: 'xG (שערים צפויים)', step: 0.1 },
    { key: 'possession', label: 'אחוז שליטה', max: 100 },
    { key: 'passes', label: 'מסירות' },
    { key: 'pass_accuracy', label: 'דיוק מסירות (%)', max: 100 },
    { key: 'tackles', label: 'תיקולים' },
    { key: 'interceptions', label: 'יירוטים' },
    { key: 'turnovers', label: 'איבודי כדור' },
    { key: 'critical_errors', label: 'טעויות קריטיות' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            ניתוח מבוסס סטטיסטיקה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Depth Note */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-sm text-slate-300">
              <strong className="text-emerald-400">ניתוח מקצועי מונחה:</strong> המערכת תלווה אותך בתהליך חשיבה מלא - מה ניסית, מה קרה בפועל, איפה ולמה זה נשבר, ומה עושים הלאה.
            </p>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>יריבה *</Label>
              <Input
                value={formData.opponent}
                onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="שם הקבוצה היריבה"
                required
              />
            </div>
            <div>
              <Label>תאריך *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Score */}
          <div>
            <Label>תוצאה *</Label>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  value={formData.result.our_score}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    result: { ...prev.result, our_score: parseInt(e.target.value) || 0 }
                  }))}
                  className="bg-slate-800 border-slate-700 text-white text-center text-xl"
                />
                <p className="text-xs text-slate-500 text-center mt-1">אנחנו</p>
              </div>
              <span className="text-2xl font-bold text-slate-500">-</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  value={formData.result.opponent_score}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    result: { ...prev.result, opponent_score: parseInt(e.target.value) || 0 }
                  }))}
                  className="bg-slate-800 border-slate-700 text-white text-center text-xl"
                />
                <p className="text-xs text-slate-500 text-center mt-1">יריבה</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <Label className="mb-2 block">
              סטטיסטיקות (מלא כמה שיותר)
            </Label>
            <p className="text-xs text-slate-500 mb-3">
              המערכת תפרש את המספרים דרך הקשר טקטי ותציע תובנות מעמיקות
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {statFields.map((field) => (
                <div key={field.key}>
                  <Input
                    type="number"
                    min="0"
                    max={field.max}
                    step={field.step || 1}
                    value={formData.stats[field.key] ?? ''}
                    onChange={(e) => handleStatChange(field.key, e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder={field.label}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={onClose}>
              ביטול
            </Button>
            <Button 
              onClick={generateReport}
              disabled={generating || !formData.opponent}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 ml-2" />
                  צור דו״ח ניתוח
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}