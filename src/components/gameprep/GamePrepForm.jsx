import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Shield, Users, ChevronDown } from 'lucide-react';

const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1', '4-1-4-1'];
const ATTACK_STYLES = ['לחץ גבוה', 'בנייה מהגנה', 'כדורים ארוכים', 'קטנגות', 'התקפה מהירה', 'כדורים גבוהים', 'התקפה מהצדדים'];
const DEFENSE_STYLES = ['לחץ גבוה', 'בלוק נמוך', 'בלוק בינוני', 'סימון אישי', 'איזורית', 'לחץ על הכדור'];
const STRENGTH_LEVELS = ['חלש', 'בינוני', 'חזק', 'חזק מאוד'];

function Field({ label, children, required }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1 block" style={{ color: '#5C4E38' }}>
        {label}{required && <span style={{ color: '#B94040' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg px-3 py-2 text-sm"
      style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: value ? '#2C2416' : '#9A8672' }}>
      <option value="">{placeholder || 'בחר...'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-sm"
      style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }} />
  );
}

export default function GamePrepForm({ teamId, players, generalPreps, onClose, onSaved }) {
  const [prepType, setPrepType] = useState(null); // null = choose, 'general', 'opponent'
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formation, setFormation] = useState('');
  const [attackStyle, setAttackStyle] = useState('');
  const [defenseStyle, setDefenseStyle] = useState('');
  const [strengthLevel, setStrengthLevel] = useState('');
  const [notes, setNotes] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [keyStrength, setKeyStrength] = useState('');
  const [keyWeakness, setKeyWeakness] = useState('');
  const [dangerousPlayers, setDangerousPlayers] = useState('');
  const [patterns, setPatterns] = useState('');
  const [basedOnId, setBasedOnId] = useState('');
  const [showLineupPicker, setShowLineupPicker] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState([]);
  const [saving, setSaving] = useState(false);

  const basePrep = basedOnId ? generalPreps.find(p => p.id === basedOnId) : null;
  const showTacticalFields = prepType === 'general' || (prepType === 'opponent' && !basedOnId);

  const handleSave = async () => {
    if (!name || !date) return;
    setSaving(true);
    const data = {
      team_id: teamId,
      prep_type: prepType,
      name,
      date,
      ...(showTacticalFields && { opponent_formation: formation, opponent_attack_style: attackStyle, opponent_defense_style: defenseStyle }),
      opponent_strength_level: strengthLevel || null,
      additional_notes: notes,
      ...(prepType === 'opponent' && { opponent_name: opponentName, opponent_key_strength: keyStrength, opponent_key_weakness: keyWeakness, opponent_dangerous_players: dangerousPlayers, opponent_patterns: patterns }),
      ...(basedOnId && { based_on_prep_id: basedOnId }),
      recommended_lineup: selectedLineup,
      times_used: 0,
      results_when_used: [],
    };
    await base44.entities.GamePrep.create(data);
    setSaving(false);
    onSaved();
  };

  const inputStyle = { backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.25)' }}
        onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: '#FAF7F2', borderBottom: '1px solid rgba(139,115,85,0.15)' }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: '#2C2416' }}>
            <Shield className="w-4 h-4" style={{ color: '#2A5FA8' }} /> הכנה חדשה
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(139,115,85,0.12)', color: '#7A6B57' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Step 1: choose type */}
          {!prepType && (
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: '#2C2416' }}>בחר סוג הכנה:</p>
              <button onClick={() => setPrepType('general')}
                className="w-full text-right p-4 rounded-xl transition-all hover:shadow-md"
                style={{ backgroundColor: 'rgba(42,95,168,0.06)', border: '1.5px solid rgba(42,95,168,0.25)' }}>
                <p className="text-sm font-bold" style={{ color: '#2A5FA8' }}>הכנה טקטית כללית</p>
                <p className="text-xs mt-0.5" style={{ color: '#7A6B57' }}>מערכת, סגנון, עצמת יריב — שמישה שוב ושוב</p>
              </button>
              <button onClick={() => setPrepType('opponent')}
                className="w-full text-right p-4 rounded-xl transition-all hover:shadow-md"
                style={{ backgroundColor: 'rgba(42,112,80,0.06)', border: '1.5px solid rgba(42,112,80,0.25)' }}>
                <p className="text-sm font-bold" style={{ color: '#2A7050' }}>יריב ספציפי</p>
                <p className="text-xs mt-0.5" style={{ color: '#7A6B57' }}>ניתוח מותאם ליריב מסוים, עם שחקנים מסוכנים ודפוסים</p>
              </button>
            </div>
          )}

          {/* Form */}
          {prepType && (
            <>
              <Field label="שם ההכנה" required>
                <TextInput value={name} onChange={setName}
                  placeholder={prepType === 'general' ? 'לדוגמה: נגד לחץ גבוה' : `הכנה לקראת ${opponentName || 'היריב'}`} />
              </Field>

              <Field label="תאריך">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
              </Field>

              {prepType === 'opponent' && (
                <>
                  {generalPreps.length > 0 && (
                    <Field label="בסס על הכנה כללית קיימת (אופציונלי)">
                      <select value={basedOnId} onChange={e => setBasedOnId(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
                        <option value="">ללא בסיס — מלא את כל השדות</option>
                        {generalPreps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </Field>
                  )}
                  <Field label="שם היריב" required>
                    <TextInput value={opponentName} onChange={setOpponentName} placeholder="שם הקבוצה היריבה" />
                  </Field>
                </>
              )}

              {showTacticalFields && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="מערכת יריב">
                    <Select value={formation} onChange={setFormation} options={FORMATIONS} />
                  </Field>
                  <Field label="עצמת יריב">
                    <Select value={strengthLevel} onChange={setStrengthLevel} options={STRENGTH_LEVELS} />
                  </Field>
                  <Field label="סגנון התקפי">
                    <Select value={attackStyle} onChange={setAttackStyle} options={ATTACK_STYLES} />
                  </Field>
                  <Field label="סגנון הגנתי">
                    <Select value={defenseStyle} onChange={setDefenseStyle} options={DEFENSE_STYLES} />
                  </Field>
                </div>
              )}

              {!showTacticalFields && basePrep && (
                <div className="rounded-lg p-3 text-xs space-y-1" style={{ backgroundColor: 'rgba(42,95,168,0.07)', border: '1px solid rgba(42,95,168,0.2)' }}>
                  <p className="font-semibold" style={{ color: '#2A5FA8' }}>בסיס: {basePrep.name}</p>
                  {basePrep.opponent_formation && <p style={{ color: '#5C4E38' }}>מערכת: {basePrep.opponent_formation} · התקפה: {basePrep.opponent_attack_style} · הגנה: {basePrep.opponent_defense_style}</p>}
                </div>
              )}

              {prepType === 'opponent' && (
                <>
                  {!showTacticalFields && (
                    <Field label="עצמת יריב">
                      <Select value={strengthLevel} onChange={setStrengthLevel} options={STRENGTH_LEVELS} />
                    </Field>
                  )}
                  <Field label="נקודת חוזק מרכזית">
                    <TextInput value={keyStrength} onChange={setKeyStrength} placeholder="מה הם עושים הכי טוב?" />
                  </Field>
                  <Field label="נקודת חולשה מרכזית">
                    <TextInput value={keyWeakness} onChange={setKeyWeakness} placeholder="היכן ניתן לנצל אותם?" />
                  </Field>
                  <Field label="שחקנים מסוכנים">
                    <Textarea value={dangerousPlayers} onChange={e => setDangerousPlayers(e.target.value)}
                      placeholder="שמות ותפקידים של שחקנים שיש להיזהר מהם..."
                      className="min-h-[60px] text-sm resize-none"
                      style={{ backgroundColor: '#F0EBE2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }} />
                  </Field>
                  <Field label="דפוסים חוזרים של היריב">
                    <Textarea value={patterns} onChange={e => setPatterns(e.target.value)}
                      placeholder="דברים שהיריב חוזר עליהם — לחץ מהצד, מסירות ארוכות, כדורי גב..."
                      className="min-h-[60px] text-sm resize-none"
                      style={{ backgroundColor: '#F0EBE2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }} />
                  </Field>
                </>
              )}

              <Field label="הערות נוספות (אופציונלי)">
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="כל מה שחשוב לדעת לפני המשחק..."
                  className="min-h-[60px] text-sm resize-none"
                  style={{ backgroundColor: '#F0EBE2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }} />
              </Field>

              {/* Lineup picker */}
              <div>
                <button onClick={() => setShowLineupPicker(!showLineupPicker)}
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: '#2A5FA8' }}>
                  <Users className="w-4 h-4" />
                  הרכב מומלץ ({selectedLineup.length}/11)
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLineupPicker ? 'rotate-180' : ''}`} />
                </button>
                {showLineupPicker && (
                  <div className="mt-2 p-3 rounded-xl max-h-52 overflow-y-auto space-y-1"
                    style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.22)' }}>
                    {players.map(p => {
                      const sel = selectedLineup.includes(p.id);
                      return (
                        <button key={p.id} onClick={() => {
                          setSelectedLineup(prev => sel ? prev.filter(id => id !== p.id) : prev.length < 11 ? [...prev, p.id] : prev);
                        }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-right transition-all"
                          style={{
                            backgroundColor: sel ? 'rgba(42,95,168,0.15)' : 'transparent',
                            border: `1px solid ${sel ? 'rgba(42,95,168,0.35)' : 'transparent'}`,
                            color: '#2C2416',
                          }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: sel ? '#2A5FA8' : 'rgba(139,115,85,0.2)', color: sel ? '#fff' : '#7A6B57' }}>
                            {p.number || '?'}
                          </div>
                          <span>{p.name}</span>
                          <span style={{ color: '#9A8672' }}>{p.position}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {prepType && (
          <div className="sticky bottom-0 flex gap-2 px-5 py-3"
            style={{ backgroundColor: '#FAF7F2', borderTop: '1px solid rgba(139,115,85,0.15)' }}>
            <Button variant="ghost" onClick={onClose} style={{ color: '#7A6B57' }}>ביטול</Button>
            <Button onClick={handleSave} disabled={saving || !name} className="flex-1"
              style={{ backgroundColor: '#2A5FA8', color: '#fff' }}>
              {saving ? 'שומר...' : 'שמור הכנה'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}