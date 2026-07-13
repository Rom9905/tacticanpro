import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, AlertTriangle
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { tr, POSITION_MAP, SKILL_MAP } from '@/lib/hebrewToEnglish';


// Calculate development trend from evaluations
function calcDevTrend(evals) {
  if (!evals || evals.length === 0) return { label: 'לא נבדק עדיין', icon: AlertTriangle, color: '#9A8672', bg: 'rgba(139,115,85,0.08)' };
  if (evals.length < 2) return { label: 'מעט נתונים', icon: Minus, color: '#9A8672', bg: 'rgba(139,115,85,0.08)' };
  const recent = evals.slice(0, 2).map(e => e.rating);
  const older = evals.slice(2, 4).map(e => e.rating);
  const avgR = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgO = older.length ? older.reduce((s, v) => s + v, 0) / older.length : avgR;
  if (avgR > avgO + 0.5) return { label: '↑ שיפור באימונים', icon: TrendingUp, color: '#2A7050', bg: 'rgba(42,112,80,0.08)' };
  if (avgR < avgO - 0.5) return { label: '⚠ דורש עבודה', icon: TrendingDown, color: '#B94040', bg: 'rgba(185,64,64,0.08)' };
  return { label: '→ עדיין לא עקבי', icon: Minus, color: '#D97706', bg: 'rgba(217,119,6,0.08)' };
}

export default function PlayerDevelopmentList({ players, programs, topics: _topics, summaries: _summaries, teamId: _teamId, trainingEvaluations, onRefresh: _onRefresh }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const tVal = (map, val) => isHe ? val : tr(map, val);
  const [expanded, setExpanded] = useState(null);

  // Only players who have at least one active program
  const playersWithPrograms = players
    .map(p => ({
      ...p,
      programs: programs.filter(pr => pr.player_id === p.id),
    }))
    .filter(p => p.programs.length > 0);

  // Common recurring topics across active programs
  const allWorkTopics = programs
    .filter(p => p.status === 'active' && p.work_topics)
    .flatMap(p => p.work_topics);
  const topicCounts = {};
  allWorkTopics.forEach(topic => { topicCounts[topic] = (topicCounts[topic] || 0) + 1; });
  const commonTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  if (playersWithPrograms.length === 0) {
    return (
      <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
        <CardContent className="py-12 text-center">
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
          <p className="text-sm" style={{ color: '#9A8672' }}>{isHe ? 'עדיין לא נוצרו תוכניות התפתחות לשחקנים' : 'No player development programs yet'}</p>
          <p className="text-xs mt-1" style={{ color: '#C8BFB3' }}>
            {isHe ? 'ניתן ליצור תוכניות דרך פרופיל השחקן' : 'Programs can be created via the player profile'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Common Topics Summary */}
      {commonTopics.length > 0 && (
        <Card style={{ backgroundColor: 'rgba(42,112,80,0.06)', border: '1px solid rgba(42,112,80,0.22)' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" style={{ color: '#2A7050' }} />
              <span className="font-semibold text-sm" style={{ color: '#2A7050' }}>{isHe ? 'מגמות בתוכניות האישיות' : 'Trends in Personal Programs'}</span>
            </div>
            <p className="text-xs mb-2" style={{ color: '#5C4E38' }}>{isHe ? 'נושאים שחוזרים אצל שחקנים:' : 'Recurring topics across players:'}</p>
            <div className="space-y-1.5">
              {commonTopics.map(({ topic, count }) => (
                <div key={topic} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span style={{ color: '#2A7050' }}>•</span>
                    <span style={{ color: '#2C2416' }}>{tVal(SKILL_MAP, topic)}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'rgba(42,112,80,0.15)', color: '#2A7050' }}>
                    {count} {isHe ? 'שחקנים' : 'players'}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 italic" style={{ color: '#7A6B57' }}>
              {isHe ? '💡 כדאי לעבוד על נושאים אלו באימונים הקבוצתיים הקרובים' : '💡 Consider working on these topics in upcoming team training sessions'}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs font-semibold" style={{ color: '#9A8672' }}>
        {playersWithPrograms.length} {isHe ? 'שחקנים עם תוכניות אישיות' : 'players with personal programs'}
      </p>

      {playersWithPrograms.map(player => {
        const isOpen = expanded === player.id;
        const activePrograms = player.programs.filter(p => p.status === 'active');
        const workTopics = [...new Set(activePrograms.flatMap(p => p.work_topics || []))];

        // Dev trend from evaluations
        const playerEvals = (trainingEvaluations || [])
          .filter(e => e.player_id === player.id)
          .sort((a, b) => new Date(b.training_date) - new Date(a.training_date));
        const trend = calcDevTrend(playerEvals);
        const TrendIcon = trend.icon;

        return (
          <Card key={player.id}
            style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
            <CardContent className="p-0">
              {/* Compact header row */}
              <button
                className="w-full text-right p-4 flex items-center gap-3"
                onClick={() => setExpanded(isOpen ? null : player.id)}
              >
                {/* Avatar */}
                {player.photo_url ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                    style={{ border: '2px solid rgba(42,112,80,0.25)' }}>
                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ backgroundColor: 'rgba(42,112,80,0.15)', color: '#2A7050' }}>
                    {(player.name || '?').charAt(0)}
                  </div>
                )}

                {/* Name + position */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: '#2C2416' }}>{player.name}</div>
                  <div className="text-[11px]" style={{ color: '#9A8672' }}>{tVal(POSITION_MAP, player.position)}</div>
                </div>

                {/* Focus topics (center) */}
                <div className="hidden sm:flex flex-col gap-0.5 flex-1 min-w-0 px-2">
                  {workTopics.slice(0, 2).map((t, i) => (
                    <span key={i} className="text-[11px] truncate" style={{ color: '#5C4E38' }}>• {tVal(SKILL_MAP, t)}</span>
                  ))}
                  {workTopics.length > 2 && (
                    <span className="text-[10px]" style={{ color: '#9A8672' }}>+{workTopics.length - 2} נוספים</span>
                  )}
                </div>

                {/* Dev Status */}
                <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: trend.bg, border: `1px solid ${trend.color}30` }}>
                  <TrendIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: trend.color }} />
                  <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: trend.color }}>{trend.label}</span>
                </div>

                <div className="flex-shrink-0 mr-1">
                  {isOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#9A8672' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#9A8672' }} />}
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(139,115,85,0.12)' }}>
                  {/* Work Topics with per-topic status */}
                  {workTopics.length > 0 && (
                    <div className="rounded-lg p-3"
                      style={{ backgroundColor: 'rgba(122,79,160,0.06)', border: '1px solid rgba(122,79,160,0.18)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#7A4FA0' }}>נושאים במעקב:</p>
                      <div className="space-y-1.5">
                        {workTopics.map((topic, i) => {
                          const topicEvals = playerEvals.filter(e => e.topic_scores?.[topic] != null);
                          let tStatus = { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#9A8672' };
                          if (topicEvals.length > 0) {
                            const scores = topicEvals.slice(0, 3).map(e => e.topic_scores[topic]);
                            const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
                            const isRecent = (Date.now() - new Date(topicEvals[0].training_date).getTime()) < 21 * 86400000;
                            if (!isRecent) tStatus = { label: 'לא נבדק לאחרונה', icon: AlertTriangle, color: '#9A8672' };
                            else if (scores.length >= 2 && scores[0] > scores[scores.length - 1] + 0.5) tStatus = { label: 'שיפור עקבי', icon: TrendingUp, color: '#2A7050' };
                            else if (avg < 5) tStatus = { label: 'דורש עבודה', icon: TrendingDown, color: '#B94040' };
                            else if (avg >= 7) tStatus = { label: 'שיפור באימונים', icon: TrendingUp, color: '#2A7050' };
                            else tStatus = { label: 'בעבודה', icon: Minus, color: '#D97706' };
                          }
                          const TSIcon = tStatus.icon;
                          return (
                            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded"
                              style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.10)' }}>
                              <span className="text-xs" style={{ color: '#2C2416' }}>{tVal(SKILL_MAP, topic)}</span>
                              <div className="flex items-center gap-1">
                                <TSIcon className="w-3 h-3" style={{ color: tStatus.color }} />
                                <span className="text-[10px] font-semibold" style={{ color: tStatus.color }}>{tStatus.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent Evaluations */}
                  {playerEvals.length > 0 && (
                    <div className="rounded-lg p-3"
                      style={{ backgroundColor: 'rgba(139,115,85,0.05)', border: '1px solid rgba(139,115,85,0.14)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#5C4E38' }}>הערכות אחרונות:</p>
                      <div className="space-y-2">
                        {playerEvals.slice(0, 3).map((ev, i) => (
                          <div key={i} className="text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span style={{ color: '#9A8672' }}>{new Date(ev.training_date).toLocaleDateString('he-IL')}</span>
                              <span className="font-bold" style={{ color: ev.rating >= 7 ? '#2A7050' : ev.rating >= 5 ? '#D97706' : '#B94040' }}>
                                {ev.rating}/10
                              </span>
                            </div>
                            {ev.topic_scores && Object.keys(ev.topic_scores).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {Object.entries(ev.topic_scores).map(([t, s]) => (
                                  <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px]"
                                    style={{ backgroundColor: 'rgba(139,115,85,0.1)', color: '#5C4E38' }}>
                                    {tVal(SKILL_MAP, t)}: {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            {ev.coach_note && <p className="mt-0.5 italic" style={{ color: '#7A6B57' }}>{ev.coach_note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}