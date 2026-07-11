import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, Edit2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PlayerTagging({ 
  teamId, 
  homePlayers, 
  awayPlayers, 
  onUpdatePlayer,
  showMode, // 'all', 'roles', 'responsibilities'
  onShowModeChange,
  containerRef
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [playerData, setPlayerData] = useState({
    name: '',
    role: '',
    responsibility: '',
  });
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);

  useEffect(() => {
    if (showDialog && teamId && !playersLoaded) {
      loadTeamPlayers();
    }
  }, [showDialog, teamId]);

  const loadTeamPlayers = async () => {
    if (!teamId || playersLoaded) return;
    try {
      const players = await base44.entities.Player.filter({ team_id: teamId });
      setTeamPlayers(players);
      setPlayersLoaded(true);
    } catch (error) {
      console.error('Failed to load players:', error);
    }
  };

  const handleEditPlayer = (player, team) => {
    setEditingPlayer({ ...player, team });
    setPlayerData({
      name: player.name || '',
      role: player.role || '',
      responsibility: player.responsibility || '',
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editingPlayer) {
      onUpdatePlayer({
        ...editingPlayer,
        ...playerData,
      });
    }
    setShowDialog(false);
    setEditingPlayer(null);
  };

  const handleQuickAssign = (realPlayer) => {
    setPlayerData({
      name: realPlayer.name,
      role: realPlayer.role || '',
      responsibility: '',
    });
  };

  const rolePresets = [
    'שוער יוזם', 'שוער שומר',
    'בלם מוביל', 'בלם כיסוי', 'בלם מהיר',
    'מגן תומך', 'מגן מכסה',
    'אנכר הגנתי', 'קשר מאזן', 'קשר מחבר', 'קשר עמוק',
    'בוקס טו בוקס', 'יוצר משחק', 'עשר קלאסי',
    'כנף רחב', 'כנף חודרני', 'כנף חותך',
    'חלוץ מסיים', 'חלוץ מטרה', 'חלוץ נופל', 'שני חודים'
  ];

  const responsibilityPresets = [
    'בנייה מאחור',
    'יציאה לכדור',
    'ארגון קו הגנה',
    'כיסוי עומק',
    'רוחב התקפי',
    'חיבור בין שלישים',
    'סיום והבקעה',
    'לחץ ראשון',
    'סגירת קווי מסירה',
    'תמיכה הגנתית',
    'ריצות לעומק',
    'שמירה על מבנה',
  ];

  const showModes = [
    { id: 'all', label: 'הכל', icon: Eye },
    { id: 'roles', label: 'תפקידים', icon: User },
    { id: 'responsibilities', label: 'אחריות', icon: Edit2 },
  ];

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-slate-500 font-medium">תיוג שחקנים</div>
          <div className="flex gap-1">
            {showModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => onShowModeChange(mode.id)}
                  className={`
                    px-2 py-1 rounded text-xs transition-all
                    ${showMode === mode.id 
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' 
                      : 'text-slate-400 hover:text-white'
                    }
                  `}
                  title={mode.label}
                >
                  <Icon className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          <div className="text-xs text-emerald-400 font-medium">קבוצה ביתית</div>
          {homePlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 text-xs group hover:bg-slate-800"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-emerald-400 font-medium shrink-0">#{player.number}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-white truncate">{player.name || `שחקן ${player.number}`}</div>
                  {showMode !== 'responsibilities' && player.role && (
                    <div className="text-slate-400 text-xs truncate">{player.role}</div>
                  )}
                  {showMode !== 'roles' && player.responsibility && (
                    <div className="text-violet-400 text-xs truncate italic">{player.responsibility}</div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditPlayer(player, 'home')}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
          ))}

          {awayPlayers.length > 0 && (
            <>
              <div className="text-xs text-red-400 font-medium mt-3">קבוצה חוץ</div>
              {awayPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 text-xs group hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-red-400 font-medium shrink-0">#{player.number}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-white truncate">{player.name || `יריב ${player.number}`}</div>
                      {showMode !== 'responsibilities' && player.role && (
                        <div className="text-slate-400 text-xs truncate">{player.role}</div>
                      )}
                      {showMode !== 'roles' && player.responsibility && (
                        <div className="text-violet-400 text-xs truncate italic">{player.responsibility}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditPlayer(player, 'away')}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg" container={containerRef?.current}>
          <DialogHeader>
            <DialogTitle>
              עריכת שחקן #{editingPlayer?.number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick assign from real players */}
            {teamPlayers.length > 0 && editingPlayer?.team === 'home' && (
              <div>
                <label className="text-sm text-slate-400 mb-2 block">שיוך לשחקן מהסגל</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {teamPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleQuickAssign(p)}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-right border border-slate-700"
                    >
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.position}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 mb-1 block">שם השחקן</label>
              <Input
                value={playerData.name}
                onChange={(e) => setPlayerData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="שם השחקן"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">תפקיד טקטי</label>
              <Input
                value={playerData.role}
                onChange={(e) => setPlayerData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="לדוגמה: בלם מוביל"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {rolePresets.slice(0, 6).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setPlayerData(prev => ({ ...prev, role: preset }))}
                    className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">אחריות במצב זה</label>
              <Textarea
                value={playerData.responsibility}
                onChange={(e) => setPlayerData(prev => ({ ...prev, responsibility: e.target.value }))}
                placeholder="מה האחריות הספציפית במצב הזה?"
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {responsibilityPresets.slice(0, 6).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setPlayerData(prev => ({ ...prev, responsibility: preset }))}
                    className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDialog(false)}>ביטול</Button>
              <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
                שמור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}