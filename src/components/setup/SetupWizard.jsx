import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, ChevronRight,
  Plus, Trash2, CheckCircle2, Loader2
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { FORMATS, FORMAT_KEYS, formationsFor, getFormat, lineupSizeFor } from '@/lib/teamFormats';
import { MiniPitch } from '@/components/team/TeamForm';

const POSITIONS = ['שוער', 'בלם', 'מגן ימין', 'מגן שמאל', 'קשר הגנתי', 'קשר מרכזי', 'קשר התקפי', 'כנף ימין', 'כנף שמאל', 'חלוץ'];
const PLAYING_STYLES = ['התקפי', 'מאוזן', 'הגנתי', 'החזקת כדור', 'קונטרה'];


export default function SetupWizard({ onComplete, allowBackToHome }) {
  const [saving, setSaving] = useState(false);

  // Step 1
  const [teamName, setTeamName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [format, setFormat] = useState('11v11');
  const [league, setLeague] = useState('');
  const [playingStyle, setPlayingStyle] = useState('מאוזן');
  const [formation, setFormation] = useState('4-4-2');
  const [tacticalFocus, setTacticalFocus] = useState('');
  const [players, setPlayers] = useState(
    Array.from({ length: 15 }, (_, i) => ({ name: '', position: 'כנף ימין', number: i + 1 }))
  );

  // Switching format invalidates a formation from another format.
  const handleFormatChange = (key) => {
    setFormat(key);
    if (!formationsFor(key).includes(formation)) {
      setFormation(getFormat(key).defaultFormation);
    }
  };

  // Squad minimum follows the format: full lineup + 4 subs
  // (11v11 keeps the original 15).
  const minPlayers = lineupSizeFor(format) + 4;



  const addPlayer = () => {
    setPlayers(prev => [...prev, { name: '', position: 'כנף ימין', number: prev.length + 1 }]);
  };

  const removePlayer = (idx) => {
    setPlayers(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePlayer = (idx, field, value) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const filledPlayers = players.filter(p => p.name.trim());
  const canProceed = teamName.trim() && ageGroup && filledPlayers.length >= minPlayers;

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Create team
      const team = await base44.entities.Team.create({
        name: teamName,
        age_group: ageGroup,
        format,
        league: league || null,
        playing_style: playingStyle,
        formation,
        ...(format === '11v11' && tacticalFocus.trim() ? { tactical_focus: tacticalFocus.trim() } : {}),
      });

      // Create players
      await Promise.all(
        filledPlayers.map(p =>
          base44.entities.Player.create({
            team_id: team.id,
            name: p.name,
            position: p.position,
            number: Number(p.number),
          })
        )
      );

      await base44.auth.updateMe({ setup_complete: true, setup_team_id: team.id });

      onComplete(team.id);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-2xl font-bold text-white">TACTICAN<span className="text-emerald-500">PRO</span></span>
          </div>
          <p className="text-slate-400 text-sm">הוסף קבוצה ושחקנים</p>
        </div>



        {/* Card */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    הקבוצה והסגל
                  </h2>
                  <p className="text-slate-400 text-sm mb-5">מינימום {minPlayers} שחקנים כדי להמשיך</p>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">שם הקבוצה *</label>
                      <Input
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        placeholder="הפועל תל אביב"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">קבוצת גיל *</label>
                      <Select value={ageGroup} onValueChange={setAgeGroup}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="בחר" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {['ילדים', 'נערים', 'נוער', 'בוגרים'].map(a => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Format question — visual cards */}
                  <div className="mb-5">
                    <label className="text-xs text-slate-400 mb-2 block">באיזה פורמט הקבוצה משחקת? *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {FORMAT_KEYS.map((key) => {
                        const selected = format === key;
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

                  {/* Team identity: league, style, formation, tactical focus */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">ליגה</label>
                      <Input
                        value={league}
                        onChange={e => setLeague(e.target.value)}
                        placeholder="לדוגמה: ליגת ילדים א'"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">סגנון משחק</label>
                      <Select value={playingStyle} onValueChange={setPlayingStyle}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <span>{playingStyle}</span>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {PLAYING_STYLES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">מערך משחק</label>
                      <Select value={formation} onValueChange={setFormation}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          {/* Explicit text — Radix drops the cached label when the
                              format switch swaps the item list under a closed select */}
                          <span>{formation}</span>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {formationsFor(format).map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {format === '11v11' && (
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">דגש טקטי מרכזי</label>
                        <Input
                          value={tacticalFocus}
                          onChange={e => setTacticalFocus(e.target.value)}
                          placeholder="לדוגמה: בנייה מהשוער"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-slate-400">
                      שחקנים ({filledPlayers.length} מוזנים, צריך לפחות {minPlayers})
                      {filledPlayers.length >= minPlayers && <span className="text-emerald-400 mr-1">✓</span>}
                    </label>
                    <Button size="sm" variant="ghost" onClick={addPlayer} className="text-emerald-400 hover:text-emerald-300 text-xs">
                      <Plus className="w-3.5 h-3.5 ml-1" />הוסף שחקן
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
                    {players.map((p, i) => (
                      <div key={i} className="grid grid-cols-[40px_1fr_130px_32px] gap-2 items-center">
                        <Input
                          value={p.number}
                          onChange={e => updatePlayer(i, 'number', e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white text-center text-xs p-1"
                          placeholder="#"
                        />
                        <Input
                          value={p.name}
                          onChange={e => updatePlayer(i, 'name', e.target.value)}
                          placeholder={`שחקן ${i + 1}`}
                          className="bg-slate-800 border-slate-700 text-white text-sm"
                        />
                        <Select value={p.position} onValueChange={v => updatePlayer(i, 'position', v)}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {POSITIONS.map(pos => (
                              <SelectItem key={pos} value={pos} className="text-xs">{pos}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removePlayer(i)}
                          className="text-slate-600 hover:text-red-400 h-9 w-9"
                          disabled={players.length <= 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
              {allowBackToHome ? (
                <Button
                  variant="ghost"
                  onClick={() => onComplete(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4 ml-1" />
                  חזור לדף הבית
                </Button>
              ) : (
                <div />
              )}

              <Button
                onClick={handleFinish}
                disabled={!canProceed || saving}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 min-w-[120px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                    סיים הקמה
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}