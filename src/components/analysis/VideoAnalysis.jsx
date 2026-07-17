import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Video, Plus, Trash2, Sparkles } from 'lucide-react';

export default function VideoAnalysis({ isOpen, onClose, onSave, team, existingMatch }) {
  const [formData, setFormData] = useState({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    result: { our_score: 0, opponent_score: 0 },
    video_moments: [],
  });
  const [currentMoment, setCurrentMoment] = useState({
    timestamp: '',
    situation_tag: '',
    note: '',
    decision_type: '',
  });
  const [generating, setGenerating] = useState(false);
  
  // Pre-fill from existing match when adding analysis
  React.useEffect(() => {
    if (existingMatch && isOpen) {
      setFormData({
        opponent: existingMatch.opponent,
        date: existingMatch.date,
        result: existingMatch.result,
        video_moments: [],
      });
    }
  }, [existingMatch, isOpen]);

  const situationTags = [
    'בניית התקפה',
    'מעבר התקפי',
    'מעבר הגנתי',
    'הגנה מסודרת',
    'כדור קבוע התקפי',
    'כדור קבוע הגנתי',
    'לחץ גבוה',
    'בלוק נמוך',
    'שליש אחרון',
    'קונטרה',
    'אובדן כדור',
  ];

  const decisionTypes = [
    'החלטה נכונה',
    'החלטה שגויה',
    'הסס / איחר',
    'טעות טכנית',
    'בעיה קבוצתית',
  ];

  const addMoment = () => {
    if (currentMoment.timestamp && currentMoment.note) {
      setFormData(prev => ({
        ...prev,
        video_moments: [...prev.video_moments, { ...currentMoment, id: Date.now() }]
      }));
      setCurrentMoment({
        timestamp: '',
        situation_tag: '',
        note: '',
        decision_type: '',
      });
    }
  };

  const removeMoment = (id) => {
    setFormData(prev => ({
      ...prev,
      video_moments: prev.video_moments.filter(m => m.id !== id)
    }));
  };

  const generateReport = async () => {
    setGenerating(true);
    
    const momentsText = formData.video_moments.map((m, i) => 
      `${i+1}. [${m.timestamp}] ${m.situation_tag} - ${m.decision_type}: ${m.note}`
    ).join('\n');

    const prompt = `אתה מנתח כדורגל מקצועי מומחה. נתח את המשחק על בסיס רגעי מפתח שתועדו, בחלוקה לפי שלבי משחק.

### הקשר
קבוצה: ${team?.name || 'הקבוצה שלנו'}
סגנון משחק: ${team?.playing_style || 'לא צוין'}
מערך: ${team?.formation || 'לא צוין'}
נגד: ${formData.opponent}
תוצאה: ${formData.result.our_score}-${formData.result.opponent_score}

### רגעי מפתח שתועדו (${formData.video_moments.length})
${momentsText}

### תהליך הניתוח
1. **זיהוי דפוסים חוזרים**: קבץ את הרגעים לפי שלבי משחק וזהה מגמות
2. **ניתוח לפי שלבים**: 
   - בניית התקפה: איך בנינו? מה עבד? מה לא?
   - מעברים (התקפי/הגנתי): איך הגבנו? האם היה תיאום?
   - הגנה מסודרת: איך סגרנו? איפה היו פערים?
   - מצבים נייחים: איך ביצענו כדורים קבועים?
3. **חיבור לבעיות**: קשר בין רגעים דומים שחזרו
4. **המלצות אופרטיביות**: תרגילים ספציפיים לשבוע הבא

### דרישות
- התייחס **רק** לרגעים שתועדו, אל תמציא
- זהה דפוסים שחזרו לפחות פעמיים
- כל המלצה חייבת להיות מחוברת לדגש אימוני ברור
- השתמש בשפה מקצועית בעברית

זהה בעיות חוזרות (recurring), בעיות חדשות (new), ודברים שטופלו (אם רואים שיפור לעומת התיעוד).`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
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
                  attack: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } },
                  defense: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } }
                }
              },
              organized_defense: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } },
              set_pieces: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } }
            }
          },
          recurring_patterns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                frequency: { type: 'number' },
                status: { type: 'string', enum: ['ongoing', 'new', 'resolved'] }
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
          }
        },
      },
    });

    setGenerating(false);

    if (response?.__ai_error) {
      alert(`${response.__ai_error}\nהרגעים שתיעדת יישמרו ללא ניתוח.`);
    }

    // Convert to legacy format
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
      analysis_types: ['video'],
      phase_analysis: response.phase_analysis,
      recurring_patterns: response.recurring_patterns,
      training_actions: response.training_actions,
      report: legacyReport,
      analysis_mode: 'video',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-blue-400" />
            </div>
            ניתוח מבוסס וידאו
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-slate-300">
              צפה במשחק ותעד רגעים חשובים בזמן אמת. המערכת תזהה דפוסים חוזרים ותציע עבודה לאימון.
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
              <Input
                type="number"
                min="0"
                value={formData.result.our_score}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  result: { ...prev.result, our_score: parseInt(e.target.value) || 0 }
                }))}
                className="bg-slate-800 border-slate-700 text-white text-center flex-1"
                placeholder="אנחנו"
              />
              <span className="text-xl font-bold text-slate-500">-</span>
              <Input
                type="number"
                min="0"
                value={formData.result.opponent_score}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  result: { ...prev.result, opponent_score: parseInt(e.target.value) || 0 }
                }))}
                className="bg-slate-800 border-slate-700 text-white text-center flex-1"
                placeholder="יריבה"
              />
            </div>
          </div>

          {/* Add Moment Form */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              הוסף רגע מפתח
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <Input
                value={currentMoment.timestamp}
                onChange={(e) => setCurrentMoment(prev => ({ ...prev, timestamp: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="זמן (00:00)"
              />
              
              <Select 
                value={currentMoment.situation_tag}
                onValueChange={(value) => setCurrentMoment(prev => ({ ...prev, situation_tag: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="מצב משחק" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {situationTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={currentMoment.decision_type}
                onValueChange={(value) => setCurrentMoment(prev => ({ ...prev, decision_type: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="סוג החלטה" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {decisionTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              value={currentMoment.note}
              onChange={(e) => setCurrentMoment(prev => ({ ...prev, note: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="תיאור הרגע - מה קרה? מי היה מעורב? מה היה צריך לקרות?"
              rows={2}
            />

            <Button 
              onClick={addMoment}
              disabled={!currentMoment.timestamp || !currentMoment.note}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף רגע
            </Button>
          </div>

          {/* Moments List */}
          {formData.video_moments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-white">
                רגעים שתועדו ({formData.video_moments.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {formData.video_moments.map((moment) => (
                  <div key={moment.id} className="p-3 rounded-lg bg-slate-800 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-400 font-mono text-sm">{moment.timestamp}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {moment.situation_tag}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {moment.decision_type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{moment.note}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMoment(moment.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={onClose}>
              ביטול
            </Button>
            <Button 
              onClick={generateReport}
              disabled={generating || !formData.opponent || formData.video_moments.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מנתח דפוסים...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 ml-2" />
                  נתח דפוסים וצור דו״ח
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}