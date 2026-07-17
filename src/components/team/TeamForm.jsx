import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useLang } from '@/lib/LanguageContext';
import { FORMATS, FORMAT_KEYS, formationsFor, getFormat } from '@/lib/teamFormats';

// Mini pitch drawn from the format's real default-formation layout, so the
// card literally shows how many players take the field.
function MiniPitch({ formatKey, selected }) {
  const fmt = FORMATS[formatKey];
  const layout = fmt.layouts[fmt.defaultFormation];
  const dot = selected ? '#4ADE80' : '#94A39A';
  return (
    <svg viewBox="0 0 60 84" className="w-full h-auto" aria-hidden="true">
      <rect x="3" y="3" width="54" height="78" rx="3" fill="none"
        stroke={selected ? 'rgba(74,222,128,.45)' : 'rgba(148,163,184,.35)'} strokeWidth="1.5" />
      <line x1="3" y1="42" x2="57" y2="42"
        stroke={selected ? 'rgba(74,222,128,.35)' : 'rgba(148,163,184,.25)'} strokeWidth="1" />
      {layout.map((slot, i) => (
        <circle key={i} cx={3 + (slot.x / 100) * 54} cy={3 + (slot.y / 100) * 78}
          r={3} fill={dot} opacity={selected ? 1 : 0.75} />
      ))}
    </svg>
  );
}

const AGE_GROUPS_HE = ['ילדים', 'נערים', 'נוער', 'בוגרים'];
const AGE_GROUPS_EN = ['Children', 'Youth', 'Juniors', 'Adults'];
const PLAYING_STYLES_HE = ['התקפי', 'מאוזן', 'הגנתי', 'החזקת כדור', 'קונטרה'];
const PLAYING_STYLES_EN = ['Attacking', 'Balanced', 'Defensive', 'Possession', 'Counter-Attack'];

export default function TeamForm({ isOpen, onClose, team, onSave }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';

  const _ageGroups = isHe ? AGE_GROUPS_HE : AGE_GROUPS_EN;
  const _playingStyles = isHe ? PLAYING_STYLES_HE : PLAYING_STYLES_EN;

  const [formData, setFormData] = useState({
    name: '', age_group: '', league: '', format: '11v11', formation: '4-4-2',
    playing_style: 'מאוזן', tactical_focus: '',
  });

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '', age_group: team.age_group || '',
        league: team.league || '', format: team.format || '11v11',
        formation: team.formation || getFormat(team.format || '11v11').defaultFormation,
        playing_style: team.playing_style || 'מאוזן', tactical_focus: team.tactical_focus || '',
      });
    } else {
      setFormData({ name: '', age_group: '', league: '', format: '11v11', formation: '4-4-2', playing_style: 'מאוזן', tactical_focus: '' });
    }
  }, [team, isOpen]);

  const formations = formationsFor(formData.format);

  // Switching format invalidates a formation from another format —
  // snap to the new format's default.
  const handleFormatChange = (format) => {
    setFormData(prev => ({
      ...prev,
      format,
      formation: formationsFor(format).includes(prev.formation)
        ? prev.formation
        : getFormat(format).defaultFormation,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {team ? (isHe ? 'עריכת קבוצה' : 'Edit Team') : (isHe ? 'קבוצה חדשה' : 'New Team')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{isHe ? 'שם הקבוצה' : 'Team Name'}</Label>
            <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isHe ? 'קבוצת גיל' : 'Age Group'}</Label>
              <Select value={formData.age_group} onValueChange={(v) => setFormData(prev => ({ ...prev, age_group: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder={isHe ? 'בחר' : 'Select'} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {AGE_GROUPS_HE.map((ag, i) => (
                    <SelectItem key={ag} value={ag} className="text-white hover:bg-slate-700">
                      {isHe ? ag : AGE_GROUPS_EN[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isHe ? 'ליגה' : 'League'}</Label>
              <Input value={formData.league} onChange={(e) => setFormData(prev => ({ ...prev, league: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">{isHe ? 'באיזה פורמט הקבוצה משחקת?' : 'Which format does the team play?'}</Label>
            <div className="grid grid-cols-3 gap-3">
              {FORMAT_KEYS.map((key) => {
                const selected = formData.format === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFormatChange(key)}
                    aria-pressed={selected}
                    className="rounded-xl p-3 text-center transition-all"
                    style={{
                      backgroundColor: selected ? 'rgba(74,222,128,0.10)' : 'rgba(30,41,59,0.6)',
                      border: `2px solid ${selected ? '#4ADE80' : 'rgba(71,85,105,0.6)'}`,
                      boxShadow: selected ? '0 0 18px rgba(74,222,128,0.15)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="w-12 mx-auto mb-2">
                      <MiniPitch formatKey={key} selected={selected} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: selected ? '#4ADE80' : '#E2E8F0', fontFamily: "'Heebo',sans-serif" }}>
                      {FORMATS[key].label}
                    </p>
                    <p className="text-[10px] mt-0.5 leading-snug" style={{ color: selected ? 'rgba(74,222,128,0.75)' : '#94A39A' }}>
                      {FORMATS[key].subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isHe ? 'מערך משחק' : 'Formation'}</Label>
              <Select value={formData.formation} onValueChange={(v) => setFormData(prev => ({ ...prev, formation: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  {/* Explicit text: Radix drops the cached label when the
                      format switch swaps the item list under a closed select */}
                  <span>{formData.formation}</span>
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {formations.map((f) => (
                    <SelectItem key={f} value={f} className="text-white hover:bg-slate-700">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isHe ? 'סגנון משחק' : 'Playing Style'}</Label>
              <Select value={formData.playing_style} onValueChange={(v) => setFormData(prev => ({ ...prev, playing_style: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PLAYING_STYLES_HE.map((s, i) => (
                    <SelectItem key={s} value={s} className="text-white hover:bg-slate-700">
                      {isHe ? s : PLAYING_STYLES_EN[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{isHe ? 'דגש טקטי מרכזי' : 'Main Tactical Focus'}</Label>
            <Input value={formData.tactical_focus} onChange={(e) => setFormData(prev => ({ ...prev, tactical_focus: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder={isHe ? 'לדוגמה: בנייה מהשוער' : 'e.g. Build from the goalkeeper'} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>{isHe ? 'ביטול' : 'Cancel'}</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              {team ? (isHe ? 'שמור שינויים' : 'Save Changes') : (isHe ? 'צור קבוצה' : 'Create Team')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}