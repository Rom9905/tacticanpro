import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit3, Save, X, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { suggestRatingsFromSkills, getRelevantSkills, isGoalkeeper } from './AutoSuggestRatings';

export default function SkillRatingsEditor({ player, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [ratings, setRatings] = useState(player.skill_ratings || {});
  const [saving, setSaving] = useState(false);

  const skillDefinitions = getRelevantSkills(player);
  const isGK = isGoalkeeper(player);

  const handleAutoSuggest = () => {
    const suggested = suggestRatingsFromSkills(player);
    setRatings(suggested);
  };

  const handleSave = async () => {
    setSaving(true);
    console.log('About to save ratings:', ratings);
    console.log('Player ID:', player.id);
    console.log('Full update object:', { skill_ratings: ratings });
    try {
      const updated = await base44.entities.Player.update(player.id, { skill_ratings: ratings });
      console.log('Saved skill ratings - server response:', updated);
      console.log('Server returned skill_ratings:', updated.skill_ratings);
      setIsEditing(false);
      if (onUpdate) {
        onUpdate(ratings);
      }
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
            
            return (
              <div key={skill.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{skill.label}</span>
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}