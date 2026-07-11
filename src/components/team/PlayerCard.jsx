import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Star, AlertCircle, TrendingUp, Target, FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useLang } from '@/lib/LanguageContext';
import { tr, POSITION_MAP, AVAILABILITY_MAP, PROFESSIONAL_STATUS_MAP, ROLE_MAP, SKILL_MAP } from '@/lib/hebrewToEnglish';

const statusColors = {
  'זמין': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'פצוע': 'bg-red-500/20 text-red-400 border-red-500/30',
  'מושעה': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'לא זמין': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

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

export default function PlayerCard({ player, onEdit, onDelete, onQuickView, hasActiveProgram }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const tVal = (map, val) => isHe ? val : tr(map, val);

  // Status indicators
  const playerStatus = player.professional_status || 'יציב';
  const statusConfig = {
    'בהתקדמות': { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: TrendingUp },
    'יציב': { color: 'text-slate-400', bg: 'bg-slate-500/20', icon: null },
    'בירידה': { color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertCircle }
  };
  const currentStatus = statusConfig[playerStatus] || statusConfig['יציב'];
  const StatusIndicator = currentStatus.icon;

  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group relative">
      <CardContent className="p-4">
        {/* Status Indicator - Top Right */}
        {StatusIndicator && (
          <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${currentStatus.bg}`}>
            <div className="w-full h-full rounded-full animate-pulse"></div>
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Photo or Number Badge */}
          {player.photo_url ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(139,115,85,0.25)' }}>
              <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg
              ${positionColors[player.position] || 'bg-slate-600'}
            `}>
              {player.number || '?'}
            </div>
          )}

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 
                className="font-semibold text-white truncate hover:text-emerald-400 cursor-pointer transition-colors"
                onClick={() => window.location.href = createPageUrl(`PlayerProfile?id=${player.id}`)}
              >
                {player.name}
              </h4>
              {player.is_starter && (
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              )}
            </div>
            <p className="text-sm text-slate-400">{tVal(POSITION_MAP, player.position)}</p>
            {player.role && (
              <p className="text-xs text-slate-500 mt-0.5">{tVal(ROLE_MAP, player.role)}</p>
            )}
          </div>

          {/* Status */}
          <Badge variant="outline" className={statusColors[player.status] || statusColors['זמין']}>
            {tVal(AVAILABILITY_MAP, player.status || 'זמין')}
          </Badge>
        </div>

        {/* Active Focus - Prominent */}
        {player.development_goal && (
          <div className="mt-3 p-2.5 rounded-lg bg-violet-500/20 border border-violet-500/40">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-300">{isHe ? 'פוקוס פעיל' : 'Active Focus'}</span>
              {hasActiveProgram && (
                <FileText className="w-3 h-3 text-violet-400" />
              )}
            </div>
            <p className="text-sm text-white font-medium truncate">{player.development_goal}</p>
          </div>
        )}

        {/* Strengths & Improvements - Subtle */}
        {!player.development_goal && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {player.strengths?.slice(0, 2).map((strength, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                {tVal(SKILL_MAP, strength)}
              </span>
            ))}
            {player.improvements?.slice(0, 2).map((imp, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                {tVal(SKILL_MAP, imp)}
              </span>
            ))}
          </div>
        )}



        {/* Quick Action - Always Visible */}
        {player.development_goal && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = createPageUrl(`PlayerProfile?id=${player.id}`);
              }}
              className="w-full text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-xs"
            >
              <Target className="w-3 h-3 ml-1" />
              {hasActiveProgram ? (isHe ? 'פתח תוכנית' : 'Open Program') : (isHe ? 'פרופיל שחקן' : 'Player Profile')}
            </Button>
          </div>
        )}

        {/* Actions - On Hover */}
        <div className="mt-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(player)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(player)}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Compare Button - Always visible when multiple players */}
        {player.onCompare && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => player.onCompare(player.id)}
            className="w-full mt-2 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
          >
            השווה
          </Button>
        )}
      </CardContent>
    </Card>
  );
}