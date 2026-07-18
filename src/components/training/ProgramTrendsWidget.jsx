import React from 'react';

// Dark "recurring topic" banner (README §7). Surfaces the single most
// common work topic across active player programs, with a CTA to turn it
// into a team work topic.
export default function ProgramTrendsWidget({ programs, players: _players, onCreateTopic }) {
  const counts = {};
  programs.filter(p => p.status === 'active').forEach(prog => {
    (prog.work_topics || []).forEach(topic => { counts[topic] = (counts[topic] || 0) + 1; });
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null; // only worth surfacing when 2+ players share it
  const [topic, count] = top;

  return (
    <div style={{ background: '#0D1A12', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(74,222,128,.15)', flexWrap: 'wrap' }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(74,222,128,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📊</span>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ color: '#F4EFE6', fontSize: 12, fontWeight: 700 }}>נושא חוזר אצל {count} שחקנים: {topic}</div>
        <div style={{ color: 'rgba(244,239,230,.55)', fontSize: 11, marginTop: 1 }}>שווה לתרגל את זה באימון הקבוצתי הבא במקום אחד-על-אחד.</div>
      </div>
      {onCreateTopic && (
        <button onClick={() => onCreateTopic(topic)}
          style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)', padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit' }}>
          + הפוך לנושא עבודה
        </button>
      )}
    </div>
  );
}
