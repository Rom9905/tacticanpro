import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Activity, AlertCircle } from 'lucide-react';
import { isGoalkeeper, goalkeeperSkills, fieldPlayerSkills } from './AutoSuggestRatings';

export default function ComparisonRadarChart({ players }) {
  const chartData = useMemo(() => {
    // Check if mixing goalkeepers with field players
    const hasGoalkeeper = players.some(p => isGoalkeeper(p));
    const hasFieldPlayer = players.some(p => !isGoalkeeper(p));
    const isMixedComparison = hasGoalkeeper && hasFieldPlayer;

    if (isMixedComparison) {
      return { error: 'mixed' };
    }

    // Only show if all players have skill ratings
    const allHaveRatings = players.every(p => p.skill_ratings && Object.keys(p.skill_ratings).length > 0);
    
    if (!allHaveRatings) {
      return null;
    }

    // Use appropriate categories based on player type
    const categories = hasGoalkeeper ? goalkeeperSkills : fieldPlayerSkills;

    return categories.map(cat => {
      const dataPoint = { category: cat.label };
      players.forEach((player, idx) => {
        // Convert 1-5 scale to percentage for radar chart
        const rating = player.skill_ratings?.[cat.key] || 0;
        dataPoint[`player${idx}`] = (rating / 5) * 100;
      });
      return dataPoint;
    });
  }, [players]);

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

  if (chartData?.error === 'mixed') {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 text-violet-400" />
            פרופיל יכולות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <p className="text-amber-400 font-semibold mb-2">השוואה לא תואמת תפקיד</p>
            <p className="text-slate-400 text-sm">
              לא ניתן להשוות בין שוער לשחקני שדה מאחר והפרמטרים שונים לחלוטין
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 text-violet-400" />
            פרופיל יכולות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-400">
            <p>יש להזין דירוגי יכולות עבור כל השחקנים כדי להציג את הגרף</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Activity className="w-5 h-5 text-violet-400" />
          פרופיל יכולות (דירוגים 1-5)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis 
              dataKey="category" 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            {players.map((player, idx) => (
              <Radar
                key={player.id}
                name={player.name}
                dataKey={`player${idx}`}
                stroke={colors[idx % colors.length]}
                fill={colors[idx % colors.length]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}