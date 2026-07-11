import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowUp, Minus, AlertCircle } from 'lucide-react';
import { isGoalkeeper, goalkeeperSkills, fieldPlayerSkills } from './AutoSuggestRatings';

export default function ComparisonTable({ players }) {
  // Check if mixing goalkeepers with field players
  const hasGoalkeeper = players.some(p => isGoalkeeper(p));
  const hasFieldPlayer = players.some(p => !isGoalkeeper(p));
  const isMixedComparison = hasGoalkeeper && hasFieldPlayer;

  const attributes = [
    { label: 'רגל דומיננטית', key: 'dominant_foot', type: 'text' },
    { label: 'משחקים ששיחק', key: 'games_played', type: 'number', higher: true },
    { label: 'גולים עונתיים', key: 'season_goals', type: 'number', higher: true },
    { label: 'בישולים עונתיים', key: 'season_assists', type: 'number', higher: true },
    { label: 'דקות משחק', key: 'minutes_played', type: 'number', higher: true },
    { label: 'סטטוס בסגל', key: 'squad_status', type: 'text' },
    { label: 'זמינות', key: 'availability', type: 'text' },
  ];

  // Use appropriate skill attributes based on player type
  const skillAttributes = hasGoalkeeper ? goalkeeperSkills : fieldPlayerSkills;

  const getBestInAttribute = (attr) => {
    if (attr.type === 'number') {
      const values = players.map(p => p[attr.key] || 0);
      const bestValue = attr.higher ? Math.max(...values) : Math.min(...values);
      return players.filter(p => (p[attr.key] || 0) === bestValue).map(p => p.id);
    }
    return [];
  };

  const compareValues = (attr, player1Val, player2Val) => {
    if (attr.type === 'number') {
      const diff = Math.abs(player1Val - player2Val);
      if (diff === 0) return <Minus className="w-4 h-4 text-slate-400" />;
      if (attr.higher) {
        return player1Val > player2Val ? 
          <ArrowUp className="w-4 h-4 text-emerald-400" /> : 
          <ArrowUp className="w-4 h-4 text-red-400 rotate-180" />;
      }
    }
    return null;
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">השוואה מפורטת</CardTitle>
      </CardHeader>
      <CardContent>
        {isMixedComparison && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-400 font-semibold">אזהרה: השוואה לא תואמת תפקיד</p>
              <p className="text-slate-300 text-xs mt-1">
                ההשוואה כוללת גם שוערים וגם שחקני שדה - הפרמטרים המוצגים עלולים להיות לא רלוונטיים
              </p>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-right p-3 text-sm font-medium text-slate-400 w-1/5">פרמטר</th>
                {players.map(player => (
                  <th key={player.id} className="text-center p-3 text-sm font-medium text-white">
                    {player.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attributes.map((attr, idx) => {
                const bestPlayerIds = getBestInAttribute(attr);
                
                return (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="p-3 text-sm text-slate-300">{attr.label}</td>
                    {players.map((player, pIdx) => {
                      const value = player[attr.key];
                      const displayValue = attr.type === 'number' 
                        ? `${value || 0}${attr.suffix || ''}`
                        : value || '-';
                      
                      const isBest = bestPlayerIds.includes(player.id);
                      
                      return (
                        <td key={player.id} className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-sm ${isBest ? 'text-emerald-400 font-semibold' : 'text-white'}`}>
                              {displayValue}
                            </span>
                            {isBest && attr.type === 'number' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Strengths Row */}
              <tr className="border-b border-slate-800">
                <td className="p-3 text-sm text-slate-300">חוזקות עיקריות</td>
                {players.map(player => (
                  <td key={player.id} className="p-3">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(player.strengths || []).slice(0, 3).map((strength, i) => (
                        <Badge key={i} className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Improvements Row */}
              <tr className="border-b border-slate-800">
                <td className="p-3 text-sm text-slate-300">נקודות לשיפור</td>
                {players.map(player => (
                  <td key={player.id} className="p-3">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(player.improvements || []).slice(0, 3).map((improvement, i) => (
                        <Badge key={i} className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          {improvement}
                        </Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Skill Ratings - Only if available */}
              {players.some(p => p.skill_ratings) && (
                <>
                  <tr className="border-b border-slate-700">
                    <td colSpan={players.length + 1} className="p-2 text-center">
                      <span className="text-xs font-semibold text-slate-500">דירוגי יכולות (1-5)</span>
                    </td>
                  </tr>
                  {skillAttributes.map((skill, idx) => {
                    const values = players.map(p => p.skill_ratings?.[skill.key] || 0);
                    const maxValue = Math.max(...values);
                    
                    return (
                      <tr key={`skill-${idx}`} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="p-3 text-sm text-slate-300">{skill.label}</td>
                        {players.map((player) => {
                          const rating = player.skill_ratings?.[skill.key];
                          const isBest = rating && rating === maxValue && maxValue > 0;
                          
                          return (
                            <td key={player.id} className="p-3 text-center">
                              {rating ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <div
                                        key={star}
                                        className={`w-3 h-3 rounded-full ${
                                          star <= rating 
                                            ? isBest ? 'bg-emerald-400' : 'bg-blue-400'
                                            : 'bg-slate-700'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  {isBest && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-600">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}