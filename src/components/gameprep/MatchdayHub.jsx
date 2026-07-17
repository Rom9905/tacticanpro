import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { objectFingerprint } from '@/lib/analysisFingerprint';
import {
  ShieldCheck, Crosshair, Sparkles, Scale, Printer, Lightbulb, ArrowRight, Loader2
} from 'lucide-react';

const SHADOW_CARD = '0 1px 2px rgba(13,26,18,.05), 0 4px 12px rgba(13,26,18,.06)';

const LINEUP_433 = [
  { pos: 'GK', x: 50, y: 90 },
  { pos: 'RB', x: 85, y: 73 },
  { pos: 'RCB', x: 63, y: 77 },
  { pos: 'LCB', x: 37, y: 77 },
  { pos: 'LB', x: 15, y: 73 },
  { pos: 'CDM', x: 50, y: 58 },
  { pos: 'RCM', x: 71, y: 50 },
  { pos: 'LCM', x: 29, y: 50 },
  { pos: 'RW', x: 82, y: 28 },
  { pos: 'ST', x: 50, y: 23 },
  { pos: 'LW', x: 18, y: 28 },
];

function useCountdown(targetDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(targetDate).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = n => String(n).padStart(2, '0');
  const isWithin48h = diff > 0 && diff < 48 * 3600000;
  return { text: `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`, isWithin48h, isPast: diff === 0 };
}

function getBalanceData(matchAnalyses, formation) {
  if (!matchAnalyses?.length) return null;
  const matching = matchAnalyses.filter(ma => ma.opponent_formation === formation);
  if (!matching.length) return null;
  const w = matching.filter(ma => (ma.result?.our_score ?? 0) > (ma.result?.opponent_score ?? 0)).length;
  const l = matching.filter(ma => (ma.result?.our_score ?? 0) < (ma.result?.opponent_score ?? 0)).length;
  const winPct = Math.round((w / matching.length) * 100);
  return { total: matching.length, wins: w, losses: l, draws: matching.length - w - l, winPct, matches: matching };
}

function getFullBalanceRows(matchAnalyses) {
  if (!matchAnalyses?.length) return { rows: [], total: 0, wins: 0, draws: 0, losses: 0 };
  const map = {};
  matchAnalyses.forEach(ma => {
    const f = ma.opponent_formation || '?';
    if (!map[f]) map[f] = { formation: f, style: ma.opponent_attack_style || '', matches: [] };
    map[f].matches.push(ma);
  });
  const rows = Object.values(map).sort((a, b) => b.matches.length - a.matches.length);
  const total = matchAnalyses.length;
  const wins = matchAnalyses.filter(ma => (ma.result?.our_score ?? 0) > (ma.result?.opponent_score ?? 0)).length;
  const draws = matchAnalyses.filter(ma => ma.result && ma.result.our_score === ma.result.opponent_score).length;
  return { rows, total, wins, draws, losses: total - wins - draws };
}

function resultLabel(ma) {
  if (!ma.result) return '?';
  const o = ma.result.our_score, op = ma.result.opponent_score;
  return `${o}-${op}`;
}
function resultType(ma) {
  if (!ma.result) return 'draw';
  const o = ma.result.our_score ?? 0, op = ma.result.opponent_score ?? 0;
  return o > op ? 'win' : o < op ? 'loss' : 'draw';
}

// ─── Pitch Component ───
function PitchView({ players, lineupIds, formation, dark, large }) {
  const h = large ? 600 : 400;
  const tokenSize = large ? 38 : 30;
  const fontSize = large ? 13 : 11;
  const nameSize = large ? 10 : 9;
  const inset = large ? 14 : 10;
  const penW = large ? 180 : 120;
  const penH = large ? 64 : 44;
  const circleR = large ? 50 : 35;

  const lineColor = dark ? 'rgba(74,222,128,.35)' : 'rgba(255,255,255,.4)';
  const bg = dark
    ? 'radial-gradient(ellipse at 50% 30%,#1B4229,#122B1B)'
    : 'linear-gradient(180deg,#2F7A4D,#276B42)';

  const slots = LINEUP_433.map((slot, i) => {
    const pid = lineupIds?.[i];
    const p = pid ? players.find(pl => pl.id === pid) : null;
    return { ...slot, player: p, number: p?.number || (i + 1) };
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: h, borderRadius: large ? 16 : 12, overflow: 'hidden', background: bg, border: dark ? '1px solid rgba(74,222,128,.2)' : undefined, boxShadow: dark ? '0 0 60px rgba(74,222,128,.08)' : undefined }}>
      <div style={{ position: 'absolute', inset: inset, border: `1.5px solid ${lineColor}`, borderRadius: large ? 6 : 4 }} />
      <div style={{ position: 'absolute', left: inset, right: inset, top: '50%', height: 1.5, background: lineColor }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: circleR * 2, height: circleR * 2, border: `1.5px solid ${lineColor}`, borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: inset, transform: 'translateX(-50%)', width: penW, height: penH, border: `1.5px solid ${lineColor}`, borderTop: 'none' }} />
      <div style={{ position: 'absolute', left: '50%', bottom: inset, transform: 'translateX(-50%)', width: penW, height: penH, border: `1.5px solid ${lineColor}`, borderBottom: 'none' }} />
      {large && (
        <div style={{ position: 'absolute', top: 18, right: 18, padding: '5px 12px', borderRadius: 8, background: 'rgba(13,26,18,.7)', border: '1px solid rgba(74,222,128,.25)', fontSize: 12, fontWeight: 700, color: '#4ADE80' }}>
          {formation || '4-3-3'} · הרכב מומלץ
        </div>
      )}
      {slots.map((s, i) => (
        <div key={i} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: large ? 3 : 2 }}>
          <div style={{
            width: tokenSize, height: tokenSize, borderRadius: '50%',
            background: 'linear-gradient(135deg,#4ADE80,#16A34A)',
            border: dark ? '2px solid rgba(233,247,238,.9)' : '2px solid rgba(255,255,255,.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize, fontWeight: 800, color: '#0D1A12',
            boxShadow: dark ? '0 0 18px rgba(74,222,128,.5)' : '0 2px 6px rgba(0,0,0,.25)',
          }}>{s.number}</div>
          <span style={{
            fontSize: nameSize, fontWeight: 600,
            color: dark ? '#E9F7EE' : 'rgba(255,255,255,.95)',
            background: dark ? 'rgba(13,26,18,.7)' : 'rgba(13,26,18,.5)',
            padding: '1px 6px', borderRadius: 6, whiteSpace: 'nowrap',
          }}>{s.player?.name || s.pos}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Report Modal ───
function ReportModal({ prep, analysis, onClose }) {
  if (!prep) return null;
  const formation = prep.opponent_formation || '?';
  const dateStr = prep.date ? new Date(prep.date).toLocaleDateString('he-IL') : '';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(13,26,18,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} dir="rtl">
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 660, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, boxShadow: '0 24px 60px rgba(13,26,18,.35)', padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '2px solid #0D1A12', paddingBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#16A34A' }}>דו"ח הכנה למשחק</p>
            <h3 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 900, color: '#0D1A12', fontFamily: 'Heebo,sans-serif' }}>{prep.opponent_name || prep.name}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#5C6B61' }}>{dateStr}</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(13,26,18,.06)', border: 'none', cursor: 'pointer', fontSize: 14, color: '#5C6B61' }}>✕</button>
        </div>
        {analysis?.mission && (
          <div style={{ borderRadius: 10, padding: '14px 16px', background: '#E7F6EC', borderRight: '4px solid #16A34A' }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', color: '#16A34A' }}>המשימה</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.55, color: '#0D1A12' }}>{analysis.mission}</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 12 }}>
          <span style={{ color: '#94A39A' }}>מערכת</span><span style={{ fontWeight: 700, color: '#0D1A12' }}>{formation} · {prep.opponent_attack_style || ''} · {prep.opponent_strength_level || ''}</span>
          {prep.opponent_key_strength && <><span style={{ color: '#94A39A' }}>חוזק</span><span style={{ fontWeight: 600, color: '#0D1A12' }}>{prep.opponent_key_strength}</span></>}
          {prep.opponent_key_weakness && <><span style={{ color: '#94A39A' }}>חולשה</span><span style={{ fontWeight: 600, color: '#0D1A12' }}>{prep.opponent_key_weakness}</span></>}
          {prep.opponent_dangerous_players && <><span style={{ color: '#94A39A' }}>איומים</span><span style={{ fontWeight: 600, color: '#0D1A12' }}>{prep.opponent_dangerous_players}</span></>}
        </div>
        {analysis && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: '#DC2626', borderBottom: '1px solid rgba(220,38,38,.2)', paddingBottom: 5 }}>בהתקפה</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(analysis.offensive_points || []).map((pt, i) => <p key={i} style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: '#0D1A12' }}>{i + 1}. {pt}</p>)}
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: '#2563EB', borderBottom: '1px solid rgba(37,99,235,.2)', paddingBottom: 5 }}>בהגנה</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(analysis.defensive_points || []).map((pt, i) => <p key={i} style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: '#0D1A12' }}>{i + 1}. {pt}</p>)}
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid rgba(13,26,18,.1)', paddingTop: 14 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#5C6B61', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>סגור</button>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#4ADE80', color: '#0D1A12', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>
            <Printer className="w-4 h-4" />הדפס
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───
function EditModal({ prep, onClose, onSave }) {
  const [strength, setStrength] = useState(prep.opponent_key_strength || '');
  const [weakness, setWeakness] = useState(prep.opponent_key_weakness || '');
  const [threats, setThreats] = useState(prep.opponent_dangerous_players || '');
  const [patterns, setPatterns] = useState(prep.opponent_patterns || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.GamePrep.update(prep.id, {
      opponent_key_strength: strength,
      opponent_key_weakness: weakness,
      opponent_dangerous_players: threats,
      opponent_patterns: patterns,
    });
    onSave({ ...prep, opponent_key_strength: strength, opponent_key_weakness: weakness, opponent_dangerous_players: threats, opponent_patterns: patterns });
    setSaving(false);
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', borderRadius: 8, padding: '9px 12px', fontSize: 14, background: '#FBFAF6', border: '1px solid rgba(13,26,18,.14)', color: '#14231A', fontFamily: 'Assistant,sans-serif' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(13,26,18,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} dir="rtl">
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 460, background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px rgba(13,26,18,.35)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#14231A', fontFamily: 'Heebo,sans-serif' }}>הנתונים שלך על היריב</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(13,26,18,.06)', border: 'none', cursor: 'pointer', fontSize: 14, color: '#5C6B61' }}>✕</button>
        </div>
        <div><label style={{ fontSize: 12, fontWeight: 600, color: '#5C6B61', display: 'block', marginBottom: 4 }}>נקודת חוזק מרכזית</label><input value={strength} onChange={e => setStrength(e.target.value)} style={inputStyle} /></div>
        <div><label style={{ fontSize: 12, fontWeight: 600, color: '#5C6B61', display: 'block', marginBottom: 4 }}>נקודת חולשה מרכזית</label><input value={weakness} onChange={e => setWeakness(e.target.value)} style={inputStyle} /></div>
        <div><label style={{ fontSize: 12, fontWeight: 600, color: '#5C6B61', display: 'block', marginBottom: 4 }}>שחקנים מסוכנים</label><input value={threats} onChange={e => setThreats(e.target.value)} style={inputStyle} /></div>
        <div><label style={{ fontSize: 12, fontWeight: 600, color: '#5C6B61', display: 'block', marginBottom: 4 }}>דפוסים חוזרים</label><input value={patterns} onChange={e => setPatterns(e.target.value)} style={inputStyle} /></div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#5C6B61', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>ביטול</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#4ADE80', color: '#0D1A12', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>{saving ? 'שומר...' : 'שמור'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Work Mode ───
function WorkMode({ prep, analysis, players, matchAnalyses, onShowBalance, onShowReport, onShowEdit, generating }) {
  const balance = getBalanceData(matchAnalyses, prep.opponent_formation);
  const formation = prep.opponent_formation || '4-3-3';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
      {/* Main column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {generating ? (
          <div style={{ borderRadius: 14, padding: '48px 20px', background: '#fff', boxShadow: SHADOW_CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#16A34A' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#14231A' }}>מכין ניתוח מקצועי...</p>
            <p style={{ fontSize: 12, color: '#5C6B61' }}>המערכת מנתחת את נתוני היריב, ההיסטוריה ושיטת המשחק שלך</p>
          </div>
        ) : analysis ? (
          <>
            {/* Mission */}
            <div style={{ borderRadius: 14, padding: '18px 20px', background: '#fff', border: '1px solid rgba(22,163,74,.28)', boxShadow: SHADOW_CARD, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E7F6EC', flexShrink: 0 }}>
                <Crosshair className="w-[18px] h-[18px]" style={{ color: '#16A34A' }} />
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#16A34A' }}>המשימה שלך · ניתוח</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.55, color: '#14231A', fontFamily: 'Heebo,sans-serif' }}>{analysis.mission}</p>
              </div>
            </div>

            {/* Offensive + Defensive */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#DC2626' }}>מה לעשות התקפית</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(analysis.offensive_points || []).map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 6, background: '#FCEBEB', color: '#DC2626', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#14231A' }}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#2563EB' }}>מה לעשות הגנתית</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(analysis.defensive_points || []).map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 6, background: '#EAF1FD', color: '#2563EB', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#14231A' }}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Training topics */}
            {analysis.training_topics?.length > 0 && (
              <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#D97706' }}>נושאי עבודה לאימון הסופי</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {analysis.training_topics.map((tp, i) => (
                    <div key={i} style={{ borderRadius: 10, padding: 12, background: '#FDF3E3' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, lineHeight: 1.5, color: '#14231A' }}>{tp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deep narrative */}
            {analysis.full_narrative && (
              <div style={{ borderRadius: 14, padding: '18px 20px', background: '#fff', boxShadow: SHADOW_CARD }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#5C6B61' }}>ניתוח מעמיק</p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#14231A' }}>{analysis.full_narrative}</p>
              </div>
            )}
          </>
        ) : (
          <div style={{ borderRadius: 14, padding: '48px 20px', background: '#fff', boxShadow: SHADOW_CARD, textAlign: 'center' }}>
            <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8BFB3' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#14231A', marginBottom: 4 }}>הניתוח בהכנה</p>
            <p style={{ fontSize: 12, color: '#5C6B61' }}>הוא נוצר ומתעדכן אוטומטית מנתוני ההכנה</p>
          </div>
        )}
      </div>

      {/* Side column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Coach data */}
        <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#14231A' }}>הנתונים שלך על היריב</p>
            <button onClick={onShowEdit} style={{ fontSize: 11, fontWeight: 600, color: '#16A34A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>עריכה</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'חוזק', value: prep.opponent_key_strength, color: '#16A34A', bg: '#E7F6EC' },
              { label: 'חולשה', value: prep.opponent_key_weakness, color: '#DC2626', bg: '#FCEBEB' },
              { label: 'איום', value: prep.opponent_dangerous_players, color: '#D97706', bg: '#FDF3E3' },
              { label: 'דפוס', value: prep.opponent_patterns, color: '#2563EB', bg: '#EAF1FD' },
            ].filter(r => r.value).map(r => (
              <div key={r.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: r.color, background: r.bg, padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>{r.label}</span>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#14231A' }}>{r.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Balance mini */}
        {balance && (
          <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#14231A' }}>המאזן שלך מול {formation}</p>
              <button onClick={onShowBalance} style={{ fontSize: 11, fontWeight: 600, color: '#16A34A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>למאזן המלא</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#16A34A', fontFamily: 'Heebo,sans-serif' }}>{balance.winPct}%</span>
              <span style={{ fontSize: 12, color: '#5C6B61' }}>ניצחונות · {balance.total} משחקים</span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 9999, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
              {balance.wins > 0 && <div style={{ flex: balance.wins, background: '#16A34A' }} />}
              {balance.draws > 0 && <div style={{ flex: balance.draws, background: '#D97706' }} />}
              {balance.losses > 0 && <div style={{ flex: balance.losses, background: '#DC2626' }} />}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {balance.matches.slice(0, 5).map((ma, i) => {
                const rt = resultType(ma);
                return (
                  <span key={i} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: rt === 'win' ? '#E7F6EC' : rt === 'loss' ? '#FCEBEB' : '#FDF3E3', color: rt === 'win' ? '#16A34A' : rt === 'loss' ? '#DC2626' : '#D97706' }}>
                    {resultLabel(ma)} {rt === 'win' ? "נ'" : rt === 'loss' ? "ה'" : "ת'"}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Pitch */}
        <div style={{ borderRadius: 14, padding: 18, background: '#fff', boxShadow: SHADOW_CARD }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#14231A' }}>הרכב מומלץ · {formation}</p>
          <PitchView players={players} lineupIds={prep.recommended_lineup} formation={formation} dark={false} large={false} />
        </div>
      </div>
    </div>
  );
}

// ─── Matchday Night Mode ───
function MatchdayMode({ prep, analysis, players, matchAnalyses, onShowReport, onShowEdit }) {
  const formation = prep.opponent_formation || '4-3-3';
  const balance = getBalanceData(matchAnalyses, formation);

  const darkCard = { borderRadius: 12, padding: 16, background: '#13241A', border: '1px solid rgba(74,222,128,.14)' };

  return (
    <div>
      {/* Mission banner */}
      {analysis?.mission && (
        <div style={{ borderRadius: 14, padding: '16px 20px', background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.3)', boxShadow: 'inset 0 0 40px rgba(74,222,128,.06)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Crosshair className="w-[22px] h-[22px] flex-shrink-0" style={{ color: '#4ADE80' }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.5, color: '#E9F7EE', fontFamily: 'Heebo,sans-serif' }}>{analysis.mission}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: 18, alignItems: 'start' }}>
        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Attack */}
          <div style={darkCard}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#EF8B8B' }}>התקפה</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(analysis?.offensive_points || []).map((pt, i) => <p key={i} style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'rgba(244,239,230,.85)' }}>{pt}</p>)}
            </div>
          </div>
          {/* Defense */}
          <div style={darkCard}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#7EB0F5' }}>הגנה</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(analysis?.defensive_points || []).map((pt, i) => <p key={i} style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'rgba(244,239,230,.85)' }}>{pt}</p>)}
            </div>
          </div>
          {/* Dangerous players */}
          {prep.opponent_dangerous_players && (
            <div style={{ ...darkCard, border: '1px solid rgba(239,139,139,.25)' }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#EF8B8B' }}>שחקנים מסוכנים</p>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'rgba(244,239,230,.85)' }}>{prep.opponent_dangerous_players}</p>
            </div>
          )}
        </div>

        {/* Center pitch */}
        <PitchView players={players} lineupIds={prep.recommended_lineup} formation={formation} dark={true} large={true} />

        {/* Left rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Coach data */}
          <div style={darkCard}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'rgba(244,239,230,.7)' }}>הנתונים שלך</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, lineHeight: 1.55 }}>
              {prep.opponent_key_strength && <p style={{ margin: 0, color: 'rgba(244,239,230,.85)' }}><span style={{ color: '#4ADE80', fontWeight: 700 }}>חוזק: </span>{prep.opponent_key_strength}</p>}
              {prep.opponent_key_weakness && <p style={{ margin: 0, color: 'rgba(244,239,230,.85)' }}><span style={{ color: '#EF8B8B', fontWeight: 700 }}>חולשה: </span>{prep.opponent_key_weakness}</p>}
              {prep.opponent_patterns && <p style={{ margin: 0, color: 'rgba(244,239,230,.85)' }}><span style={{ color: '#7EB0F5', fontWeight: 700 }}>דפוס: </span>{prep.opponent_patterns}</p>}
            </div>
          </div>
          {/* Balance */}
          {balance && (
            <div style={darkCard}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'rgba(244,239,230,.7)' }}>מאזן מול {formation}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#4ADE80', fontFamily: 'Heebo,sans-serif' }}>{balance.winPct}%</span>
                <span style={{ fontSize: 11, color: 'rgba(244,239,230,.5)' }}>נצ' · {balance.total} משחקים</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {balance.matches.slice(0, 5).map((ma, i) => {
                  const rt = resultType(ma);
                  return (
                    <span key={i} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: rt === 'win' ? 'rgba(74,222,128,.15)' : 'rgba(239,139,139,.15)', color: rt === 'win' ? '#4ADE80' : '#EF8B8B' }}>
                      {resultLabel(ma)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {/* Training topics */}
          {analysis?.training_topics?.length > 0 && (
            <div style={darkCard}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#F0C36D' }}>נושאי אימון</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.training_topics.map((tp, i) => <p key={i} style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'rgba(244,239,230,.85)' }}>· {tp}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Balance View ───
function BalanceView({ matchAnalyses }) {
  const { rows, total, wins, draws, losses } = getFullBalanceRows(matchAnalyses);

  const best = rows.length > 0 ? rows.reduce((a, b) => {
    const aPct = a.matches.filter(m => (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0)).length / a.matches.length;
    const bPct = b.matches.filter(m => (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0)).length / b.matches.length;
    return aPct > bPct ? a : b;
  }) : null;
  const worst = rows.length > 1 ? rows.reduce((a, b) => {
    const aPct = a.matches.filter(m => (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0)).length / a.matches.length;
    const bPct = b.matches.filter(m => (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0)).length / b.matches.length;
    return aPct < bPct ? a : b;
  }) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Summary strip */}
      <div style={{ borderRadius: 14, padding: '16px 20px', background: '#fff', boxShadow: SHADOW_CARD, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 900, color: '#14231A', fontFamily: 'Heebo,sans-serif' }}>{total}</span>
          <span style={{ fontSize: 12, color: '#94A39A' }}>משחקים</span>
        </div>
        <div style={{ flex: 1, display: 'flex', height: 10, borderRadius: 9999, overflow: 'hidden', gap: 2 }}>
          {wins > 0 && <div style={{ flex: wins, background: '#16A34A' }} />}
          {draws > 0 && <div style={{ flex: draws, background: '#D97706' }} />}
          {losses > 0 && <div style={{ flex: losses, background: '#DC2626' }} />}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, fontWeight: 700 }}>
          <span style={{ color: '#16A34A' }}>{wins} נצ'</span>
          <span style={{ color: '#D97706' }}>{draws} תיקו</span>
          <span style={{ color: '#DC2626' }}>{losses} הפ'</span>
        </div>
      </div>

      {/* Formation cards */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {rows.map((row, i) => {
            const w = row.matches.filter(m => (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0)).length;
            const d = row.matches.filter(m => m.result && m.result.our_score === m.result.opponent_score).length;
            const l = row.matches.length - w - d;
            const pct = Math.round((w / row.matches.length) * 100);
            const borderColor = pct >= 50 ? '#16A34A' : pct >= 30 ? '#D97706' : '#DC2626';
            const pctColor = pct >= 50 ? '#16A34A' : pct >= 30 ? '#D97706' : '#DC2626';
            return (
              <div key={i} style={{ borderRadius: 14, padding: 20, background: '#fff', boxShadow: SHADOW_CARD, borderTop: `3px solid ${borderColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#14231A', fontFamily: 'Heebo,sans-serif' }}>{row.formation}</p>
                  <span style={{ fontSize: 24, fontWeight: 900, color: pctColor, fontFamily: 'Heebo,sans-serif' }}>{pct}%</span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#5C6B61' }}>{row.style} · {row.matches.length} משחקים</p>
                <div style={{ display: 'flex', height: 8, borderRadius: 9999, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
                  {w > 0 && <div style={{ flex: w, background: '#16A34A' }} />}
                  {d > 0 && <div style={{ flex: d, background: '#D97706' }} />}
                  {l > 0 && <div style={{ flex: l, background: '#DC2626' }} />}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {row.matches.slice(0, 5).map((ma, j) => {
                    const rt = resultType(ma);
                    return (
                      <span key={j} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: rt === 'win' ? '#E7F6EC' : rt === 'loss' ? '#FCEBEB' : '#FDF3E3', color: rt === 'win' ? '#16A34A' : rt === 'loss' ? '#DC2626' : '#D97706' }}>
                        {resultLabel(ma)}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insight banner */}
      {best && worst && best !== worst && (
        <div style={{ borderRadius: 12, padding: '14px 18px', background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Lightbulb className="w-[18px] h-[18px] flex-shrink-0" style={{ color: '#16A34A' }} />
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#14231A' }}>
            <span style={{ fontWeight: 700 }}>תובנה: </span>
            אתה חזק מול {best.formation} ({Math.round((best.matches.filter(m => (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0)).length / best.matches.length) * 100)}%) וחלש מול {worst.formation} ({Math.round((worst.matches.filter(m => (m.result?.our_score ?? 0) > (m.result?.opponent_score ?? 0)).length / worst.matches.length) * 100)}%).
          </p>
        </div>
      )}

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 14, background: 'rgba(13,26,18,.03)', border: '1px dashed rgba(13,26,18,.15)' }}>
          <Scale className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8BFB3' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#5C6B61' }}>אין נתוני מאזן עדיין</p>
          <p style={{ fontSize: 12, color: '#94A39A' }}>הוסף סיכומי משחק עם מערכת יריב כדי לראות מאזן</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ─── Main MatchdayHub Component ───
// ═══════════════════════════════════════
export default function MatchdayHub({ prep: initialPrep, players, matchAnalyses, onBack, onRefresh }) {
  const [prep, setPrep] = useState(initialPrep);
  const [mode, setMode] = useState(null); // null = auto-detect
  const [view, setView] = useState('prep');
  const [showReport, setShowReport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [analysis, setAnalysis] = useState(initialPrep.ai_analysis || null);
  const [generating, setGenerating] = useState(false);
  const [team, setTeam] = useState(null);

  const countdown = useCountdown(prep.date + 'T' + (prep.match_time || '20:00'));
  const effectiveMode = mode ?? (countdown.isWithin48h ? 'matchday' : 'work');
  const isMatchday = effectiveMode === 'matchday';

  const dateStr = prep.date ? new Date(prep.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' }) : '';
  const formation = prep.opponent_formation || '4-3-3';

  useEffect(() => {
    base44.entities.Team.filter({ id: prep.team_id }).then(teams => setTeam(teams[0] || null));
  }, [prep.team_id]);

  // Identity of the scouting data. The prep analysis builds itself and refreshes
  // whenever these change — there is no manual trigger.
  const prepFingerprint = useMemo(() => objectFingerprint({
    formation: prep.opponent_formation, attack: prep.opponent_attack_style,
    defense: prep.opponent_defense_style, strength: prep.opponent_strength_level,
    keyStrength: prep.opponent_key_strength, keyWeakness: prep.opponent_key_weakness,
    dangerous: prep.opponent_dangerous_players, patterns: prep.opponent_patterns,
  }), [prep]);

  const generateRef = useRef(null);
  const attemptRef = useRef(null);

  useEffect(() => {
    if (generating) return;
    const current = prep.ai_analysis;
    if (current && current.fingerprint === prepFingerprint) return;
    if (attemptRef.current === prepFingerprint) return; // don't retry a failure each render
    attemptRef.current = prepFingerprint;
    generateRef.current?.();
  }, [prepFingerprint, generating, prep.ai_analysis]);

  const generateAnalysis = async () => {
    setGenerating(true);
    const [teams, matches] = await Promise.all([
      team ? Promise.resolve([team]) : base44.entities.Team.filter({ id: prep.team_id }),
      base44.entities.MatchAnalysis.filter({ team_id: prep.team_id }, '-date', 20),
    ]);
    const t = teams[0];
    const teamGameStyle = t?.game_style ? JSON.stringify(t.game_style) : 'לא הוגדרה';
    const recentResults = matches.slice(0, 5).map(ma => `${ma.opponent}: ${ma.result?.our_score ?? '?'}-${ma.result?.opponent_score ?? '?'}`).join(', ');
    const similarMatches = matches.filter(ma => ma.opponent_formation === prep.opponent_formation);
    const vsRecord = similarMatches.length > 0
      ? `${similarMatches.filter(ma => (ma.result?.our_score || 0) > (ma.result?.opponent_score || 0)).length} נצ' מתוך ${similarMatches.length}`
      : '';

    const prompt = `אתה מנטור בכיר — אנליסט עם שנים של ניסיון שמדבר בחום, ישיר, ומוכן להגיד את האמת.
קבוצת המאמן: שיטת משחק: ${teamGameStyle}, תוצאות אחרונות: ${recentResults || 'אין'}
${vsRecord ? `מאזן מול מערכת דומה: ${vsRecord}` : ''}
נתוני ההכנה: מערכת ${prep.opponent_formation || '?'}, התקפה ${prep.opponent_attack_style || '?'}, הגנה ${prep.opponent_defense_style || '?'}, עצמת ${prep.opponent_strength_level || '?'}
${prep.opponent_key_strength ? `חוזק: ${prep.opponent_key_strength}` : ''}
${prep.opponent_key_weakness ? `חולשה: ${prep.opponent_key_weakness}` : ''}
${prep.opponent_dangerous_players ? `מסוכנים: ${prep.opponent_dangerous_players}` : ''}
${prep.opponent_patterns ? `דפוסים: ${prep.opponent_patterns}` : ''}

צור ניתוח הכנה (JSON):
{"mission":"משפט אחד ישיר","offensive_points":["3 נקודות ספציפיות"],"defensive_points":["3 נקודות"],"training_topics":["3 נושאים"],"full_narrative":"פסקה של 4-6 שורות"}
עברית בלבד.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          mission: { type: 'string' },
          offensive_points: { type: 'array', items: { type: 'string' } },
          defensive_points: { type: 'array', items: { type: 'string' } },
          training_topics: { type: 'array', items: { type: 'string' } },
          full_narrative: { type: 'string' },
        }
      }
    });

    if (result && !result.__ai_error) {
      const stored = { ...result, fingerprint: prepFingerprint };
      await base44.entities.GamePrep.update(prep.id, { ai_analysis: stored });
      setAnalysis(stored);
      setPrep(p => ({ ...p, ai_analysis: stored }));
    }
    setGenerating(false);
  };
  generateRef.current = generateAnalysis;

  const handleEditSave = (updated) => {
    setPrep(updated);
    setShowEdit(false);
    onRefresh?.();
  };

  const teamName = team?.name || '';

  return (
    <div style={{ minHeight: isMatchday ? 'calc(100vh - 56px)' : undefined, background: isMatchday ? '#0D1A12' : undefined }} dir="rtl">
      <div style={{ maxWidth: 1064, margin: '0 auto', padding: isMatchday ? '24px 24px 48px' : '0' }}>

        {/* Back button */}
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(74,222,128,.35)', color: isMatchday ? '#4ADE80' : '#16A34A', background: isMatchday ? 'rgba(74,222,128,.06)' : 'rgba(22,163,74,.06)', cursor: 'pointer', fontFamily: 'Assistant,sans-serif', marginBottom: 14 }}>
          <ArrowRight className="w-[14px] h-[14px]" />חזרה לרשימת ההכנות
        </button>

        {/* ─── WORK MODE HERO ─── */}
        {!isMatchday && (
          <div style={{ borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg,#0D1A12 0%,#12251A 100%)', border: '1px solid rgba(74,222,128,.15)', marginBottom: 20 }}>
            <div style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 280 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(74,222,128,.14)', border: '1px solid rgba(74,222,128,.25)', flexShrink: 0 }}>
                  <ShieldCheck className="w-[26px] h-[26px]" style={{ color: '#4ADE80' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#4ADE80' }}>ההכנה הבאה · {dateStr}</p>
                  <h2 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800, color: '#F4EFE6', fontFamily: 'Heebo,sans-serif' }}>מול {prep.opponent_name || prep.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#F4EFE6', fontFamily: 'Heebo,sans-serif' }}>מערכת יריב: {prep.opponent_formation || '?'}</span>
                    {prep.opponent_strength_level && (
                      <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 9999, background: 'rgba(239,139,139,.15)', color: '#EF8B8B', fontWeight: 700 }}>{prep.opponent_strength_level} · {prep.opponent_attack_style || ''}</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <button onClick={() => setShowReport(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#4ADE80', color: '#0D1A12', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>
                  <Printer className="w-[15px] h-[15px]" />הדפס דו"ח הכנה
                </button>
              </div>
            </div>
            {/* Mode toggle strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 26px', background: 'rgba(74,222,128,.06)', borderTop: '1px solid rgba(74,222,128,.12)' }}>
              <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 9999, background: 'rgba(13,26,18,.6)', border: '1px solid rgba(74,222,128,.2)' }}>
                <button onClick={() => setMode('work')} style={{ padding: '5px 16px', borderRadius: 9999, fontSize: 12, fontWeight: effectiveMode === 'work' ? 700 : 600, background: effectiveMode === 'work' ? '#4ADE80' : 'transparent', color: effectiveMode === 'work' ? '#0D1A12' : 'rgba(244,239,230,.6)', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>מצב עבודה</button>
                <button onClick={() => setMode('matchday')} style={{ padding: '5px 16px', borderRadius: 9999, fontSize: 12, fontWeight: effectiveMode === 'matchday' ? 700 : 600, background: effectiveMode === 'matchday' ? '#4ADE80' : 'transparent', color: effectiveMode === 'matchday' ? '#0D1A12' : 'rgba(244,239,230,.6)', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>ליל משחק</button>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(244,239,230,.45)' }}>מצב ליל משחק נדלק אוטומטית 48 שעות לפני המשחק</p>
            </div>
          </div>
        )}

        {/* ─── MATCHDAY MODE HEADER ─── */}
        {isMatchday && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 9999, background: '#13241A', border: '1px solid rgba(74,222,128,.2)' }}>
                <button onClick={() => setMode('work')} style={{ padding: '5px 16px', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: 'rgba(244,239,230,.6)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>מצב עבודה</button>
                <button onClick={() => setMode('matchday')} style={{ padding: '5px 16px', borderRadius: 9999, fontSize: 12, fontWeight: 700, background: '#4ADE80', color: '#0D1A12', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>ליל משחק</button>
              </div>
              <button onClick={() => setShowReport(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#4ADE80', color: '#0D1A12', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>
                <Printer className="w-[15px] h-[15px]" />הדפס דו"ח הכנה
              </button>
            </div>
            <div style={{ marginBottom: 22 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: '#4ADE80' }}>ליל משחק</p>
              <h2 style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 900, color: '#F4EFE6', fontFamily: 'Heebo,sans-serif' }}>{teamName} <span style={{ color: 'rgba(244,239,230,.35)', fontWeight: 400 }}>מול</span> {prep.opponent_name || prep.name}</h2>
            </div>
          </>
        )}

        {/* ─── INNER TABS (work mode only) ─── */}
        {!isMatchday && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: 'rgba(13,26,18,.05)', border: '1px solid rgba(13,26,18,.08)', maxWidth: 420 }}>
            <button onClick={() => setView('prep')} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: view === 'prep' ? '#0D1A12' : 'transparent', color: view === 'prep' ? '#4ADE80' : '#5C6B61', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>תדריך ההכנה</button>
            <button onClick={() => setView('balance')} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: view === 'balance' ? '#0D1A12' : 'transparent', color: view === 'balance' ? '#4ADE80' : '#5C6B61', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif' }}>מאזן מול מערכים</button>
          </div>
        )}

        {/* ─── CONTENT ─── */}
        {!isMatchday && view === 'prep' && (
          <WorkMode
            prep={prep} analysis={analysis} players={players} matchAnalyses={matchAnalyses}
            onShowBalance={() => setView('balance')}
            onShowReport={() => setShowReport(true)}
            onShowEdit={() => setShowEdit(true)}
            generating={generating}
          />
        )}
        {!isMatchday && view === 'balance' && (
          <BalanceView matchAnalyses={matchAnalyses} />
        )}
        {isMatchday && (
          <MatchdayMode
            prep={prep} analysis={analysis} players={players} matchAnalyses={matchAnalyses}
            onShowReport={() => setShowReport(true)}
            onShowEdit={() => setShowEdit(true)}
          />
        )}
      </div>

      {/* Modals */}
      {showReport && <ReportModal prep={prep} analysis={analysis} onClose={() => setShowReport(false)} />}
      {showEdit && <EditModal prep={prep} onClose={() => setShowEdit(false)} onSave={handleEditSave} />}
    </div>
  );
}