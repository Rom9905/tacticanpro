import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { tr, POSITION_MAP, ROLE_MAP, PROFESSIONAL_STATUS_MAP, SKILL_MAP } from '@/lib/hebrewToEnglish';

export default function PlayerQuickView({ playerId, isOpen, onClose }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const tVal = (map, val) => isHe ? val : tr(map, val);
  const [player, setPlayer] = useState(null);
  const [trainingProgram, setTrainingProgram] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (playerId && isOpen) {
      loadPlayer();
    }
  }, [playerId, isOpen]);

  const loadPlayer = async () => {
    setLoading(true);
    const players = await base44.entities.Player.list();
    const found = players.find(p => p.id === playerId);
    setPlayer(found);
    
    // Load active training program
    if (found) {
      const programs = await base44.entities.TrainingProgram.filter({ 
        player_id: found.id, 
        status: 'active' 
      });
      setTrainingProgram(programs[0] || null);
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  const statusConfig = {
    'בהתקדמות': { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    'יציב': { icon: Minus, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    'בירידה': { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  };

  const currentStatus = statusConfig[player?.professional_status || 'יציב'];
  const StatusIcon = currentStatus.icon;
  const recentMatch = player?.match_history?.[player.match_history.length - 1];
  
  // Calculate activity status
  const daysSinceLastUpdate = recentMatch 
    ? Math.floor((new Date() - new Date(recentMatch.date)) / (1000 * 60 * 60 * 24))
    : null;
  const gamesSinceUpdate = player?.match_history?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
        {loading || !player ? (
          <div className="py-8 text-center text-slate-400">{isHe ? 'טוען...' : 'Loading...'}</div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl">{player.name}</DialogTitle>
                  <div className="flex items-center gap-3 mt-2 text-slate-400">
                    <span>{tVal(POSITION_MAP, player.position)}</span>
                    {player.role && <span>• {tVal(ROLE_MAP, player.role)}</span>}
                    {player.number && <span>• #{player.number}</span>}
                  </div>
                </div>
                <Badge className={`${currentStatus.bg} ${currentStatus.color} ${currentStatus.border} border`}>
                  <StatusIcon className="w-3 h-3 ml-1" />
                  {tVal(PROFESSIONAL_STATUS_MAP, player.professional_status || 'יציב')}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800">
                  <div className="text-2xl font-bold text-emerald-400">{player.season_goals || 0}</div>
                  <div className="text-xs text-slate-400">{isHe ? 'גולים עונתיים' : 'Season Goals'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800">
                  <div className="text-2xl font-bold text-blue-400">{player.season_assists || 0}</div>
                  <div className="text-xs text-slate-400">{isHe ? 'בישולים עונתיים' : 'Season Assists'}</div>
                </div>
              </div>

              {/* Active Focus / Weakness */}
              {trainingProgram ? (
                <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium text-violet-400">{isHe ? 'תוכנית אימונים פעילה' : 'Active Training Program'}</span>
                  </div>
                  <p className="text-white font-medium mb-1">{trainingProgram.focus_title}</p>
                  <p className="text-sm text-slate-400">{isHe ? 'חולשה עיקרית: ' : 'Main weakness: '}{tVal(SKILL_MAP, trainingProgram.primary_weakness)}</p>
                </div>
              ) : player.development_goal ? (
                <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium text-violet-400">{isHe ? 'פוקוס פיתוח' : 'Development Focus'}</span>
                  </div>
                  <p className="text-white font-medium mb-2">{player.development_goal}</p>
                  {player.development_focus_play && (
                    <p className="text-sm text-slate-300">דגש משחקי: {player.development_focus_play}</p>
                  )}
                </div>
              ) : null}

              {/* Activity Status & CTA */}
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                {daysSinceLastUpdate !== null ? (
                  <div className="mb-3">
                    <span className="text-sm text-slate-400">
                      {isHe ? `פעילות אחרונה: לפני ${daysSinceLastUpdate} ימים` : `Last activity: ${daysSinceLastUpdate} days ago`}
                    </span>
                  </div>
                ) : (
                  <div className="mb-3">
                    <span className="text-sm text-slate-400">{isHe ? 'לא קיימת היסטוריית משחקים' : 'No match history'}</span>
                  </div>
                )}
                
                {trainingProgram ? (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => window.location.href = createPageUrl('PlayerProfile') + `?id=${player.id}`}
                  >
                    {isHe ? 'עדכן אימון / משחק' : 'Update Training / Match'}
                  </Button>
                ) : player.improvements?.length > 0 ? (
                  <Button 
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    onClick={() => window.location.href = createPageUrl('PlayerProfile') + `?id=${player.id}`}
                  >
                    {isHe ? 'צור תוכנית אימונים' : 'Create Training Program'}
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-slate-600"
                    disabled
                  >
                    {isHe ? 'הגדר נקודות לשיפור לפני יצירת תוכנית' : 'Set improvement points before creating a program'}
                  </Button>
                )}
              </div>
              
              {/* Last Match Summary */}
              {recentMatch && (
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{isHe ? 'משחק אחרון: ' : 'Last match: '}{recentMatch.opponent}</span>
                    <Badge className={`
                      ${recentMatch.trend === 'התקדמות' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
                      ${recentMatch.trend === 'ירידה' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''}
                      ${recentMatch.trend === 'ללא שינוי' ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' : ''}
                    `}>
                      {recentMatch.trend}
                    </Badge>
                  </div>
                </div>
              )}

              {/* View Full Profile */}
              <Link to={createPageUrl('PlayerProfile') + `?id=${player.id}`}>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                <ExternalLink className="w-4 h-4 ml-2" />
                {isHe ? 'פתח דף שחקן מלא' : 'Open Full Player Profile'}
              </Button>
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}