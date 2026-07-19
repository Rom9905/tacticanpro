import React from 'react';
import { getRelevantSkills, isGoalkeeper } from './AutoSuggestRatings';

// Duel colours (README): player A green, player B blue.
const A_COLOR = '#4ADE80';
const B_COLOR = '#60A5FA';

function Ring({ value, color }) {
  const has = typeof value === 'number' && !isNaN(value) && value > 0;
  const offset = has ? (144.5 * (1 - value / 10)).toFixed(1) : 144.5;
  return (
    <div style={{ position: 'relative', width: 74, height: 74, flexShrink: 0 }}>
      <svg width="74" height="74" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="26" cy="26" r="23" fill="none" stroke="rgba(244,239,230,0.12)" strokeWidth="4" />
        <circle cx="26" cy="26" r="23" fill="none" stroke={has ? color : 'rgba(244,239,230,0.2)'} strokeWidth="4"
          strokeLinecap="round" strokeDasharray="144.5" strokeDashoffset={offset} style={{ animation: 'ringIn 1s ease-out' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 18, color: '#F4EFE6' }}>
        {has ? value.toFixed(1) : '—'}
      </div>
    </div>
  );
}

export default function ComparisonDuel({ playerA, playerB, ratingA, ratingB, isHe = true }) {
  // Choose the skill set — goalkeeper skills only when both are keepers.
  const bothGK = isGoalkeeper(playerA) && isGoalkeeper(playerB);
  const skills = bothGK ? getRelevantSkills(playerA) : getRelevantSkills({ position: '' });

  const valA = (k) => playerA.skill_ratings?.[k] || 0;
  const valB = (k) => playerB.skill_ratings?.[k] || 0;

  let leadsA = 0, leadsB = 0;
  skills.forEach(s => { const a = valA(s.key), b = valB(s.key); if (a > b) leadsA++; else if (b > a) leadsB++; });

  const verdict = leadsA === leadsB
    ? (isHe ? 'שקול — לכל שחקן יתרונות משלו' : 'Even — each has their own edge')
    : leadsA > leadsB
      ? `${playerA.name.split(' ')[0]} ${isHe ? 'מוביל' : 'leads'} — ${leadsA} ${isHe ? 'מול' : 'vs'} ${leadsB} ${isHe ? 'יכולות' : 'abilities'}`
      : `${playerB.name.split(' ')[0]} ${isHe ? 'מוביל' : 'leads'} — ${leadsB} ${isHe ? 'מול' : 'vs'} ${leadsA} ${isHe ? 'יכולות' : 'abilities'}`;

  const Side = ({ player, rating, color, leads, align }) => (
    <div style={{ flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
      <Ring value={rating} color={color} />
      <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 15, color: '#F4EFE6' }}>{player.name}</div>
      <div style={{ fontSize: 12, color }}>{player.position}{player.number ? ` · #${player.number}` : ''}</div>
      <span style={{ background: `${color}22`, color, border: `1px solid ${color}55`, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>
        {isHe ? `מוביל ב-${leads} יכולות` : `Leads in ${leads}`}
      </span>
      {align}
    </div>
  );

  // Season stat rows: A on the right, B on the left, winner coloured.
  const statRows = [
    { label: isHe ? 'גולים' : 'Goals', a: playerA.season_goals || 0, b: playerB.season_goals || 0 },
    { label: isHe ? 'בישולים' : 'Assists', a: playerA.season_assists || 0, b: playerB.season_assists || 0 },
    { label: isHe ? 'משחקים' : 'Games', a: playerA.games_played || 0, b: playerB.games_played || 0 },
    { label: isHe ? 'ציון ממוצע' : 'Avg rating', a: ratingA || 0, b: ratingB || 0, dec: true },
  ];

  return (
    <div className="space-y-3">
      {/* ── Duel hero ── */}
      <div style={{ background: 'linear-gradient(135deg,#0D1A12,#12251A)', borderRadius: 18, border: '1px solid rgba(74,222,128,0.15)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Side player={playerA} rating={ratingA} color={A_COLOR} leads={leadsA} />
          <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 24, color: 'rgba(244,239,230,0.5)' }}>VS</div>
          <Side player={playerB} rating={ratingB} color={B_COLOR} leads={leadsB} />
        </div>
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: '#F4EFE6', background: 'rgba(244,239,230,0.06)', borderRadius: 10, padding: '8px 12px' }}>
          {verdict}
        </div>
      </div>

      {/* ── Skill vs skill (mirrored bars) ── */}
      <div className="premium-card" style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 14, color: '#14231A', marginBottom: 12 }}>
          {isHe ? 'יכולת מול יכולת' : 'Skill vs skill'}
        </div>
        <div className="flex flex-col gap-2.5">
          {skills.map(s => {
            const a = valA(s.key), b = valB(s.key);
            const aWin = a > b, bWin = b > a;
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* A side (right in RTL) — grows leftwards */}
                <b style={{ width: 22, textAlign: 'center', color: aWin ? A_COLOR : '#94A39A', fontSize: 12.5 }}>{a}</b>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', height: 6, background: 'rgba(13,26,18,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${a / 5 * 100}%`, background: A_COLOR, borderRadius: 3 }} />
                </div>
                <span style={{ width: 96, textAlign: 'center', fontSize: 11.5, color: '#5C6B61' }}>{s.label}</span>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', height: 6, background: 'rgba(13,26,18,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${b / 5 * 100}%`, background: B_COLOR, borderRadius: 3 }} />
                </div>
                <b style={{ width: 22, textAlign: 'center', color: bWin ? B_COLOR : '#94A39A', fontSize: 12.5 }}>{b}</b>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Season stats ── */}
      <div className="premium-card" style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 14, color: '#14231A', marginBottom: 8 }}>
          {isHe ? 'סטטיסטיקת עונה' : 'Season stats'}
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(13,26,18,0.06)' }}>
          {statRows.map(r => {
            const av = r.dec ? Number(r.a).toFixed(1) : r.a;
            const bv = r.dec ? Number(r.b).toFixed(1) : r.b;
            const aWin = r.a > r.b, bWin = r.b > r.a;
            return (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', padding: '9px 0' }}>
                <span style={{ flex: 1, textAlign: 'right', fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 16, color: aWin ? A_COLOR : '#14231A' }}>{av}</span>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#94A39A' }}>{r.label}</span>
                <span style={{ flex: 1, textAlign: 'left', fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 16, color: bWin ? B_COLOR : '#14231A' }}>{bv}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
