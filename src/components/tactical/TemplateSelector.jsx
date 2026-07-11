import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Library, Save, Grid3x3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TemplateSelector({ teamId, onLoadTemplate, onSaveAsTemplate, currentBoard, containerRef }) {
  const [showDialog, setShowDialog] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [builtInTemplates, setBuiltInTemplates] = useState([]);

  useEffect(() => {
    if (showDialog && teamId) {
      loadTemplates();
    }
  }, [showDialog, teamId]);

  const loadTemplates = async () => {
    // Load user templates
    const userTemplates = await base44.entities.TacticalBoard.filter({ 
      team_id: teamId, 
      is_template: true 
    });
    setTemplates(userTemplates);

    // Built-in templates
    setBuiltInTemplates([
      {
        name: '4-3-3 Build Up',
        template_type: '4-3-3',
        category: 'התקפה',
        description: 'בנייה מאחור במערך 4-3-3 עם קשרים רחבים',
        frames: [getFormationTemplate('4-3-3', 'buildup')]
      },
      {
        name: '4-4-2 High Press',
        template_type: '4-4-2',
        category: 'הגנה',
        description: 'לחץ גבוה עם חסימת מרכז',
        frames: [getFormationTemplate('4-4-2', 'pressing')]
      },
      {
        name: '3-5-2 Rest Defense',
        template_type: '3-5-2',
        category: 'הגנה',
        description: 'הגנה מאורגנת עם 5 קו אחורי',
        frames: [getFormationTemplate('3-5-2', 'defense')]
      },
      {
        name: 'Corner Kick Attack',
        template_type: 'corner_kick',
        category: 'כדור קבוע',
        description: 'מערך התקפי לקרן',
        frames: [getCornerKickTemplate()]
      },
    ]);
  };

  const getFormationTemplate = (formation, type) => {
    const templates = {
      '4-3-3': {
        buildup: {
          homePlayers: [
            { id: 'h1', x: 20, y: 45, number: 1, name: 'שוער', role: 'שוער יוזם', responsibility: 'בנייה מאחור' },
            { id: 'h2', x: 35, y: 20, number: 2, name: 'מ.ימין', role: 'בק תומך', responsibility: 'רוחב וקבלה' },
            { id: 'h3', x: 35, y: 38, number: 4, name: 'בלם 1', role: 'בלם מוביל', responsibility: 'מסירות קדימה' },
            { id: 'h4', x: 35, y: 52, number: 5, name: 'בלם 2', role: 'בלם כיסוי', responsibility: 'ביטחון' },
            { id: 'h5', x: 35, y: 70, number: 3, name: 'מ.שמאל', role: 'בק תומך', responsibility: 'רוחב וקבלה' },
            { id: 'h6', x: 60, y: 45, number: 6, name: 'אנכר', role: 'קשר הגנתי', responsibility: 'חיבור ואיזון' },
            { id: 'h7', x: 75, y: 30, number: 8, name: 'קשר ימין', role: 'קשר מחבר', responsibility: 'תמיכה והתקדמות' },
            { id: 'h8', x: 75, y: 60, number: 10, name: 'קשר שמאל', role: 'קשר מחבר', responsibility: 'תמיכה והתקדמות' },
            { id: 'h9', x: 120, y: 20, number: 7, name: 'כנף ימין', role: 'כנף רחב', responsibility: 'עומק ורוחב' },
            { id: 'h10', x: 130, y: 45, number: 9, name: 'חלוץ', role: 'חלוץ מרכזי', responsibility: 'סיום וחיבור' },
            { id: 'h11', x: 120, y: 70, number: 11, name: 'כנף שמאל', role: 'כנף רחב', responsibility: 'עומק ורוחב' },
          ],
          layers: { buildup: true, pressing: false, restDefense: false, setPieces: false },
          heatZones: [
            { id: 'z1', x: 15, y: 20, width: 30, height: 50, color: '#10b981', opacity: 0.3, label: 'אזור בנייה', tacticalGoal: 'שמירה על הכדור ויציאה בטוחה', layerType: 'buildup' }
          ]
        },
        pressing: {
          homePlayers: [
            { id: 'h1', x: 20, y: 45, number: 1, name: 'שוער', role: 'שוער שומר', responsibility: 'כיסוי עומק' },
            { id: 'h2', x: 60, y: 15, number: 2, name: 'מ.ימין', role: 'בק לוחץ', responsibility: 'לחץ על כנף' },
            { id: 'h3', x: 50, y: 35, number: 4, name: 'בלם 1', role: 'בלם לוחץ', responsibility: 'לחץ על מרכז' },
            { id: 'h4', x: 50, y: 55, number: 5, name: 'בלם 2', role: 'בלם לוחץ', responsibility: 'לחץ על מרכז' },
            { id: 'h5', x: 60, y: 75, number: 3, name: 'מ.שמאל', role: 'בק לוחץ', responsibility: 'לחץ על כנף' },
            { id: 'h6', x: 75, y: 45, number: 6, name: 'אנכר', role: 'מסנן', responsibility: 'סגירת מסלולים' },
            { id: 'h7', x: 90, y: 30, number: 8, name: 'קשר ימין', role: 'לוחץ', responsibility: 'לחץ על קשרים' },
            { id: 'h8', x: 90, y: 60, number: 10, name: 'קשר שמאל', role: 'לוחץ', responsibility: 'לחץ על קשרים' },
            { id: 'h9', x: 110, y: 20, number: 7, name: 'כנף ימין', role: 'לוחץ רחב', responsibility: 'חסימת בק' },
            { id: 'h10', x: 115, y: 45, number: 9, name: 'חלוץ', role: 'לוחץ ראשון', responsibility: 'הכוונת לחץ' },
            { id: 'h11', x: 110, y: 70, number: 11, name: 'כנף שמאל', role: 'לוחץ רחב', responsibility: 'חסימת בק' },
          ],
          layers: { buildup: false, pressing: true, restDefense: false, setPieces: false },
          heatZones: [
            { id: 'z1', x: 80, y: 15, width: 50, height: 60, color: '#ef4444', opacity: 0.3, label: 'אזור לחץ', tacticalGoal: 'כיבוש כדור ומניעת בנייה', layerType: 'pressing' }
          ]
        }
      },
      '4-4-2': {
        pressing: {
          homePlayers: [
            { id: 'h1', x: 20, y: 45, number: 1, name: 'שוער', role: 'שוער', responsibility: 'כיסוי' },
            { id: 'h2', x: 55, y: 15, number: 2, name: 'מ.ימין', role: 'בק', responsibility: 'לחץ צד' },
            { id: 'h3', x: 45, y: 35, number: 4, name: 'בלם 1', role: 'בלם', responsibility: 'חסימת מרכז' },
            { id: 'h4', x: 45, y: 55, number: 5, name: 'בלם 2', role: 'בלם', responsibility: 'חסימת מרכז' },
            { id: 'h5', x: 55, y: 75, number: 3, name: 'מ.שמאל', role: 'בק', responsibility: 'לחץ צד' },
            { id: 'h6', x: 75, y: 25, number: 7, name: 'קשר ימין', role: 'קשר', responsibility: 'לחץ' },
            { id: 'h7', x: 70, y: 40, number: 8, name: 'קשר מרכזי 1', role: 'קשר', responsibility: 'חסימת מרכז' },
            { id: 'h8', x: 70, y: 50, number: 6, name: 'קשר מרכזי 2', role: 'קשר', responsibility: 'חסימת מרכז' },
            { id: 'h9', x: 75, y: 65, number: 11, name: 'קשר שמאל', role: 'קשר', responsibility: 'לחץ' },
            { id: 'h10', x: 100, y: 35, number: 9, name: 'חלוץ 1', role: 'חלוץ', responsibility: 'לחץ ראשון' },
            { id: 'h11', x: 100, y: 55, number: 10, name: 'חלוץ 2', role: 'חלוץ', responsibility: 'לחץ ראשון' },
          ],
          layers: { buildup: false, pressing: true, restDefense: false, setPieces: false },
          heatZones: [
            { id: 'z1', x: 65, y: 25, width: 45, height: 40, color: '#ef4444', opacity: 0.4, label: 'מלכודת מרכזית', tacticalGoal: 'כיווץ מרחב וכיבוש', layerType: 'pressing' }
          ]
        }
      },
      '3-5-2': {
        defense: {
          homePlayers: [
            { id: 'h1', x: 20, y: 45, number: 1, name: 'שוער', role: 'שוער', responsibility: 'ארגון הגנה' },
            { id: 'h2', x: 40, y: 28, number: 4, name: 'בלם ימין', role: 'בלם', responsibility: 'כיסוי צד' },
            { id: 'h3', x: 40, y: 45, number: 5, name: 'בלם מרכזי', role: 'בלם מוביל', responsibility: 'ארגון קו' },
            { id: 'h4', x: 40, y: 62, number: 3, name: 'בלם שמאל', role: 'בלם', responsibility: 'כיסוי צד' },
            { id: 'h5', x: 60, y: 12, number: 2, name: 'אגף ימין', role: 'אגף', responsibility: 'רוחב והגנה' },
            { id: 'h6', x: 60, y: 30, number: 8, name: 'קשר ימין', role: 'קשר', responsibility: 'מיקום הגנתי' },
            { id: 'h7', x: 60, y: 45, number: 6, name: 'קשר מרכזי', role: 'אנכר', responsibility: 'חסימת מרכז' },
            { id: 'h8', x: 60, y: 60, number: 10, name: 'קשר שמאל', role: 'קשר', responsibility: 'מיקום הגנתי' },
            { id: 'h9', x: 60, y: 78, number: 3, name: 'אגף שמאל', role: 'אגף', responsibility: 'רוחב והגנה' },
            { id: 'h10', x: 85, y: 38, number: 9, name: 'חלוץ 1', role: 'חלוץ', responsibility: 'לחץ מבוקר' },
            { id: 'h11', x: 85, y: 52, number: 11, name: 'חלוץ 2', role: 'חלוץ', responsibility: 'לחץ מבוקר' },
          ],
          layers: { buildup: false, pressing: false, restDefense: true, setPieces: false },
          heatZones: [
            { id: 'z1', x: 30, y: 15, width: 50, height: 60, color: '#3b82f6', opacity: 0.3, label: 'בלוק הגנתי', tacticalGoal: 'שמירה על מבנה וצפיפות', layerType: 'restDefense' }
          ]
        }
      }
    };

    return templates[formation]?.[type] || templates['4-3-3'].buildup;
  };

  const getCornerKickTemplate = () => ({
    homePlayers: [
      { id: 'h1', x: 20, y: 45, number: 1, name: 'שוער', role: 'שוער', responsibility: 'שמירה על שער' },
      { id: 'h2', x: 160, y: 35, number: 5, name: 'בלם 1', role: 'תוקף גבוה', responsibility: 'כותרת חזיתית' },
      { id: 'h3', x: 165, y: 42, number: 4, name: 'בלם 2', role: 'תוקף גבוה', responsibility: 'כותרת אזור קרוב' },
      { id: 'h4', x: 170, y: 50, number: 9, name: 'חלוץ', role: 'תוקף מרכזי', responsibility: 'סיום במגע ראשון' },
      { id: 'h5', x: 155, y: 55, number: 10, name: 'תוקף', role: 'רץ מאחור', responsibility: 'ריצה לעמוד הרחוק' },
      { id: 'h6', x: 150, y: 25, number: 7, name: 'תוקף', role: 'רץ מאחור', responsibility: 'ריצה לעמוד הקרוב' },
      { id: 'h7', x: 135, y: 45, number: 8, name: 'קשר', role: 'תומך', responsibility: 'כדורים חוזרים' },
      { id: 'h8', x: 100, y: 45, number: 6, name: 'קשר', role: 'מגן נגדי', responsibility: 'כיסוי נגדי' },
      { id: 'h9', x: 60, y: 30, number: 2, name: 'מגן', role: 'מגן נגדי', responsibility: 'כיסוי נגדי' },
      { id: 'h10', x: 60, y: 60, number: 3, name: 'מגן', role: 'מגן נגדי', responsibility: 'כיסוי נגדי' },
      { id: 'h11', x: 185, y: 12, number: 11, name: 'מבצע', role: 'מבצע קרן', responsibility: 'העברה מדויקת' },
    ],
    ball: { x: 185, y: 12 },
    layers: { buildup: false, pressing: false, restDefense: false, setPieces: true },
    heatZones: [
      { id: 'z1', x: 155, y: 30, width: 25, height: 30, color: '#f59e0b', opacity: 0.3, label: 'אזור יעד', tacticalGoal: 'ריכוז תוקפים וכותרות', layerType: 'setPieces' }
    ]
  });

  const handleSaveAsTemplate = async () => {
    if (!currentBoard) return;
    
    const templateName = prompt('שם התבנית:');
    if (!templateName) return;

    await base44.entities.TacticalBoard.create({
      ...currentBoard,
      name: templateName,
      is_template: true,
      team_id: teamId,
    });

    loadTemplates();
  };

  return (
    <>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDialog(true)}
          className="flex-1 text-xs text-slate-400"
        >
          <Library className="w-3 h-3 ml-1" />
          תבניות
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveAsTemplate}
          className="flex-1 text-xs text-slate-400"
        >
          <Save className="w-3 h-3 ml-1" />
          שמור כתבנית
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[80vh] overflow-y-auto" container={containerRef?.current}>
          <DialogHeader>
            <DialogTitle>בחר תבנית</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Built-in Templates */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">תבניות מובנות</h3>
              <div className="grid grid-cols-2 gap-3">
                {builtInTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onLoadTemplate(template);
                      setShowDialog(false);
                    }}
                    className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-right transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white">{template.name}</h4>
                      <Grid3x3 className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100" />
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{template.description}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                        {template.category}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                        {template.template_type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* User Templates */}
            {templates.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">התבניות שלי</h3>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        onLoadTemplate(template);
                        setShowDialog(false);
                      }}
                      className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-right transition-all"
                    >
                      <h4 className="font-medium text-white mb-1">{template.name}</h4>
                      {template.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{template.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}