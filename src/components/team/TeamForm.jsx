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

const AGE_GROUPS_HE = ['ילדים', 'נערים', 'נוער', 'בוגרים'];
const AGE_GROUPS_EN = ['Children', 'Youth', 'Juniors', 'Adults'];
const formations = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1', '4-1-4-1'];
const PLAYING_STYLES_HE = ['התקפי', 'מאוזן', 'הגנתי', 'החזקת כדור', 'קונטרה'];
const PLAYING_STYLES_EN = ['Attacking', 'Balanced', 'Defensive', 'Possession', 'Counter-Attack'];

export default function TeamForm({ isOpen, onClose, team, onSave }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';

  const ageGroups = isHe ? AGE_GROUPS_HE : AGE_GROUPS_EN;
  const playingStyles = isHe ? PLAYING_STYLES_HE : PLAYING_STYLES_EN;

  const [formData, setFormData] = useState({
    name: '', age_group: '', league: '', formation: '4-4-2',
    playing_style: 'מאוזן', tactical_focus: '',
  });

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '', age_group: team.age_group || '',
        league: team.league || '', formation: team.formation || '4-4-2',
        playing_style: team.playing_style || 'מאוזן', tactical_focus: team.tactical_focus || '',
      });
    } else {
      setFormData({ name: '', age_group: '', league: '', formation: '4-4-2', playing_style: 'מאוזן', tactical_focus: '' });
    }
  }, [team, isOpen]);

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isHe ? 'מערך משחק' : 'Formation'}</Label>
              <Select value={formData.formation} onValueChange={(v) => setFormData(prev => ({ ...prev, formation: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
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