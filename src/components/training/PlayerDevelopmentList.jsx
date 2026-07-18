import React, { useState } from 'react';
import {
  Users, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertTriangle,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { tr, POSITION_MAP, SKILL_MAP } from '@/lib/hebrewToEnglish';

const CARD_SHADOW = '0 1px 2px rgba(13,26,18,.05), 0 4px 12px rgba(13,26,18,.06)';

// Development trend from the last evaluations (unchanged logic).
function calcDevTrend(evals) {
  if (!evals || evals.length === 0) return { label: '↑ בשיפור', chip: 'לא נבדק', icon: AlertTriangle, color: '#94A39A', bg: 'rgba(148,163,154,.12)', attention: false };
  if (evals.length < 2) return { chip: 'מעט נתונים', icon: Minus, color: '#94A39A', bg: 'rgba(148,163,154,.12)', attention: false };
  const recent = evals.slice(0, 2).map(e => e.rating);
  const older = evals.slice(2, 4).map(e => e.rating);
  const avgR = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgO = older.length ? older.reduce((s, v) => s + v, 0) / older.length : avgR;
  if (avgR > avgO + 0.5) return { chip: '↑ בשיפור', icon: TrendingUp, color: '#16A34A', bg: '#E7F6EC', attention: false };
  if (avgR < avgO - 0.5) return { chip: '⚠ דורש עבודה', icon: TrendingDown, color: '#DC2626', bg: '#FCEBEB', attention: true };
  return { chip: '→ לא עקבי', icon: Minus, color: '#D97706', bg: '#FDF3E3', attention: true };
}

const ratingColor = (r) => (r >= 7 ? '#16A34A' : r >= 5 ? '#D97706' : '#DC2626');

export default function PlayerDevelopmentList({ players, programs, topics: _topics, summaries: _summaries, teamId: _teamId, trainingEvaluations, onRefresh: _onRefresh }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const tVal = (map, val) => (isHe ? val : tr(map, val));
  const [expanded, setExpanded] = useState(null);

  const playersWithPrograms = players
    .map(p => ({ ...p, programs: programs.filter(pr => pr.player_id === p.id) }))
    .filter(p => p.programs.length > 0);

  const Header = (
    <div style={{ margin: '0 4px' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#14231A' }}>{isHe ? 'תוכניות שחקנים' : 'Player Programs'}</div>
      <div style={{ fontSize: 12, color: '#5C6B61', marginTop: 2 }}>
        {isHe ? 'התפתחות אישית של שחקנים עם תוכנית עבודה — מי בשיפור ומי צריך תשומת לב.' : 'Personal development of players with a work plan — who is improving and who needs attention.'}
      </div>
    </div>
  );

  if (playersWithPrograms.length === 0) {
    return (
      <div dir={isHe ? 'rtl' : 'ltr'}>
        {Header}
        <div style={{ marginTop: 14, background: '#fff', borderRadius: 16, padding: '48px 20px', textAlign: 'center', boxShadow: CARD_SHADOW }}>
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
          <p style={{ fontSize: 13, color: '#9A8672' }}>{isHe ? 'עדיין לא נוצרו תוכניות התפתחות לשחקנים' : 'No player development programs yet'}</p>
          <p style={{ fontSize: 11, color: '#C8BFB3', marginTop: 4 }}>{isHe ? 'ניתן ליצור תוכניות דרך פרופיל השחקן' : 'Programs can be created via the player profile'}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isHe ? 'rtl' : 'ltr'}>
      {Header}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        {playersWithPrograms.map(player => {
          const isOpen = expanded === player.id;
          const activePrograms = player.programs.filter(p => p.status === 'active');
          const workTopics = [...new Set(activePrograms.flatMap(p => p.work_topics || []))];
          const playerEvals = (trainingEvaluations || [])
            .filter(e => e.player_id === player.id)
            .sort((a, b) => new Date(b.training_date) - new Date(a.training_date));
          const trend = calcDevTrend(playerEvals);
          const latest = playerEvals[0]?.rating ?? null;

          // Mini bar chart: last 5 ratings, oldest→newest.
          const bars = playerEvals.slice(0, 5).map(e => e.rating).reverse();
          const barColor = (i) => {
            if (i >= bars.length - 3) {
              const step = i - (bars.length - 3); // 0,1,2 → increasing opacity
              const op = [0.4, 0.65, 1][Math.max(0, step)] ?? 1;
              return trend.color + Math.round(op * 255).toString(16).padStart(2, '0');
            }
            return '#EDE8DF';
          };

          return (
            <div key={player.id} style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: CARD_SHADOW, borderTop: trend.attention ? `3px solid ${trend.color}` : 'none' }}>
              <button onClick={() => setExpanded(isOpen ? null : player.id)}
                style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {player.photo_url ? (
                    <div style={{ width: 42, height: 42, borderRadius: 99, overflow: 'hidden', flexShrink: 0, border: `2px solid ${trend.color}55` }}>
                      <img src={player.photo_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: 42, height: 42, borderRadius: 99, background: `${trend.color}1f`, border: `2px solid ${trend.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: trend.color, flexShrink: 0 }}>
                      {(player.name || '?').charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#14231A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</div>
                    <div style={{ fontSize: 10, color: '#94A39A' }}>{tVal(POSITION_MAP, player.position)}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: trend.color, background: trend.bg, padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>{trend.chip}</span>
                </div>

                {/* Mini bar chart */}
                {bars.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginTop: 12 }}>
                    {bars.map((v, i) => (
                      <span key={i} style={{ flex: 1, height: `${Math.max(12, (v / 10) * 100)}%`, borderRadius: 3, background: barColor(i) }} />
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: '#94A39A' }}>{isHe ? 'הערכה אחרונה' : 'Latest rating'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {latest != null && <span style={{ fontSize: 12, fontWeight: 800, color: ratingColor(latest) }}>{latest}/10</span>}
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" style={{ color: '#94A39A' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#94A39A' }} />}
                  </span>
                </div>

                {workTopics.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 10, color: '#5C6B61', background: '#F6F4EE', borderRadius: 8, padding: '6px 9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🎯 {isHe ? 'בעבודה' : 'Working on'}: {workTopics.map(t => tVal(SKILL_MAP, t)).join(' · ')}
                  </div>
                )}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid rgba(139,115,85,.12)', paddingTop: 12 }}>
                  {workTopics.length > 0 && (
                    <div style={{ background: 'rgba(122,79,160,.06)', border: '1px solid rgba(122,79,160,.18)', borderRadius: 10, padding: 12 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#7A4FA0' }}>{isHe ? 'נושאים במעקב:' : 'Topics tracked:'}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {workTopics.map((topic, i) => {
                          const topicEvals = playerEvals.filter(e => e.topic_scores?.[topic] != null);
                          let ts = { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#94A39A' };
                          if (topicEvals.length > 0) {
                            const scores = topicEvals.slice(0, 3).map(e => e.topic_scores[topic]);
                            const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
                            const isRecent = (Date.now() - new Date(topicEvals[0].training_date).getTime()) < 21 * 86400000;
                            if (!isRecent) ts = { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#94A39A' };
                            else if (scores.length >= 2 && scores[0] > scores[scores.length - 1] + 0.5) ts = { label: 'שיפור עקבי', icon: TrendingUp, color: '#16A34A' };
                            else if (avg < 5) ts = { label: 'דורש עבודה', icon: TrendingDown, color: '#DC2626' };
                            else if (avg >= 7) ts = { label: 'שיפור באימונים', icon: TrendingUp, color: '#16A34A' };
                            else ts = { label: 'בעבודה', icon: Minus, color: '#D97706' };
                          }
                          const TSIcon = ts.icon;
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 6, background: '#FAF7F2', border: '1px solid rgba(139,115,85,.10)' }}>
                              <span style={{ fontSize: 12, color: '#14231A' }}>{tVal(SKILL_MAP, topic)}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <TSIcon className="w-3 h-3" style={{ color: ts.color }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: ts.color }}>{ts.label}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {playerEvals.length > 0 && (
                    <div style={{ background: 'rgba(139,115,85,.05)', border: '1px solid rgba(139,115,85,.14)', borderRadius: 10, padding: 12 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#5C4E38' }}>{isHe ? 'הערכות אחרונות:' : 'Recent evaluations:'}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {playerEvals.slice(0, 3).map((ev, i) => (
                          <div key={i} style={{ fontSize: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#9A8672' }}>{new Date(ev.training_date).toLocaleDateString('he-IL')}</span>
                              <span style={{ fontWeight: 800, color: ratingColor(ev.rating) }}>{ev.rating}/10</span>
                            </div>
                            {ev.coach_note && <p style={{ margin: '2px 0 0', fontStyle: 'italic', color: '#7A6B57' }}>{ev.coach_note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
