import React from 'react';
import { Plus } from 'lucide-react';
import { MA } from './matchAnalysisTheme';

const FORM_STYLE = {
  win: { bg: MA.greenAccent, letter: 'נ' },
  draw: { bg: 'rgba(251,191,36,.9)', letter: 'ת' },
  loss: { bg: 'rgba(248,113,113,.9)', letter: 'ה' },
};

const TABS = [
  { key: 'list', he: 'כל המשחקים', en: 'All Matches' },
  { key: 'weekly', he: 'סיכום תקופה', en: 'Period Summary' },
  { key: 'heatmap', he: 'מפת בעיות', en: 'Problem Map' },
  { key: 'trends', he: 'מגמות', en: 'Trends' },
];

function Stat({ value, label, color, divider }) {
  return (
    <div style={divider ? { borderRight: '1px solid rgba(244,239,230,.12)', paddingRight: 28 } : undefined}>
      <div className="ma-hero-num" style={{ fontWeight: 900, color, fontFamily: MA.heading, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(244,239,230,.5)', letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}

export default function MatchAnalysisHero({
  stats, form = [], view, onViewChange, onNewAnalysis, teamSelector, titleExtra, isHe = true,
}) {
  const diff = (stats?.goalsFor ?? 0) - (stats?.goalsAgainst ?? 0);
  const diffLabel = diff > 0 ? `+${diff}` : String(diff);

  return (
    <div className="ma-hero" style={{ position: 'relative', background: MA.darkHero, overflow: 'hidden' }}>
      {/* Pitch line-art */}
      <svg viewBox="0 0 400 260" aria-hidden="true"
        style={{ position: 'absolute', left: -40, top: -30, width: 380, opacity: 0.14, pointerEvents: 'none' }}
        fill="none" stroke={MA.greenAccent} strokeWidth="1.5">
        <rect x="20" y="20" width="360" height="220" rx="4" />
        <circle cx="200" cy="130" r="46" />
        <line x1="200" y1="20" x2="200" y2="240" />
        <rect x="20" y="70" width="60" height="120" />
        <rect x="320" y="70" width="60" height="120" />
      </svg>

      {/* Title + actions */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="ma-hero-title" style={{ margin: 0, fontWeight: 900, color: MA.cream, fontFamily: MA.heading }}>
            {isHe ? 'ניתוח משחקים' : 'Match Analysis'}
          </h1>
          {titleExtra}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {teamSelector}
          <button onClick={onNewAnalysis} className="ma-pulse ma-hit"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12,
              border: 'none', background: MA.greenAccent, color: '#0D1A12', fontWeight: 700, fontSize: 15,
              fontFamily: MA.body, cursor: 'pointer',
            }}>
            <Plus className="w-4 h-4" />
            {isHe ? 'ניתוח חדש' : 'New Analysis'}
          </button>
        </div>
      </div>

      {/* Season stats + form */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, flexWrap: 'wrap', gap: 16 }}>
        <div className="ma-hero-stats">
          <Stat value={stats?.matches ?? 0} label={isHe ? 'משחקים' : 'Matches'} color={MA.cream} />
          <Stat value={stats?.wins ?? 0} label={isHe ? 'ניצחונות' : 'Wins'} color={MA.greenAccent} />
          <Stat value={stats?.draws ?? 0} label={isHe ? 'תיקו' : 'Draws'} color={MA.drawYellow} />
          <Stat value={stats?.losses ?? 0} label={isHe ? 'הפסדים' : 'Losses'} color={MA.lossRed} />
          <Stat value={stats?.goalsFor ?? 0} label={isHe ? 'שערים' : 'Goals'} color={MA.cream} divider />
          <Stat value={stats?.goalsAgainst ?? 0} label={isHe ? 'ספיגות' : 'Conceded'} color={MA.lossRed} />
          <Stat
            value={<span dir="ltr">{diffLabel}</span>}
            label={isHe ? 'הפרש' : 'Diff'}
            color={diff >= 0 ? MA.greenAccent : MA.lossRed}
          />
        </div>

        {form.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(244,239,230,.5)', letterSpacing: 1 }}>
              {isHe ? 'כושר' : 'Form'}
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              {form.map((r, i) => {
                const f = FORM_STYLE[r];
                if (!f) return null;
                return (
                  <span key={i} style={{
                    width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 800, fontFamily: MA.heading,
                    background: f.bg, color: '#0D1A12',
                  }}>
                    {f.letter}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabs — attached to the bottom of the hero */}
      <div className="ma-scroll-x" style={{ position: 'relative', display: 'flex', gap: 4, marginTop: 22 }}>
        {TABS.map(tab => {
          const active = view === tab.key;
          return (
            <button key={tab.key} onClick={() => onViewChange(tab.key)}
              style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer', fontFamily: MA.body,
                fontSize: 14, fontWeight: active ? 700 : 600, whiteSpace: 'nowrap',
                background: active ? MA.bgContainer : 'rgba(255,255,255,.06)',
                color: active ? '#0D1A12' : 'rgba(244,239,230,.65)',
                borderRadius: '12px 12px 0 0',
              }}>
              {isHe ? tab.he : tab.en}
            </button>
          );
        })}
      </div>
    </div>
  );
}
