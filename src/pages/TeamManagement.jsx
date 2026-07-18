import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSubscriptionGuard } from '@/components/useSubscriptionGuard';
import PageHero from '@/components/ui/PageHero';
import { motion } from 'framer-motion';
import {
  Plus,
  Users,
  Target,
  Search,
  Star,
  Sword
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import HowItWorksButton from '../components/HowItWorksButton';
import TeamForm from '../components/team/TeamForm';
import PlayerCard from '../components/team/PlayerCard';
import PlayerForm from '../components/team/PlayerForm';
import LineupBuilder from '../components/team/LineupBuilder';
import PlayerQuickView from '../components/player/PlayerQuickView';
import PlayerComparison from '../components/comparison/PlayerComparison';
import GameStyleTab from '../components/team/GameStyleTab';
import { useTeam } from '@/components/TeamContext';
import { useLang } from '@/lib/LanguageContext';
import { formatBadgeLabel } from '@/lib/teamFormats';

export default function TeamManagement({ initialTab, initialPreselect } = {}) {
  const hasPlan = useSubscriptionGuard();
  const { selectedTeamId, selectTeam } = useTeam();
  const { t: langT, dir } = useLang();
  const isHe = langT.lang === 'he';
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const _urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(initialTab || _urlParams.get('tab') || 'squad');
  const [preselectedPlayerId] = useState(initialPreselect || _urlParams.get('preselect') || null);

  // Forms & Dialogs
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, player: null });
  const [quickViewPlayerId, setQuickViewPlayerId] = useState(null);

  const loadTeams = async () => {
    setLoading(true);
    const data = await base44.entities.Team.list();
    setTeams(data);
    if (data.length > 0 && !selectedTeamId) {
      selectTeam(data[0].id);
    }
    setLoading(false);
  };

  const loadPlayers = async (teamId) => {
    const data = await base44.entities.Player.filter({ team_id: teamId });
    setPlayers(data);
    
    // Load training programs for all players
    const programs = await base44.entities.TrainingProgram.filter({ team_id: teamId, status: 'active' });
    setTrainingPrograms(programs);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadPlayers(selectedTeamId);
    }
  }, [selectedTeamId]);

  if (hasPlan === null) return null;
  if (hasPlan === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">אין לך גישה לדף זה</h1>
          <p className="text-slate-400">אנא פנה למנהל המערכת להפעלת הגישה</p>
        </div>
      </div>
    );
  }

  const handleSaveTeam = async (formData) => {
    if (editingTeam) {
      await base44.entities.Team.update(editingTeam.id, formData);
    } else {
      const newTeam = await base44.entities.Team.create(formData);
      selectTeam(newTeam.id);
    }
    loadTeams();
    setShowTeamForm(false);
    setEditingTeam(null);
  };

  const handleSavePlayer = async (formData) => {
    if (editingPlayer) {
      await base44.entities.Player.update(editingPlayer.id, formData);
    } else {
      await base44.entities.Player.create({ ...formData, team_id: selectedTeamId });
    }
    loadPlayers(selectedTeamId);
    setShowPlayerForm(false);
    setEditingPlayer(null);
  };

  const handleDeletePlayer = async () => {
    if (deleteDialog.player) {
      await base44.entities.Player.delete(deleteDialog.player.id);
      loadPlayers(selectedTeamId);
    }
    setDeleteDialog({ open: false, player: null });
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'active_program') {
      matchesStatus = trainingPrograms.some(p => p.player_id === player.id);
    } else if (statusFilter === 'needs_attention') {
      matchesStatus = player.professional_status === 'בירידה' ||
                      (player.improvements?.length > 0 && !trainingPrograms.some(p => p.player_id === player.id));
    } else if (statusFilter === 'progressing') {
      matchesStatus = player.professional_status === 'בהתקדמות';
    }
    
    return matchesSearch && matchesPosition && matchesStatus;
  });

  const starters = players.filter(p => p.is_starter);
  const positions = [...new Set(players.map(p => p.position).filter(Boolean))];

  return (
    <div className="min-h-screen p-4 md:p-6 theme-cream" style={{ backgroundColor: '#F4EFE6' }} dir={dir}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <PageHero
            icon={Users}
            title={isHe ? 'ניהול קבוצה' : 'Team Management'}
            subtitle={isHe ? 'נהל את הסגל, בנה הרכב ופתח שחקנים' : 'Manage the squad, build lineup and develop players'}
            titleExtra={<HowItWorksButton page="TeamManagement" />}
            style={{ border: '1px solid rgba(74,222,128,0.20)' }}
          />
        </div>

        {selectedTeam && (
          <>
            {/* Team Info Card */}
            <Card className="bg-slate-900/50 border-slate-800 mb-6">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-white">{selectedTeam.name}</h2>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.35)' }}>
                          {formatBadgeLabel(selectedTeam)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        {selectedTeam.league && <span>{selectedTeam.league}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-sm">
                      <span className="text-slate-400">{isHe ? 'מערך:' : 'Formation:'} </span>
                      <span className="text-white font-medium">{selectedTeam.formation || '—'}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-sm">
                      <span className="text-slate-400">{isHe ? 'סגנון:' : 'Style:'} </span>
                      <span className="text-white font-medium">{selectedTeam.playing_style || 'מאוזן'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-900 border border-slate-800 mb-6">
                <TabsTrigger 
                  value="squad" 
                  className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                >
                  <Users className="w-4 h-4 ml-2" />
                  {isHe ? `סגל (${players.length})` : `Squad (${players.length})`}
                </TabsTrigger>
                <TabsTrigger 
                  value="lineup" 
                  className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                >
                  <Target className="w-4 h-4 ml-2" />
                  {isHe ? `הרכב (${starters.length}/11)` : `Lineup (${starters.length}/11)`}
                </TabsTrigger>
                <TabsTrigger 
                  value="comparison" 
                  className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                >
                  <Star className="w-4 h-4 ml-2" />
                  {isHe ? 'השוואת שחקנים' : 'Compare Players'}
                </TabsTrigger>
                <TabsTrigger 
                  value="gamestyle" 
                  className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                >
                  <Sword className="w-4 h-4 ml-2" />
                  {isHe ? 'שיטת משחק' : 'Game Style'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="squad">
                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder={isHe ? 'חפש שחקן...' : 'Search player...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  >
                    <option value="all">{isHe ? 'כל העמדות' : 'All Positions'}</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  >
                    <option value="all">{isHe ? 'כל הסטטוסים' : 'All Statuses'}</option>
                    <option value="active_program">{isHe ? 'עם תוכנית פעילה' : 'With Active Program'}</option>
                    <option value="progressing">{isHe ? 'מתקדמים' : 'Progressing'}</option>
                    <option value="needs_attention">{isHe ? 'דורשים תשומת לב' : 'Needs Attention'}</option>
                  </select>
                  <Button 
                    onClick={() => { setEditingPlayer(null); setShowPlayerForm(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    {isHe ? 'הוסף שחקן' : 'Add Player'}
                  </Button>
                </div>

                {/* Players Grid */}
                {filteredPlayers.length > 0 ? (
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                    }}
                  >
                    {filteredPlayers.map((player) => (
                      <motion.div
                        key={player.id}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          show: { opacity: 1, y: 0 }
                        }}
                      >
                        <PlayerCard
                          player={player}
                          hasActiveProgram={trainingPrograms.some(p => p.player_id === player.id)}
                          onEdit={(p) => { setEditingPlayer(p); setShowPlayerForm(true); }}
                          onDelete={(p) => setDeleteDialog({ open: true, player: p })}
                          onQuickView={(p) => setQuickViewPlayerId(p.id)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-12 text-center">
                      <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        {searchQuery || positionFilter !== 'all' ? (isHe ? 'לא נמצאו שחקנים' : 'No players found') : (isHe ? 'הסגל ריק' : 'Squad is empty')}
                      </h3>
                      <p className="text-slate-400 mb-4">
                        {searchQuery || positionFilter !== 'all' 
                          ? (isHe ? 'נסה לשנות את החיפוש או הסינון' : 'Try changing the search or filter')
                          : (isHe ? 'הוסף את השחקנים הראשונים לקבוצה' : 'Add the first players to the team')
                        }
                      </p>
                      {!searchQuery && positionFilter === 'all' && (
                        <Button 
                          onClick={() => { setEditingPlayer(null); setShowPlayerForm(true); }}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          {isHe ? 'הוסף שחקן' : 'Add Player'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="lineup">
                <LineupBuilder 
                  team={selectedTeam} 
                  players={players} 
                  onUpdate={loadPlayers}
                />
              </TabsContent>

              <TabsContent value="comparison">
                <PlayerComparison 
                  teamId={selectedTeamId}
                  preselectedPlayerId={preselectedPlayerId}
                  onAddToLineup={(player) => {
                    base44.entities.Player.update(player.id, { is_starter: true });
                    loadPlayers(selectedTeamId);
                    setActiveTab('lineup');
                  }}
                />
              </TabsContent>

              <TabsContent value="gamestyle">
                <GameStyleTab teamId={selectedTeamId} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* No Teams State */}
        {!loading && teams.length === 0 && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {isHe ? 'בוא נתחיל!' : "Let's get started!"}
              </h3>
              <p className="text-slate-400 mb-6">
                {isHe ? 'צור את הקבוצה הראשונה שלך כדי להתחיל לנהל את הסגל' : 'Create your first team to start managing the squad'}
              </p>
              <Button
                onClick={() => { window.location.href = '/'; }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                {isHe ? 'צור קבוצה' : 'Create Team'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Forms & Dialogs */}
        <TeamForm
          isOpen={showTeamForm}
          onClose={() => { setShowTeamForm(false); setEditingTeam(null); }}
          team={editingTeam}
          onSave={handleSaveTeam}
        />

        <PlayerForm
          isOpen={showPlayerForm}
          onClose={() => { setShowPlayerForm(false); setEditingPlayer(null); }}
          player={editingPlayer}
          onSave={handleSavePlayer}
        />

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, player: null })}>
          <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>{isHe ? 'מחיקת שחקן' : 'Delete Player'}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                {isHe ? `האם אתה בטוח שברצונך למחוק את ${deleteDialog.player?.name}? פעולה זו לא ניתנת לביטול.` : `Are you sure you want to delete ${deleteDialog.player?.name}? This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                {isHe ? 'ביטול' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePlayer} className="bg-red-600 hover:bg-red-700">
                {isHe ? 'מחק' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Player Quick View */}
        <PlayerQuickView
          playerId={quickViewPlayerId}
          isOpen={!!quickViewPlayerId}
          onClose={() => setQuickViewPlayerId(null)}
        />
      </div>
    </div>
  );
}