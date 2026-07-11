import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, AlertTriangle } from 'lucide-react';

export default function NextGameWidget({ nextGame, urgentIssues = 0 }) {
  if (!nextGame) {
    return null;
  }

  const gameDate = new Date(nextGame.game_date);
  const now = new Date();
  const daysUntilGame = Math.ceil((gameDate - now) / (1000 * 60 * 60 * 24));
  const hoursUntilGame = Math.ceil((gameDate - now) / (1000 * 60 * 60));
  
  let urgencyColor = 'text-slate-400';
  let urgencyBg = 'bg-slate-500/10';
  let urgencyBorder = 'border-slate-500/30';
  
  if (daysUntilGame <= 1) {
    urgencyColor = 'text-red-400';
    urgencyBg = 'bg-red-500/10';
    urgencyBorder = 'border-red-500/40';
  } else if (daysUntilGame <= 3) {
    urgencyColor = 'text-orange-400';
    urgencyBg = 'bg-orange-500/10';
    urgencyBorder = 'border-orange-500/40';
  } else if (daysUntilGame <= 7) {
    urgencyColor = 'text-yellow-400';
    urgencyBg = 'bg-yellow-500/10';
    urgencyBorder = 'border-yellow-500/40';
  }

  const importanceColors = {
    'גבוהה': 'bg-red-500/20 text-red-300 border-red-500/40',
    'בינונית': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'נמוכה': 'bg-slate-500/20 text-slate-300 border-slate-500/40'
  };

  return (
    <Card className={`${urgencyBg} border ${urgencyBorder}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className={`w-4 h-4 ${urgencyColor}`} />
              <span className="text-xs text-slate-500 font-medium">המשחק הבא</span>
              {nextGame.importance && (
                <Badge className={importanceColors[nextGame.importance] || importanceColors['בינונית']}>
                  {nextGame.importance}
                </Badge>
              )}
            </div>
            
            <h3 className={`text-lg font-bold ${urgencyColor} mb-1`}>
              מול {nextGame.opponent}
            </h3>
            
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {gameDate.toLocaleDateString('he-IL', { 
                    day: '2-digit', 
                    month: 'short',
                    year: 'numeric'
                  })}
                  {' ב-'}
                  {gameDate.toLocaleTimeString('he-IL', { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {nextGame.venue && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{nextGame.venue}</span>
                </div>
              )}
              
              <Badge variant="outline" className="text-xs">
                {nextGame.context}
              </Badge>
            </div>

            <div className={`text-sm font-bold ${urgencyColor}`}>
              {daysUntilGame > 0 ? (
                <>
                  {daysUntilGame === 1 ? 'מחר!' : `${daysUntilGame} ימים`}
                </>
              ) : hoursUntilGame > 0 ? (
                `בעוד ${hoursUntilGame} שעות!`
              ) : (
                'היום!'
              )}
            </div>
          </div>

          {urgentIssues > 0 && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-xs text-red-400 font-bold">{urgentIssues}</span>
              <span className="text-xs text-slate-500">דורש טיפול</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}