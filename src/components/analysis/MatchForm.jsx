import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';

export default function MatchForm({ isOpen, onClose, onSave, team }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';

  const [formData, setFormData] = useState({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    result: { our_score: 0, opponent_score: 0 },
    stats: {
      shots: undefined, shots_on_target: undefined, xg: undefined, possession: undefined,
      passes: undefined, pass_accuracy: undefined, tackles: undefined,
      interceptions: undefined, turnovers: undefined, critical_errors: undefined,
    },
  });
  const [generating, setGenerating] = useState(false);

  const handleStatChange = (key, value) => {
    setFormData(prev => ({ ...prev, stats: { ...prev.stats, [key]: value === '' ? undefined : parseFloat(value) } }));
  };

  const generateReport = async () => {
    setGenerating(true);

    const filledStats = Object.entries(formData.stats)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const prompt = `You are a professional football analyst. Analyze the following match and create a concise, practical report.

Team: ${team?.name || 'Our team'}
Playing style: ${team?.playing_style || 'Not specified'}
Formation: ${team?.formation || 'Not specified'}
Opponent: ${formData.opponent}
Result: ${formData.result.our_score}-${formData.result.opponent_score}
Stats: ${filledStats || 'Not provided'}

Create a report with:
1. Brief summary (2-3 sentences)
2. 2-3 specific positives
3. 2-3 main issues to address
4. 2-3 practical recommendations for upcoming training

Use data if provided but don't invent numbers. Reply in ${isHe ? 'Hebrew' : 'English'}.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          positives: { type: 'array', items: { type: 'string' } },
          issues: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    setGenerating(false);
    onSave({ ...formData, report: response });
  };

  const statFields = [
    { key: 'shots',           label: isHe ? 'בעיטות לשער' : 'Shots' },
    { key: 'shots_on_target', label: isHe ? 'בעיטות למסגרת' : 'Shots on Target' },
    { key: 'xg',              label: isHe ? 'xG (שערים צפויים)' : 'xG (Expected Goals)', step: 0.1 },
    { key: 'possession',      label: isHe ? 'אחוז שליטה' : 'Possession %', max: 100 },
    { key: 'passes',          label: isHe ? 'מסירות' : 'Passes' },
    { key: 'pass_accuracy',   label: isHe ? 'דיוק מסירות (%)' : 'Pass Accuracy (%)', max: 100 },
    { key: 'tackles',         label: isHe ? 'תיקולים' : 'Tackles' },
    { key: 'interceptions',   label: isHe ? 'יירוטים' : 'Interceptions' },
    { key: 'turnovers',       label: isHe ? 'איבודי כדור' : 'Turnovers' },
    { key: 'critical_errors', label: isHe ? 'טעויות קריטיות' : 'Critical Errors' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isHe ? 'ניתוח משחק חדש' : 'New Match Analysis'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isHe ? 'יריבה' : 'Opponent'}</Label>
              <Input
                value={formData.opponent}
                onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder={isHe ? 'שם הקבוצה היריבה' : 'Opponent team name'}
                required
              />
            </div>
            <div>
              <Label>{isHe ? 'תאריך' : 'Date'}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label>{isHe ? 'תוצאה' : 'Score'}</Label>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex-1">
                <Input type="number" min="0"
                  value={formData.result.our_score}
                  onChange={(e) => setFormData(prev => ({ ...prev, result: { ...prev.result, our_score: parseInt(e.target.value) || 0 } }))}
                  className="bg-slate-800 border-slate-700 text-white text-center text-xl"
                />
                <p className="text-xs text-slate-500 text-center mt-1">{isHe ? 'אנחנו' : 'Us'}</p>
              </div>
              <span className="text-2xl font-bold text-slate-500">-</span>
              <div className="flex-1">
                <Input type="number" min="0"
                  value={formData.result.opponent_score}
                  onChange={(e) => setFormData(prev => ({ ...prev, result: { ...prev.result, opponent_score: parseInt(e.target.value) || 0 } }))}
                  className="bg-slate-800 border-slate-700 text-white text-center text-xl"
                />
                <p className="text-xs text-slate-500 text-center mt-1">{isHe ? 'יריבה' : 'Opponent'}</p>
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">
              {isHe ? 'סטטיסטיקות (אופציונלי - מלא מה שיש לך)' : 'Statistics (optional — fill what you have)'}
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {statFields.map((field) => (
                <div key={field.key}>
                  <Input
                    type="number" min="0" max={field.max} step={field.step || 1}
                    value={formData.stats[field.key] ?? ''}
                    onChange={(e) => handleStatChange(field.key, e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder={field.label}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              {isHe ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={generateReport}
              disabled={generating || !formData.opponent}
              className="bg-emerald-600 hover:bg-emerald-700">
              {generating ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" />{isHe ? 'מנתח...' : 'Analyzing...'}</>
              ) : (
                <><Sparkles className="w-4 h-4 ml-2" />{isHe ? 'צור דו״ח ניתוח' : 'Generate Analysis'}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}