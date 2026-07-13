import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit3, Save, X, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
import { suggestRatingsFromSkills, getRelevantSkills, isGoalkeeper } from './AutoSuggestRatings';

function TrendArrow({ current, previous }) {
  if (previous == null || current === previous) return null;
  if (current > previous) {
    return <span style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700, marginRight: 4 }}>↑</span>;
  }
  return <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 700, marginRight: 4 }}>↓</span>;
}

function MiniSparkline({ history }) {
  if (!history || history.length < 2) return null;
  const pts = history.slice(-8);
  const min = 0.5, max = 5.5;
  const w = 80, h = 28, pad = 2;
  const points = pts.map((v, i) => {
    const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v.rating - min) / (max - min)) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const lastPt = pts[pts.length - 1];
  const prevPt = pts[pts.length - 2];
  const color = lastPt.rating > prevPt.rating ? '#4ADE80' : lastPt.rating < prevPt.rating ? '#F59E0B' : '#94A3B8';

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((v, i) => {
        const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v.rating - min) / (max - min)) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 2.5 : 1.5} fill={i === pts.length - 1 ? color : '#64748B'} />;
      })}
    </svg>
  );
}

function SparklineTooltip({ history, visible, anchorRef: _anchorRef }) {
  if (!visible || !history || history.length < 2) return null;
  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
      marginBottom: 6, background: '#1E293B', border: '1px solid #334155',
      borderRadius: 8, padding: '8px 12px', zIndex: 50, minWidth: 100,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <MiniSparkline history={history} />
      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
        {history.length} דגימות
      </div>
    </div>
  );
}

export default function SkillRatingsEditor({ player, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [ratings, setRatings] = useState(player.skill_ratings || {});
  const [saving, setSaving] = useState(false);
  const [historyMap, setHistoryMap] = useState({});
  const [previousMap, setPreviousMap] = useState({});
  const [hoveredSkill, setHoveredSkill] = useState(null);

  const skillDefinitions = getRelevantSkills(player);
  const isGK = isGoalkeeper(player);

  useEffect(() => {
    loadHistory();
  }, [player.id]);

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from('player_attribute_history')
        .select('attribute_name, rating, recorded_at')
        .eq('player_id', player.id)
        .order('recorded_at', { ascending: true });

      if (!data) return;

      const grouped = {};
      const prev = {};
      data.forEach(row => {
        if (!grouped[row.attribute_name]) grouped[row.attribute_name] = [];
        grouped[row.attribute_name].push({ rating: row.rating, recorded_at: row.recorded_at });
      });
      Object.entries(grouped).forEach(([attr, entries]) => {
        if (entries.length > 0) {
          prev[attr] = entries[entries.length - 1].rating;
        }
      });
      setHistoryMap(grouped);
      setPreviousMap(prev);
    } catch (e) {
      console.warn('Failed to load attribute history:', e.message);
    }
  };

  const handleAutoSuggest = () => {
    const suggested = suggestRatingsFromSkills(player);
    setRatings(suggested);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const oldRatings = player.skill_ratings || {};
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const historyRows = [];
      for (const skill of skillDefinitions) {
        const oldVal = oldRatings[skill.key];
        const newVal = ratings[skill.key];
        if (oldVal != null && oldVal !== newVal) {
          historyRows.push({
            player_id: player.id,
            user_id: userId,
            attribute_name: skill.key,
            rating: oldVal,
          });
        }
      }

      if (historyRows.length > 0) {
        await supabase.from('player_attribute_history').insert(historyRows);
      }

      const _updated = await base44.entities.Player.update(player.id, { skill_ratings: ratings });
      setIsEditing(false);
      await loadHistory();
      if (onUpdate) onUpdate(ratings);
    } catch (error) {
      console.error('Error saving skill ratings:', error);
      alert('שגיאה בשמירת הדירוגים: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const hasRatings = Object.keys(player.skill_ratings || {}).length > 0;

  if (!isEditing && !hasRatings) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center">
          <p className="text-slate-400 mb-4">לא הוזנו דירוגי יכולות</p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                setIsEditing(true);
                if (!hasRatings && (player.strengths?.length > 0 || player.improvements?.length > 0)) {
                  const suggested = suggestRatingsFromSkills(player);
                  setRatings(suggested);
                }
              }}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {(player.strengths?.length > 0 || player.improvements?.length > 0) ? (
                <>
                  <Sparkles className="w-4 h-4 ml-2" />
                  הצע אוטומטית
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 ml-2" />
                  הזן ידנית
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">
            {isGK ? 'דירוגי יכולות שוער' : 'דירוגי יכולות כדורגל'}
          </CardTitle>
          {!isEditing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="text-violet-400 hover:text-violet-300"
            >
              <Edit3 className="w-4 h-4 ml-1" />
              ערוך
            </Button>
          ) : (
            <div className="flex gap-2">
              {(player.strengths?.length > 0 || player.improvements?.length > 0) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAutoSuggest}
                  className="text-violet-400 hover:text-violet-300"
                >
                  <Sparkles className="w-4 h-4 ml-1" />
                  הצע
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRatings(player.skill_ratings || {});
                  setIsEditing(false);
                }}
                className="text-slate-400"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 ml-1" />
                {saving ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skillDefinitions.map(skill => {
            const rating = isEditing ? ratings[skill.key] : player.skill_ratings?.[skill.key];
            const prevRating = previousMap[skill.key];
            const history = historyMap[skill.key];
            const currentForTrend = player.skill_ratings?.[skill.key];

            return (
              <div
                key={skill.key}
                className="space-y-2 relative"
                onMouseEnter={() => setHoveredSkill(skill.key)}
                onMouseLeave={() => setHoveredSkill(null)}
                style={{ cursor: history?.length >= 2 ? 'pointer' : 'default' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-300">{skill.label}</span>
                    {!isEditing && <TrendArrow current={currentForTrend} previous={prevRating} />}
                  </div>
                  {rating && (
                    <Badge className="bg-slate-700 text-white text-xs">
                      {rating}/5
                    </Badge>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRatings(prev => ({ ...prev, [skill.key]: value }))}
                        className={`flex-1 h-8 rounded transition-all ${
                          (ratings[skill.key] || 0) >= value
                            ? 'bg-emerald-500 text-white font-semibold'
                            : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(value => (
                      <div
                        key={value}
                        className={`flex-1 h-2 rounded ${
                          (rating || 0) >= value
                            ? 'bg-emerald-500'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <SparklineTooltip
                  history={history}
                  visible={hoveredSkill === skill.key && !isEditing}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
