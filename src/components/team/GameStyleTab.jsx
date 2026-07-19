import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sword, Shield, Zap, ArrowLeftRight, Save } from 'lucide-react';

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

// Total selectable fields across all sections (for the progress ring)
const TOTAL_FIELDS = SECTIONS.reduce((n, s) => n + s.fields.length, 0);

// Chip-based field: click to select, click again to clear.
function ChipField({ label, options, value, onChange, accentColor }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9A8672' }}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(selected ? '' : opt)}
              className="text-xs font-medium transition-all"
              style={{
                borderRadius: 999,
                padding: '5px 12px',
                cursor: 'pointer',
                fontFamily: 'Assistant,sans-serif',
                background: selected ? accentColor : '#FFFFFF',
                color: selected ? '#FFFFFF' : '#5C6B61',
                border: `1px solid ${selected ? accentColor : 'rgba(139,115,85,0.22)'}`,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Live mini-pitch reacting to defensive line + press zone.
function MiniPitch({ defensiveLine, pressZone }) {
  const linePct = defensiveLine === 'גבוה' ? 32 : defensiveLine === 'נמוך' ? 72 : 52;
  const pressPct = pressZone === 'גבוה במחצית היריב' ? 42 : pressZone === 'נמוך ליד הקו שלנו' ? 14 : 28;
  return (
    <div style={{ position: 'relative', width: 110, height: 150, borderRadius: 10, border: '2px solid rgba(255,255,255,0.25)', background: 'linear-gradient(180deg,#1B5E3B,#14472C)', flexShrink: 0, overflow: 'hidden' }}>
      {/* pressing zone shade (from opponent half, top) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${pressPct}%`, background: 'rgba(74,222,128,0.18)', transition: 'height .4s ease' }} />
      {/* halfway line */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.25)' }} />
      {/* centre circle */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 34, height: 34, transform: 'translate(-50%,-50%)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%' }} />
      {/* defensive line (glowing green) */}
      <div style={{ position: 'absolute', top: `${linePct}%`, left: 6, right: 6, height: 2, background: '#4ADE80', boxShadow: '0 0 8px rgba(74,222,128,0.8)', transition: 'top .4s ease' }} />
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

  const filled = Object.values(style).filter(Boolean).length;
  const ringOffset = (144.5 * (1 - filled / TOTAL_FIELDS)).toFixed(1);
  const selectedChips = SECTIONS.flatMap(sec =>
    sec.fields.filter(f => style[f.key]).map(f => ({ value: style[f.key], color: sec.color }))
  );
  const statusSentence = filled === 0
    ? 'עדיין לא הגדרת את הזהות הטקטית של הקבוצה'
    : filled === TOTAL_FIELDS
      ? 'הזהות הטקטית שלך הושלמה במלואה'
      : `${filled} מתוך ${TOTAL_FIELDS} מרכיבים הוגדרו`;

  return (
    <div className="space-y-4">
      {/* ── Tactical identity (dark hero) ── */}
      <div style={{ background: 'linear-gradient(135deg,#0D1A12,#12251A)', borderRadius: 18, border: '1px solid rgba(74,222,128,0.15)', padding: 20, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        {/* progress ring */}
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="26" cy="26" r="23" fill="none" stroke="rgba(244,239,230,0.12)" strokeWidth="4" />
            <circle cx="26" cy="26" r="23" fill="none" stroke="#4ADE80" strokeWidth="4" strokeLinecap="round"
              strokeDasharray="144.5" strokeDashoffset={ringOffset} style={{ animation: 'ringIn 1s ease-out' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 17, color: '#F4EFE6', lineHeight: 1 }}>{filled}</span>
            <span style={{ fontSize: 8.5, color: 'rgba(244,239,230,0.5)' }}>מתוך {TOTAL_FIELDS}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 18, color: '#F4EFE6' }}>הזהות הטקטית שלך</div>
          <div style={{ fontSize: 12.5, color: 'rgba(244,239,230,0.55)', marginTop: 2 }}>{statusSentence}</div>
          {selectedChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {selectedChips.slice(0, 6).map((c, i) => (
                <span key={i} style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>{c.value}</span>
              ))}
              {selectedChips.length > 6 && (
                <span style={{ color: 'rgba(244,239,230,0.5)', fontSize: 11, padding: '3px 4px' }}>+{selectedChips.length - 6}</span>
              )}
            </div>
          )}
        </div>
        <MiniPitch defensiveLine={style.defensive_line} pressZone={style.press_zone} />
      </div>

      {/* ── Sections ── */}
      <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(139,115,85,0.18)', backgroundColor: '#FAF7F2' }}>
      {SECTIONS.map((section, idx) => {
        const Icon = section.icon;
        const secFilled = section.fields.filter(f => style[f.key]).length;
        return (
          <div key={section.id}>
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: section.headerBg, borderBottom: `1px solid ${section.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: section.bg, border: `1px solid ${section.border}` }}>
                <Icon className="w-4 h-4" style={{ color: section.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#2C2416' }}>{section.title}</p>
                <p className="text-[11px]" style={{ color: section.color }}>{section.subtitle}</p>
              </div>
              <span className="text-[11px] font-bold" style={{ color: section.color }}>{secFilled}/{section.fields.length}</span>
            </div>

            {/* Fields */}
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4"
              style={{ borderBottom: idx < SECTIONS.length - 1 ? '2px solid rgba(139,115,85,0.12)' : 'none' }}>
              {section.fields.map(field => (
                <ChipField
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