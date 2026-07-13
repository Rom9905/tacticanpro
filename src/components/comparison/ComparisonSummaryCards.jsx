import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const positionColors = {
  'שוער': 'bg-yellow-500',
  'בלם': 'bg-blue-500',
  'מגן ימין': 'bg-blue-400',
  'מגן שמאל': 'bg-blue-400',
  'קשר הגנתי': 'bg-green-600',
  'קשר מרכזי': 'bg-green-500',
  'קשר התקפי': 'bg-green-400',
  'כנף ימין': 'bg-purple-500',
  'כנף שמאל': 'bg-purple-500',
  'חלוץ': 'bg-red-500',
};

export default function ComparisonSummaryCards({ players }) {
  const statusIcons = {
    'בהתקדמות': TrendingUp,
    'יציב': Minus,
    'בירידה': TrendingDown,
  };

  const statusColors = {
    'בהתקדמות': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'יציב': 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    'בירידה': 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {players.map((player) => {
        const StatusIcon = statusIcons[player.professional_status] || Minus;
        const statusClass = statusColors[player.professional_status] || statusColors['יציב'];

        return (
          <Card key={player.id} className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg
                  ${positionColors[player.position] || 'bg-slate-600'}
                `}>
                  {player.number || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate">{player.name}</h4>
                  <p className="text-sm text-slate-400">{player.position}</p>
                  {player.role && (
                    <p className="text-xs text-slate-500">{player.role}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Badge className={`${statusClass} border flex items-center gap-1 w-full justify-center`}>
                  <StatusIcon className="w-3 h-3" />
                  {player.professional_status || 'יציב'}
                </Badge>

                {/* Dominant Foot */}
                {player.dominant_foot && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">רגל:</span>
                    <span className="text-white">{player.dominant_foot}</span>
                  </div>
                )}

                {/* Squad Status */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">סגל:</span>
                  <span className="text-white">{player.squad_status || 'סגל'}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700">
                  <span className="text-slate-400">משחקים:</span>
                  <span className="text-white">{player.games_played || 0}</span>
                </div>

                {/* Goals & Assists */}
                {(player.season_goals > 0 || player.season_assists > 0) && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400">⚽ {player.season_goals || 0}</span>
                    <span className="text-blue-400">🎯 {player.season_assists || 0}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}