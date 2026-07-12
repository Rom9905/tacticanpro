import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';

const POSITIONS_HE = ['שוער', 'בלם', 'מגן ימין', 'מגן שמאל', 'קשר הגנתי', 'קשר מרכזי', 'קשר התקפי', 'כנף ימין', 'כנף שמאל', 'חלוץ'];
const POSITIONS_EN = ['Goalkeeper', 'Centre-Back', 'Right Back', 'Left Back', 'Defensive Mid', 'Central Mid', 'Attacking Mid', 'Right Wing', 'Left Wing', 'Striker'];

const STATUSES_HE = ['זמין', 'פצוע', 'מושעה', 'לא זמין'];
const STATUSES_EN = ['Available', 'Injured', 'Suspended', 'Unavailable'];

const ROLES_HE = [
  'שוער יוזם', 'שוער שומר',
  'בלם מוביל', 'בלם כיסוי', 'בלם מהיר',
  'מגן תומך', 'מגן מכסה',
  'אנקר הגנתי', 'קשר מאזן', 'קשר מחבר', 'קשר עמוק',
  'בוקס טו בוקס', 'יוצר משחק', 'עשר קלאסי',
  'כנף רחב', 'כנף חודרני', 'כנף חותך',
  'חלוץ מסיים', 'חלוץ מטרה', 'חלוץ נופל', 'שני חודים'
];
const ROLES_EN = [
  'Sweeper Keeper', 'Shot-Stopper',
  'Ball-Playing CB', 'Cover CB', 'Aggressive CB',
  'Inverted FB', 'Wingback',
  'Defensive Anchor', 'Box-to-Box', 'Deep Playmaker', 'Holding Mid',
  'Box-to-Box Mid', 'Playmaker', 'Classic No.10',
  'Wide Winger', 'Inside Forward', 'Inverted Winger',
  'Poacher', 'Target Man', 'False 9', 'Second Striker'
];

const SKILL_OPTIONS_HE = [
  'מהירות', 'כוח פיזי', 'סיבולת', 'שליטה תחת לחץ', 'דריבלים',
  'מסירות קצרות', 'מסירות ארוכות', 'בעיטות', 'משחק ראש',
  'תיקולים', 'קריאת מסירה', 'חיתוך קווי מסירה',
  'מיקום הגנתי', 'מיקום התקפי', 'ראיית משחק', 'החלטות',
  'מנהיגות', 'ריכוז', 'ריצות עומק',
  '1 על 1 התקפי', '1 על 1 הגנתי', 'משחק גב',
  'בנייה משוער', 'תנועה ללא כדור', 'משחק בלחץ', 'עבודה הגנתית',
  'קבלת החלטות תחת לחץ', 'זיהוי יתרון מספרי', 'שמירה על מבנה',
  'תזמון יציאה ללחץ', 'תגובה לאיבוד כדור',
  'הגנה על חצי מרחב', 'סגירת קו מסירה אחורי',
  'שמירה באחד על אחד', 'חיפוי הגנתי',
  'פתיחת קווי מסירה', 'משחק בין הקווים', 'הצטרפות מאוחרת לרחבה',
  'אחריות טקטית', 'ריכוז לאורך משחק', 'תגובה לטעויות',
  'משמעת קבוצתית', 'אינטנסיביות', 'קצב משחק',
  'יכולת חזרה להגנה', 'עמידות בעומס משחק'
];
const SKILL_OPTIONS_EN = [
  'Speed', 'Physical Strength', 'Stamina', 'Composure Under Pressure', 'Dribbling',
  'Short Passing', 'Long Passing', 'Shooting', 'Heading',
  'Tackling', 'Reading Passes', 'Intercepting Pass Lines',
  'Defensive Positioning', 'Attacking Positioning', 'Vision', 'Decision Making',
  'Leadership', 'Concentration', 'Runs Behind',
  '1v1 Attacking', '1v1 Defending', 'Back to Goal',
  'Build-up from GK', 'Movement Off Ball', 'Playing Under Pressure', 'Defensive Work Rate',
  'Decision Under Pressure', 'Numerical Advantage Recognition', 'Maintaining Shape',
  'Press Timing', 'Reaction to Ball Loss',
  'Half-Space Defense', 'Blocking Back Pass Lines',
  '1v1 Marking', 'Defensive Cover',
  'Opening Pass Lines', 'Between the Lines', 'Late Box Runs',
  'Tactical Responsibility', 'Focus Throughout Match', 'Mistake Recovery',
  'Team Discipline', 'Intensity', 'Game Pace',
  'Recovery Runs', 'Workload Resistance'
];

const GK_SKILL_OPTIONS_HE = [
  'רפלקסים', 'עצירות קו', 'אחד על אחד', 'יציאה לכדורי גובה',
  'מיקום', 'תזמון יציאה', 'שליטה ברחבה',
  'מסירה קצרה', 'מסירה ארוכה/דיוק פתיחה', 'קבלת החלטות תחת לחץ',
  'זריזות', 'קפיצה', 'כוח גוף',
  'תקשורת עם ההגנה', 'מנהיגות', 'ריכוז',
  'בנייה מהגנה', 'שליטה בכדור ברגל', 'הפצה מהירה',
  'הגנה על חצי מרחב', 'קריאת המשחק', 'אומץ',
  'עמידות בלחץ', 'ריכוז לאורך משחק'
];
const GK_SKILL_OPTIONS_EN = [
  'Reflexes', 'Shot Stopping', 'One-on-One', 'Claiming High Balls',
  'Positioning', 'Coming Out Timing', 'Box Control',
  'Short Distribution', 'Long Distribution / Accuracy', 'Decision Under Pressure',
  'Agility', 'Jumping', 'Physical Strength',
  'Communication with Defense', 'Leadership', 'Concentration',
  'Playing from Back', 'Footwork', 'Quick Distribution',
  'Half-Space Defense', 'Reading the Game', 'Bravery',
  'Pressure Resistance', 'Focus Throughout Match'
];

const GK_SKILL_RATINGS_HE = [
  { key: 'reflexes', label: 'רפלקסים' },
  { key: 'shot_stopping', label: 'עצירות קו' },
  { key: 'one_on_one', label: 'אחד על אחד' },
  { key: 'high_balls', label: 'כדורי גובה' },
  { key: 'positioning', label: 'מיקום' },
  { key: 'timing', label: 'תזמון יציאה' },
  { key: 'box_control', label: 'שליטה ברחבה' },
  { key: 'short_passing', label: 'מסירה קצרה' },
  { key: 'long_passing', label: 'מסירה ארוכה' },
  { key: 'decision_under_pressure', label: 'החלטות תחת לחץ' },
  { key: 'agility', label: 'זריזות' },
  { key: 'jumping', label: 'קפיצה' },
  { key: 'physical_strength', label: 'כוח גוף' },
];
const GK_SKILL_RATINGS_EN = [
  { key: 'reflexes', label: 'Reflexes' },
  { key: 'shot_stopping', label: 'Shot Stopping' },
  { key: 'one_on_one', label: 'One-on-One' },
  { key: 'high_balls', label: 'High Balls' },
  { key: 'positioning', label: 'Positioning' },
  { key: 'timing', label: 'Coming Out Timing' },
  { key: 'box_control', label: 'Box Control' },
  { key: 'short_passing', label: 'Short Distribution' },
  { key: 'long_passing', label: 'Long Distribution' },
  { key: 'decision_under_pressure', label: 'Decision Under Pressure' },
  { key: 'agility', label: 'Agility' },
  { key: 'jumping', label: 'Jumping' },
  { key: 'physical_strength', label: 'Physical Strength' },
];

const FIELD_SKILL_RATINGS_HE = [
  { key: 'passing', label: 'מסירה' },
  { key: 'dribbling', label: 'דריבל' },
  { key: 'finishing', label: 'סיומת' },
  { key: 'tackling', label: 'תיקול' },
  { key: 'defensive_positioning', label: 'מיקום הגנתי' },
  { key: 'speed', label: 'מהירות' },
  { key: 'strength', label: 'כוח' },
  { key: 'heading', label: 'משחק ראש' },
  { key: 'vision', label: 'ראייה' },
  { key: 'decision_making', label: 'קבלת החלטות' },
];
const FIELD_SKILL_RATINGS_EN = [
  { key: 'passing', label: 'Passing' },
  { key: 'dribbling', label: 'Dribbling' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'tackling', label: 'Tackling' },
  { key: 'defensive_positioning', label: 'Def. Positioning' },
  { key: 'speed', label: 'Speed' },
  { key: 'strength', label: 'Strength' },
  { key: 'heading', label: 'Heading' },
  { key: 'vision', label: 'Vision' },
  { key: 'decision_making', label: 'Decision Making' },
];

export default function PlayerForm({ isOpen, onClose, player, onSave }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';

  const positions = isHe ? POSITIONS_HE : POSITIONS_EN;
  const statuses = isHe ? STATUSES_HE : STATUSES_EN;
  const roles = isHe ? ROLES_HE : ROLES_EN;
  const skillOptions = isHe ? SKILL_OPTIONS_HE : SKILL_OPTIONS_EN;
  const gkSkillOptions = isHe ? GK_SKILL_OPTIONS_HE : GK_SKILL_OPTIONS_EN;
  const gkSkillRatings = isHe ? GK_SKILL_RATINGS_HE : GK_SKILL_RATINGS_EN;
  const fieldSkillRatings = isHe ? FIELD_SKILL_RATINGS_HE : FIELD_SKILL_RATINGS_EN;

  const [formData, setFormData] = useState({
    name: '', number: '', position: '', position_secondary: '', role: '',
    status: STATUSES_HE[0], professional_status: 'יציב',
    is_starter: false, dominant_foot: '', games_played: 0, minutes_played: 0,
  });
  const [strengths, setStrengths] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [skillRatings, setSkillRatings] = useState({});
  const [showStrengthPicker, setShowStrengthPicker] = useState(false);
  const [showImprovementPicker, setShowImprovementPicker] = useState(false);

  const isGoalkeeper = formData.position === 'שוער' || formData.position === 'Goalkeeper';
  const activeSkillOptions = isGoalkeeper ? gkSkillOptions : skillOptions;
  const activeSkillRatings = isGoalkeeper ? gkSkillRatings : fieldSkillRatings;

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || '', number: player.number || '',
        position: player.position || '', position_secondary: player.position_secondary || '',
        role: player.role || '', status: player.status || STATUSES_HE[0],
        professional_status: player.professional_status || 'יציב',
        is_starter: player.is_starter || false, dominant_foot: player.dominant_foot || '',
        games_played: player.games_played || 0, minutes_played: player.minutes_played || 0,
      });
      setStrengths(player.strengths || []);
      setImprovements(player.improvements || []);
      setSkillRatings(player.skill_ratings || {});
    } else {
      setFormData({
        name: '', number: '', position: '', position_secondary: '', role: '',
        status: STATUSES_HE[0], professional_status: 'יציב',
        is_starter: false, dominant_foot: '', games_played: 0, minutes_played: 0,
      });
      setStrengths([]);
      setImprovements([]);
      setSkillRatings({});
    }
  }, [player, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      number: formData.number === '' ? null : formData.number,
      availability: formData.status,
      strengths,
      improvements,
      skill_ratings: skillRatings,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {player ? (isHe ? 'עריכת שחקן' : 'Edit Player') : (isHe ? 'הוספת שחקן' : 'Add Player')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isHe ? 'שם השחקן *' : 'Player Name *'}</Label>
                <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" required />
              </div>
              <div>
                <Label>{isHe ? 'מספר חולצה' : 'Shirt Number'}</Label>
                <Input type="number" value={formData.number} onChange={(e) => setFormData(prev => ({ ...prev, number: parseInt(e.target.value) || '' }))} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isHe ? 'עמדה ראשית *' : 'Primary Position *'}</Label>
                <Select value={formData.position} onValueChange={(v) => {
                  const wasGK = formData.position === 'שוער' || formData.position === 'Goalkeeper';
                  const isGK = v === 'שוער' || v === 'Goalkeeper';
                  if (wasGK !== isGK) { setStrengths([]); setImprovements([]); setSkillRatings({}); }
                  setFormData(prev => ({ ...prev, position: v }));
                }}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder={isHe ? 'בחר עמדה' : 'Select position'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={isHe ? pos : POSITIONS_HE[POSITIONS_EN.indexOf(pos)] || pos} className="text-white hover:bg-slate-700">{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isHe ? 'עמדת משנה' : 'Secondary Position'}</Label>
                <Select value={formData.position_secondary || ''} onValueChange={(v) => setFormData(prev => ({ ...prev, position_secondary: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder={isHe ? 'אופציונלי' : 'Optional'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value={null}>{isHe ? 'ללא' : 'None'}</SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={isHe ? pos : POSITIONS_HE[POSITIONS_EN.indexOf(pos)] || pos} className="text-white hover:bg-slate-700">{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{isHe ? 'תפקיד טקטי במערך' : 'Tactical Role'}</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder={isHe ? 'בחר תפקיד' : 'Select role'} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {roles.map((role, i) => (
                    <SelectItem key={role} value={ROLES_HE[i] || role} className="text-white hover:bg-slate-700">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isHe ? 'סטטוס זמינות' : 'Availability'}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {STATUSES_HE.map((status, i) => (
                      <SelectItem key={status} value={status} className="text-white hover:bg-slate-700">
                        {isHe ? status : STATUSES_EN[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isHe ? 'סטטוס מקצועי' : 'Professional Status'}</Label>
                <Select value={formData.professional_status} onValueChange={(v) => setFormData(prev => ({ ...prev, professional_status: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="בהתקדמות" className="text-white hover:bg-slate-700">{isHe ? 'בהתקדמות' : 'Progressing'}</SelectItem>
                    <SelectItem value="יציב" className="text-white hover:bg-slate-700">{isHe ? 'יציב' : 'Stable'}</SelectItem>
                    <SelectItem value="בירידה" className="text-white hover:bg-slate-700">{isHe ? 'בירידה' : 'Declining'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{isHe ? 'רגל דומיננטית' : 'Dominant Foot'}</Label>
              <Select value={formData.dominant_foot || ''} onValueChange={(v) => setFormData(prev => ({ ...prev, dominant_foot: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder={isHe ? 'בחר רגל' : 'Select foot'} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="ימין" className="text-white hover:bg-slate-700">{isHe ? 'ימין' : 'Right'}</SelectItem>
                  <SelectItem value="שמאל" className="text-white hover:bg-slate-700">{isHe ? 'שמאל' : 'Left'}</SelectItem>
                  <SelectItem value="שתיהן" className="text-white hover:bg-slate-700">{isHe ? 'שתיהן' : 'Both'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isHe ? 'משחקים ששיחק' : 'Games Played'}</Label>
                <Input type="number" min="0" value={formData.games_played} onChange={(e) => setFormData(prev => ({ ...prev, games_played: parseInt(e.target.value) || 0 }))} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <Label>{isHe ? 'דקות משחק' : 'Minutes Played'}</Label>
                <Input type="number" min="0" value={formData.minutes_played} onChange={(e) => setFormData(prev => ({ ...prev, minutes_played: parseInt(e.target.value) || 0 }))} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>

            {/* Strengths */}
            <div className="space-y-2">
              <Label>{isHe ? 'חוזקות (עד 5)' : 'Strengths (up to 5)'}</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {strengths.map((strength, index) => (
                  <Badge key={index} className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                    {strength}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setStrengths(strengths.filter((_, i) => i !== index))} />
                  </Badge>
                ))}
              </div>
              {strengths.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowStrengthPicker(true)} className="border-slate-700 text-slate-400">
                  <Plus className="w-3 h-3 ml-1" />
                  {isHe ? 'הוסף חוזקה' : 'Add Strength'}
                </Button>
              )}
            </div>

            {/* Improvements */}
            <div className="space-y-2">
              <Label>{isHe ? 'נקודות לשיפור (עד 5)' : 'Improvement Points (up to 5)'}</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {improvements.map((improvement, index) => (
                  <Badge key={index} className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                    {improvement}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setImprovements(improvements.filter((_, i) => i !== index))} />
                  </Badge>
                ))}
              </div>
              {improvements.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowImprovementPicker(true)} className="border-slate-700 text-slate-400">
                  <Plus className="w-3 h-3 ml-1" />
                  {isHe ? 'הוסף נקודה לשיפור' : 'Add Improvement Point'}
                </Button>
              )}
            </div>

            {/* Skill Ratings */}
            <div className="space-y-3 border-t border-slate-700 pt-4">
              <Label className="text-sm font-semibold">
                {isHe ? 'דירוגי יכולות (1-5) - אופציונלי' : 'Skill Ratings (1-5) - Optional'}
                {isGoalkeeper && <span className="text-emerald-400 mr-2 text-xs">({isHe ? 'יכולות שוער' : 'GK Skills'})</span>}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {activeSkillRatings.map(skill => (
                  <div key={skill.key}>
                    <Label className="text-xs text-slate-400">{skill.label}</Label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button key={rating} type="button" onClick={() => setSkillRatings(prev => ({ ...prev, [skill.key]: rating }))}
                          className={`w-7 h-7 rounded-full transition-all ${(skillRatings[skill.key] || 0) >= rating ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 hover:bg-slate-600'}`}>
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="is_starter" checked={formData.is_starter} onChange={(e) => setFormData(prev => ({ ...prev, is_starter: e.target.checked }))} className="rounded border-slate-700" />
              <Label htmlFor="is_starter" className="cursor-pointer">{isHe ? 'שחקן הרכב ראשי' : 'Starting Lineup Player'}</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>{isHe ? 'ביטול' : 'Cancel'}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {player ? (isHe ? 'שמור שינויים' : 'Save Changes') : (isHe ? 'הוסף שחקן' : 'Add Player')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Strength Picker */}
      <Dialog open={showStrengthPicker} onOpenChange={setShowStrengthPicker}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>{isHe ? 'בחר חוזקה' : 'Select Strength'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {activeSkillOptions.filter(skill => !strengths.includes(skill)).map(skill => (
              <Button key={skill} variant="outline" size="sm"
                onClick={() => { if (strengths.length < 5) { setStrengths([...strengths, skill]); setShowStrengthPicker(false); } }}
                className="border-slate-700 text-slate-300 hover:bg-emerald-500/20 hover:border-emerald-500/30 justify-start">
                {skill}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Improvement Picker */}
      <Dialog open={showImprovementPicker} onOpenChange={setShowImprovementPicker}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>{isHe ? 'בחר נקודה לשיפור' : 'Select Improvement Point'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {activeSkillOptions.filter(skill => !improvements.includes(skill)).map(skill => (
              <Button key={skill} variant="outline" size="sm"
                onClick={() => { if (improvements.length < 5) { setImprovements([...improvements, skill]); setShowImprovementPicker(false); } }}
                className="border-slate-700 text-slate-300 hover:bg-amber-500/20 hover:border-amber-500/30 justify-start">
                {skill}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}