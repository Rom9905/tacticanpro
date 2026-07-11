import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sword, Shield, Zap, ArrowLeftRight, Save, ChevronDown } from 'lucide-react';

const SECTIONS = [
  {
    id: 'attack',
    icon: Sword,
    color: '#2A7050',
    bg: 'rgba(42,112,80,0.10)',
    border: 'rgba(42,112,80,0.25)',
    headerBg: 'rgba(42,112,80,0.06)',
    title: 'ארגון התקפי',
    subtitle: 'כשיש לנו את הכדור',
    fields: [
      {
        key: 'buildup',
        label: 'בניית משחק',
        options: [
          'מהשוער בהוצאה קצרה',
          'מהגנה בהעברות קצרות',
          'ישיר קדימה וכדורים ארוכים',
          'משולב לפי מצב',
        ],
      },
      {
        key: 'tempo',
        label: 'קצב משחק',
        options: ['מהיר ומיידי', 'שולט ואיטי', 'משתנה לפי מצב'],
      },
      {
        key: 'width',
        label: 'רוחב משחק',
        options: ['רחב דרך הצדדים', 'מרכזי דרך הקו האמצעי', 'משולב'],
      },
      {
        key: 'depth',
        label: 'יצירת עומק',
        options: ['ריצות לעומק מאחורי ההגנה', 'משחק בין הקווים', 'שניהם'],
      },
      {
        key: 'attack_focus',
        label: 'מיקוד התקפי',
        options: ['דרך הצדדים', 'דרך המרכז', 'תלוי במצב'],
      },
      {
        key: 'finishing_style',
        label: 'סגנון סיומת',
        options: [
          'הגבהות מהצדדים',
          'חדירות מרכזיות',
          'בעיטה מרחוק',
          'קומבינציות קצרות',
        ],
      },
    ],
  },
  {
    id: 'defense',
    icon: Shield,
    color: '#2A5FA8',
    bg: 'rgba(42,95,168,0.10)',
    border: 'rgba(42,95,168,0.25)',
    headerBg: 'rgba(42,95,168,0.06)',
    title: 'ארגון הגנתי',
    subtitle: 'כשליריב יש את הכדור',
    fields: [
      {
        key: 'defensive_line',
        label: 'קו הגנה',
        options: ['גבוה', 'בינוני', 'נמוך'],
      },
      {
        key: 'defensive_style',
        label: 'סגנון הגנה',
        options: [
          'לחץ אגרסיבי גבוה',
          'בלוק מסודר בינוני',
          'בלוק נמוך וסגור',
          'מלכודת נבדל',
        ],
      },
      {
        key: 'players_behind_ball',
        label: 'שחקנים מאחורי הכדור',
        options: ['4 שחקנים', '5 שחקנים', '6 שחקנים ויותר'],
      },
      {
        key: 'marking_style',
        label: 'שמירה',
        options: ['איזורית', 'אישית', 'משולבת'],
      },
      {
        key: 'press_on_ball',
        label: 'לחץ על בעל הכדור',
        options: ['מיידי ואגרסיבי', 'מחכה ומנתב', 'תלוי במיקום'],
      },
      {
        key: 'set_piece_defense',
        label: 'הגנה על מצבי נייחים',
        options: ['איזורית', 'אישית', 'משולבת'],
      },
    ],
  },
  {
    id: 'transition_attack',
    icon: Zap,
    color: '#C27800',
    bg: 'rgba(194,120,0,0.10)',
    border: 'rgba(194,120,0,0.25)',
    headerBg: 'rgba(194,120,0,0.06)',
    title: 'מעבר הגנה-התקפה',
    subtitle: 'אחרי שהחזרנו את הכדור',
    fields: [
      {
        key: 'recovery_response',
        label: 'תגובה לאחר החזרה',
        options: ['מעבר מהיר מיידי', 'בניית משחק מסודרת', 'תלוי במיקום'],
      },
      {
        key: 'transition_players',
        label: 'שחקנים במעבר',
        options: ['2-3 שחקנים', '4-5 שחקנים', 'כל הקבוצה עולה'],
      },
      {
        key: 'transition_direction',
        label: 'העדפת כיוון',
        options: ['דרך הצדדים', 'דרך המרכז', 'לפי הפתח'],
      },
    ],
  },
  {
    id: 'transition_defense',
    icon: ArrowLeftRight,
    color: '#B94040',
    bg: 'rgba(185,64,64,0.10)',
    border: 'rgba(185,64,64,0.25)',
    headerBg: 'rgba(185,64,64,0.06)',
    title: 'מעבר התקפה-הגנה',
    subtitle: 'אחרי שאיבדנו את הכדור',
    fields: [
      {
        key: 'loss_response',
        label: 'תגובה לאחר אובדן',
        options: ['לחץ מיידי', 'חזרה מהירה לאחור', 'תלוי במיקום'],
      },
      {
        key: 'press_zone',
        label: 'היכן מתחיל הלחץ',
        options: [
          'גבוה במחצית היריב',
          'בינוני קו האמצע',
          'נמוך ליד הקו שלנו',
        ],
      },
      {
        key: 'reorganize_time',
        label: 'זמן לחזרה לארגון',
        options: ['מיידי כולם חוזרים', '3-5 שניות', 'חזרה מדורגת'],
      },
    ],
  },
];

function SelectField({ label, options, value, onChange, accentColor }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5 bg-white rounded-lg p-3"
      style={{
        border: `1px solid ${focused ? accentColor : 'rgba(139,115,85,0.18)'}`,
        transition: 'border-color 0.15s',
        boxShadow: focused ? `0 0 0 2px ${accentColor}18` : 'none',
      }}>
      <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9A8672' }}>{label}</label>
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full appearance-none bg-transparent text-sm pr-6 outline-none"
          style={{ color: value ? '#2C2416' : '#C8BFB3' }}
        >
          <option value="">— בחר —</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#9A8672' }} />
      </div>
    </div>
  );
}

export default function GameStyleTab({ teamId }) {
  const [style, setStyle] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    base44.entities.Team.filter({ id: teamId }).then(data => {
      const team = data[0];
      if (team) {
        setStyle(team.game_style || {});
        setNotes(team.game_style_notes || '');
      }
    });
  }, [teamId]);

  const handleChange = (key, value) => {
    setStyle(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Team.update(teamId, {
      game_style: style,
      game_style_notes: notes,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(139,115,85,0.18)', backgroundColor: '#FAF7F2' }}>
      {SECTIONS.map((section, idx) => {
        const Icon = section.icon;
        return (
          <div key={section.id}>
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: section.headerBg, borderBottom: `1px solid ${section.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: section.bg, border: `1px solid ${section.border}` }}>
                <Icon className="w-4 h-4" style={{ color: section.color }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#2C2416' }}>{section.title}</p>
                <p className="text-[11px]" style={{ color: section.color }}>{section.subtitle}</p>
              </div>
            </div>

            {/* Fields grid */}
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              style={{ borderBottom: idx < SECTIONS.length - 1 ? '2px solid rgba(139,115,85,0.12)' : 'none' }}>
              {section.fields.map(field => (
                <SelectField
                  key={field.key}
                  label={field.label}
                  options={field.options}
                  value={style[field.key]}
                  onChange={(v) => handleChange(field.key, v)}
                  accentColor={section.color}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Free notes */}
      <div className="px-5 py-4 space-y-2" style={{ borderTop: '2px solid rgba(139,115,85,0.12)' }}>
        <label className="text-sm font-semibold" style={{ color: '#2C2416' }}>הערות נוספות על הקבוצה שלך</label>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          rows={3}
          placeholder="לדוגמה: קבוצה צעירה בפיתוח, חזקה פיזית אבל חלשה טכנית, מתמקדים בעונה הזו בבניית משחק..."
          className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
          style={{
            backgroundColor: '#F4EFE6',
            border: '1px solid rgba(139,115,85,0.22)',
            color: '#2C2416',
          }}
        />
      </div>

      {/* Save */}
      <div className="px-5 pb-5 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
          style={{ backgroundColor: saved ? '#1F5A3E' : '#2A7050', color: '#fff', border: 'none' }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'שומר...' : saved ? '✓ נשמר!' : 'שמור שיטת משחק'}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Utility: buildGameStyleContext
// Used by AI analysis components to inject game style into prompts
// ─────────────────────────────────────────────────────────────────
export function buildGameStyleContext(gameStyle, gameStyleNotes) {
  if (!gameStyle || Object.keys(gameStyle).length === 0) return '';

  const defined = [];

  const LABELS = {
    buildup: 'בניית משחק',
    tempo: 'קצב משחק',
    width: 'רוחב משחק',
    depth: 'יצירת עומק',
    attack_focus: 'מיקוד התקפי',
    finishing_style: 'סגנון סיומת',
    defensive_line: 'קו הגנה',
    defensive_style: 'סגנון הגנה',
    players_behind_ball: 'שחקנים מאחורי הכדור',
    marking_style: 'שמירה',
    press_on_ball: 'לחץ על בעל הכדור',
    set_piece_defense: 'הגנה על מצבי נייחים',
    recovery_response: 'תגובה לאחר החזרת כדור',
    transition_players: 'שחקנים במעבר התקפי',
    transition_direction: 'כיוון מועדף במעבר',
    loss_response: 'תגובה לאחר אובדן',
    press_zone: 'אזור תחילת לחץ',
    reorganize_time: 'זמן חזרה לארגון',
  };

  for (const [key, val] of Object.entries(gameStyle)) {
    if (val && LABELS[key]) {
      defined.push(`- ${LABELS[key]}: ${val}`);
    }
  }

  if (defined.length === 0) return '';

  let ctx = `שיטת המשחק שהוגדרה על ידי המאמן:\n${defined.join('\n')}`;
  if (gameStyleNotes) ctx += `\nהערות המאמן: ${gameStyleNotes}`;
  ctx += `\n\nחשוב: בכל ניתוח — השווה את הביצוע בפועל לשיטה שהוגדרה. אם יש פער — סמן אותו עם הכותרת "על בסיס שיטת המשחק שהגדרת —" ופרט את הבעיה.`;
  return ctx;
}