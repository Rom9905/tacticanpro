import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Activity, Clock, MapPin, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/LanguageContext';

const GAME_CONTEXTS_HE = ['ליגה', 'גביע', 'ידידות'];
const TRAINING_DURATIONS = [60, 75, 90];

export default function AddEventModal({ open, onClose, teamId, defaultType = 'training', onSaved }) {
  const { t, dir } = useLang();
  const ae = t.addEvent;

  const [type, setType] = useState(defaultType);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('17:00');
  const [opponent, setOpponent] = useState('');
  const [context, setContext] = useState('ליגה');
  const [location, setLocation] = useState('בית');
  const [duration, setDuration] = useState(90);
  const [emphases, setEmphases] = useState([]);
  const [freeNote, setFreeNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [overlapError, setOverlapError] = useState(false);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setDate(''); setTime('17:00'); setOpponent('');
      setContext('ליגה'); setLocation('בית');
      setDuration(90); setEmphases([]); setFreeNote('');
      setOverlapError(false);
    }
  }, [open, defaultType]);

  const toggleEmphasis = (e) => {
    setEmphases(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  const canSave = date && (type === 'training' || opponent.trim());

  const handleSave = async () => {
    if (!canSave || !teamId) return;
    setSaving(true);
    setOverlapError(false);
    try {
      const dateTime = `${date}T${time}:00`;
      const newDate = new Date(dateTime);

      const existing = await base44.entities.GameSchedule.filter({ team_id: teamId });
      const hasOverlap = existing.some(e => {
        if (e.status === 'cancelled') return false;
        const eDate = new Date(e.game_date);
        return Math.abs(eDate - newDate) < 60 * 60 * 1000;
      });

      if (hasOverlap) { setOverlapError(true); setSaving(false); return; }

      if (type === 'game') {
        await base44.entities.GameSchedule.create({
          team_id: teamId, opponent: opponent.trim(),
          game_date: dateTime, context, location, status: 'scheduled',
        });
      } else {
        await base44.entities.GameSchedule.create({
          team_id: teamId, opponent: 'אימון',
          game_date: dateTime, context: 'חברות', location: 'בית', status: 'scheduled',
          notes: JSON.stringify({ type: 'training', duration, emphases, freeNote }),
        });
      }
      onSaved && onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (!open) return null;

  const inputStyle = {
    display: 'block', width: '100%', height: '36px',
    padding: '0 12px', borderRadius: '6px',
    border: '1px solid rgba(139,115,85,0.30)',
    backgroundColor: '#FAF7F2', color: '#2C2416',
    fontSize: '14px', outline: 'none',
    colorScheme: 'light', boxSizing: 'border-box',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} dir={dir}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6"
        style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: '#2C2416' }}>{ae.title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:opacity-70"
            style={{ backgroundColor: 'rgba(139,115,85,0.12)', color: '#7A6B57' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'game', label: ae.game, Icon: Trophy },
            { key: 'training', label: ae.training, Icon: Activity },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setType(key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: type === key ? 'rgba(42,112,80,0.15)' : 'rgba(139,115,85,0.08)',
                border: `1.5px solid ${type === key ? 'rgba(42,112,80,0.4)' : 'rgba(139,115,85,0.2)'}`,
                color: type === key ? '#2A7050' : '#7A6B57',
              }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#7A6B57' }}>{ae.date} *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#7A6B57' }}>{ae.time}</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {type === 'game' ? (
            <>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#7A6B57' }}>{ae.opponentName} *</label>
                <Input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder={ae.opponentPlaceholder}
                  style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.30)', color: '#2C2416' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#7A6B57' }}>{ae.gameType}</label>
                <div className="flex gap-2">
                  {GAME_CONTEXTS_HE.map(c => (
                    <button key={c} onClick={() => setContext(c)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: context === c ? 'rgba(42,112,80,0.15)' : 'rgba(139,115,85,0.06)',
                        border: `1.5px solid ${context === c ? 'rgba(42,112,80,0.4)' : 'rgba(139,115,85,0.18)'}`,
                        color: context === c ? '#2A7050' : '#7A6B57',
                      }}>{ae.contexts[c] || c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#7A6B57' }}>{ae.location}</label>
                <div className="flex gap-2">
                  {[{ key: 'בית', label: ae.home }, { key: 'חוץ', label: ae.away }].map(({ key, label }) => (
                    <button key={key} onClick={() => setLocation(key)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all"
                      style={{
                        backgroundColor: location === key ? 'rgba(42,112,80,0.15)' : 'rgba(139,115,85,0.06)',
                        border: `1.5px solid ${location === key ? 'rgba(42,112,80,0.4)' : 'rgba(139,115,85,0.18)'}`,
                        color: location === key ? '#2A7050' : '#7A6B57',
                      }}>
                      <MapPin className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#7A6B57' }}>{ae.duration}</label>
                <div className="flex gap-2">
                  {TRAINING_DURATIONS.map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all"
                      style={{
                        backgroundColor: duration === d ? 'rgba(42,112,80,0.15)' : 'rgba(139,115,85,0.06)',
                        border: `1.5px solid ${duration === d ? 'rgba(42,112,80,0.4)' : 'rgba(139,115,85,0.18)'}`,
                        color: duration === d ? '#2A7050' : '#7A6B57',
                      }}>
                      <Clock className="w-3 h-3" />{d}'
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#7A6B57' }}>{ae.emphases}</label>
                <div className="flex flex-wrap gap-2">
                  {ae.emphasisOptions.map((e, i) => (
                    <button key={i} onClick={() => toggleEmphasis(e)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: emphases.includes(e) ? 'rgba(42,112,80,0.18)' : 'rgba(139,115,85,0.06)',
                        border: `1.5px solid ${emphases.includes(e) ? 'rgba(42,112,80,0.45)' : 'rgba(139,115,85,0.18)'}`,
                        color: emphases.includes(e) ? '#2A7050' : '#7A6B57',
                      }}>{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#9A8672' }}>{ae.freeNote}</label>
                <Input value={freeNote} onChange={e => setFreeNote(e.target.value)} placeholder="..."
                  style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.20)', color: '#2C2416' }} />
              </div>
            </>
          )}
        </div>

        {overlapError && (
          <div className="mt-3 p-3 rounded-lg text-sm text-center"
            style={{ backgroundColor: 'rgba(200,50,50,0.10)', border: '1px solid rgba(200,50,50,0.30)', color: '#B94040' }}>
            {ae.overlapError}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1" style={{ color: '#7A6B57' }}>{ae.cancel}</Button>
          <Button onClick={handleSave} disabled={!canSave || saving} className="flex-1"
            style={{ backgroundColor: '#2A7050', color: '#fff' }}>
            {saving ? ae.checking : ae.save}
          </Button>
        </div>
      </div>
    </div>
  );
}