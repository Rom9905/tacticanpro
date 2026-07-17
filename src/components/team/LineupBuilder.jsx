import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RotateCcw, Star, X, Settings, AlertCircle, Copy, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PlayerSlotPanel from '../lineup/PlayerSlotPanel';
import LineupRecommendations from '../lineup/LineupRecommendations';
import { validateLineup } from '../lineup/PositionRules';
import { generateReadinessReport, autoFixDuplicates } from '../lineup/CriticalIssuesEngine';
import { useLang } from '@/lib/LanguageContext';
import {
  getFormat, formationsFor, layoutFor, positionMappingFor, FORMATION_DESCRIPTIONS,
} from '@/lib/teamFormats';

export default function LineupBuilder({ team, players, onUpdate }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [lineup, setLineup] = useState([]);
  const [bench, setBench] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const teamFormat = getFormat(team);
  const [currentFormation, setCurrentFormation] = useState(team?.formation || teamFormat.defaultFormation);
  const [activeTab, setActiveTab] = useState('match');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showPlayerPanel, setShowPlayerPanel] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Layout comes from the team's format (7v7 / 9v9 / 11v11).
  const positions = layoutFor(team, currentFormation);
  const lineupSize = teamFormat.lineupSize;
  const benchMax = teamFormat.benchSize;
  const positionMapping = positionMappingFor(team, currentFormation);

  useEffect(() => {
    const fmt = getFormat(team);
    const f = team?.formation;
    setCurrentFormation(fmt.formations.includes(f) ? f : fmt.defaultFormation);
    loadTemplates();
  }, [team]);

  const loadTemplates = async () => {
    if (team?.id) {
      const data = await base44.entities.LineupTemplate.filter({ team_id: team.id });
      setTemplates(data);
    }
  };

  useEffect(() => {
    // Initialize lineup from players marked as starters
    const starters = players.filter(p => p.is_starter);
    const newLineup = positions.map((_, index) => {
      const starterAtPosition = starters.find(p => {
        if (!p.lineup_position) return false;
        // Match by position coordinates and ensure uniqueness
        return p.lineup_position.x === positions[index].x && 
               p.lineup_position.y === positions[index].y;
      });
      return starterAtPosition || null;
    });
    setLineup(newLineup);
  }, [players, currentFormation]);

  // Get player IDs already in lineup to prevent duplicates
  const lineupPlayerIds = new Set(
    lineup.filter(Boolean).map(p => p.id)
  );

  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const availablePlayers = players.filter(
    p => (showAllPlayers || p.availability === 'זמין' || !p.availability) && !lineupPlayerIds.has(p.id)
  );

  const handleSlotClick = (index) => {
    if (lineup[index]) {
      // Show player panel
      setShowPlayerPanel(lineup[index]);
    } else {
      setSelectedSlot(index);
    }
  };

  const handleRemovePlayer = () => {
    if (showPlayerPanel) {
      const newLineup = lineup.map(p => p?.id === showPlayerPanel.id ? null : p);
      setLineup(newLineup);
      setShowPlayerPanel(null);
    }
  };

  const handleReplacePlayer = () => {
    if (showPlayerPanel) {
      const index = lineup.findIndex(p => p?.id === showPlayerPanel.id);
      if (index !== -1) {
        setSelectedSlot(index);
        setShowPlayerPanel(null);
      }
    }
  };

  const handlePlayerSelect = (player) => {
    if (selectedSlot !== null) {
      // Check if player is already in lineup
      const existingIndex = lineup.findIndex(p => p?.id === player.id);
      
      if (existingIndex !== -1 && existingIndex !== selectedSlot) {
        // Player already in lineup - ask to move
        if (window.confirm(isHe ? `${player.name} כבר בהרכב. להעביר אותו לעמדה החדשה?` : `${player.name} is already in the lineup. Move to new position?`)) {
          const newLineup = [...lineup];
          newLineup[existingIndex] = null; // Remove from old position
          newLineup[selectedSlot] = player; // Add to new position
          setLineup(newLineup);
          setSelectedSlot(null);
        }
      } else {
        // Player not in lineup or same slot - just assign
        const newLineup = [...lineup];
        newLineup[selectedSlot] = player;
        setLineup(newLineup);
        setSelectedSlot(null);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Update all players - mark starters and set positions
    for (const player of players) {
      // Find player in lineup by ID (not by reference)
      const lineupIndex = lineup.findIndex(p => p?.id === player.id);
      const isStarter = lineupIndex !== -1;
      
      await base44.entities.Player.update(player.id, {
        is_starter: isStarter,
        lineup_position: isStarter ? positions[lineupIndex] : null,
      });
    }
    
    onUpdate(team.id);
    setSaving(false);
  };

  const handleReset = () => {
    if (window.confirm(isHe ? 'לאפס את ההרכב? כל השחקנים יוסרו.' : 'Reset lineup? All players will be removed.')) {
      setLineup(positions.map(() => null));
      setSelectedSlot(null);
    }
  };

  const filledCount = lineup.filter(Boolean).length;
  
  // BUILD ACTIVE LINEUP SNAPSHOT - single source of truth
  const activeLineupSnapshot = {
    teamId: team?.id,
    formationId: currentFormation,
    slots: positions.map((pos, index) => ({
      slotIndex: index,
      positionCode: positionMapping[index],
      positionCoords: pos,
      player: lineup[index],
      playerId: lineup[index]?.id || null,
    }))
  };
  
  // DEBUG: Log snapshot for verification
  console.log('🔍 Active Lineup Snapshot:', {
    formation: activeLineupSnapshot.formationId,
    slots: activeLineupSnapshot.slots.map(s => ({
      index: s.slotIndex,
      position: s.positionCode,
      player: s.player?.name || 'ריק',
      playerPrimaryPosition: s.player?.position || 'N/A'
    }))
  });

  // State for debug modal
  const [showDebugSnapshot, setShowDebugSnapshot] = React.useState(false);
  
  // Advanced validation - RUNS ON SNAPSHOT
  const validation = validateLineup(lineup, positions, positionMapping);
  
  // Generate readiness report - RUNS ON SNAPSHOT with activeSnapshot
  const readinessReport = generateReadinessReport(team || {}, lineup, positions, activeLineupSnapshot);
  
  // Legacy warnings for basic checks
  const basicWarnings = [];
  if (filledCount < lineupSize) {
    basicWarnings.push(`חסרים ${lineupSize - filledCount} שחקנים`);
  }
  
  const allWarnings = [...basicWarnings, ...validation.issues.map(i => i.message)];
  
  const handleAutoFixDuplicates = () => {
    const fixed = autoFixDuplicates(lineup);
    setLineup(fixed);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    
    const templateData = {
      team_id: team.id,
      name: templateName,
      formation: currentFormation,
      starters: lineup.filter(Boolean).map((player, _index) => ({
        player_id: player.id,
        position: positions[lineup.indexOf(player)],
      })),
      bench: bench.map(b => ({
        player_id: b.player.id,
        sub_type: b.subType,
      })),
    };

    await base44.entities.LineupTemplate.create(templateData);
    await loadTemplates();
    setShowSaveTemplate(false);
    setTemplateName('');
  };

  const handleLoadTemplate = async (template) => {
    setCurrentFormation(template.formation);
    
    const newLineup = positions.map(() => null);
    template.starters?.forEach(starter => {
      const player = players.find(p => p.id === starter.player_id);
      const posIndex = positions.findIndex(p => 
        p.x === starter.position.x && p.y === starter.position.y
      );
      if (player && posIndex !== -1) {
        newLineup[posIndex] = player;
      }
    });
    
    setLineup(newLineup);
    
    const newBench = [];
    template.bench?.forEach(b => {
      const player = players.find(p => p.id === b.player_id);
      if (player) {
        newBench.push({ player, subType: b.sub_type || 'חילוף לפי מצב' });
      }
    });
    setBench(newBench);
    
    setSelectedTemplate(template.id);
  };

  const handleApplyRecommendations = (recommendedLineup) => {
    const newLineup = [...lineup];
    recommendedLineup.forEach((player, index) => {
      if (player && index < positions.length) {
        newLineup[index] = player;
      }
    });
    setLineup(newLineup);
    setShowRecommendations(false);
  };

  const handleAddToBench = (player) => {
    if (bench.length < benchMax && !bench.find(b => b.player.id === player.id)) {
      setBench([...bench, { player, subType: 'חילוף לפי מצב' }]);
    }
  };

  const handleRemoveFromBench = (playerId) => {
    setBench(bench.filter(b => b.player.id !== playerId));
  };

  return (
    <div className="space-y-6">
      {/* Templates Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={selectedTemplate || ''} onValueChange={(id) => {
            const template = templates.find(t => t.id === id);
            if (template) handleLoadTemplate(template);
          }}>
            <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder={isHe ? 'בחר תבנית הרכב' : 'Select lineup template'} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedTemplate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                const template = templates.find(t => t.id === selectedTemplate);
                if (template && confirm(isHe ? `למחוק את התבנית "${template.name}"?` : `Delete template "${template.name}"?`)) {
                  await base44.entities.LineupTemplate.delete(selectedTemplate);
                  setSelectedTemplate(null);
                  await loadTemplates();
                }
              }}
              className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {showSaveTemplate ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder={isHe ? 'שם התבנית' : 'Template name'}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-40 bg-slate-800 border-slate-700 text-white"
            />
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isHe ? 'שמור' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSaveTemplate(false)}
              className="text-slate-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSaveTemplate(true)}
            disabled={filledCount === 0}
            className="border-slate-700 text-slate-300"
          >
            <Save className="w-4 h-4 ml-2" />
            {isHe ? 'שמור תבנית' : 'Save Template'}
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const name = prompt(isHe ? 'שם ההרכב המשוכפל:' : 'Duplicate lineup name:');
            if (name && name.trim()) {
              const templateData = {
                team_id: team.id,
                name: name.trim(),
                formation: currentFormation,
                starters: lineup.filter(Boolean).map((player) => ({
                  player_id: player.id,
                  position: positions[lineup.indexOf(player)],
                })),
                bench: bench.map(b => ({ player_id: b.player.id, sub_type: b.subType })),
              };
              base44.entities.LineupTemplate.create(templateData).then(loadTemplates);
            }
          }}
          disabled={filledCount === 0}
          className="border-slate-700 text-slate-300"
        >
          <Copy className="w-4 h-4 ml-2" />
          {isHe ? 'שכפל הרכב' : 'Duplicate'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger 
            value="match"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
          >
            {isHe ? 'הרכב משחק' : 'Match Lineup'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="match" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Field */}
      <div className="lg:col-span-2">
        {/* Formation Selector */}
        <div className="mb-4 flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <Select value={currentFormation} onValueChange={setCurrentFormation}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {formationsFor(team).map(formation => (
                <SelectItem key={formation} value={formation}>
                  {formation} — {FORMATION_DESCRIPTIONS[formation]?.split(' - ')[1] || FORMATION_DESCRIPTIONS[formation]?.split(' — ')[1] || ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-400">{isHe ? 'מערך הקבוצה' : 'Team Formation'}</span>
        </div>
        
        <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
          <CardContent className="p-0">
            {/* Portrait field: fixed aspect ratio 65:100 */}
            <div className="relative w-full" style={{ paddingTop: '154%' }}>
              {/* Field SVG - portrait orientation */}
              <svg
                viewBox="0 0 65 100"
                className="absolute inset-0 w-full h-full"
                style={{ background: '#1a472a' }}
              >
                {/* Outer border */}
                <rect x="2" y="2" width="61" height="96" fill="none" stroke="#2d5a3d" strokeWidth="0.4" />
                {/* Half-way line (horizontal, across width) */}
                <line x1="2" y1="50" x2="63" y2="50" stroke="#2d5a3d" strokeWidth="0.4" />
                {/* Center circle */}
                <circle cx="32.5" cy="50" r="8" fill="none" stroke="#2d5a3d" strokeWidth="0.4" />
                <circle cx="32.5" cy="50" r="0.6" fill="#2d5a3d" />
                {/* Top penalty area */}
                <rect x="15" y="2" width="35" height="14" fill="none" stroke="#2d5a3d" strokeWidth="0.4" />
                {/* Bottom penalty area */}
                <rect x="15" y="84" width="35" height="14" fill="none" stroke="#2d5a3d" strokeWidth="0.4" />
                {/* Top goal area */}
                <rect x="23" y="2" width="19" height="6" fill="none" stroke="#2d5a3d" strokeWidth="0.4" />
                {/* Bottom goal area */}
                <rect x="23" y="92" width="19" height="6" fill="none" stroke="#2d5a3d" strokeWidth="0.4" />
                {/* Top goal */}
                <rect x="27" y="0" width="11" height="2" fill="none" stroke="#2d5a3d" strokeWidth="0.4" />
                {/* Bottom goal */}
                <rect x="27" y="98" width="11" height="2" fill="none" stroke="#2d5a3d" strokeWidth="0.4" />
              </svg>

              {/* Player positions */}
              {positions.map((pos, index) => {
                const player = lineup[index];
                const isSelected = selectedSlot === index;
                // pos.x and pos.y are for a 100x100 landscape field
                // Remap: new_x = pos.x (maps to 0-65 width), new_y = pos.y (maps to 0-100 height)
                // Since original was landscape (100 wide, 100 tall rotated), remap:
                // portrait x = pos.x * (65/100), portrait y = pos.y
                const fieldX = pos.x; // percentage of width (65 units -> %)
                const fieldY = pos.y; // percentage of height (100 units -> %)
                
                return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ left: `${fieldX}%`, top: `${fieldY}%` }}
                    onClick={() => handleSlotClick(index)}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div className={`
                        relative w-9 h-9 rounded-full flex items-center justify-center overflow-hidden
                        transition-all duration-200
                        ${player
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                          : 'bg-slate-800/80 border-2 border-dashed border-slate-500 text-slate-500'
                        }
                        ${isSelected ? 'ring-4 ring-amber-400' : ''}
                        hover:scale-110
                      `}>
                        {player ? (
                          player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={player.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="font-bold text-sm text-white">{player.number || '?'}</span>
                          )
                        ) : (
                          <span className="text-base">+</span>
                        )}
                      </div>
                      {player && (
                        <span
                          className="text-white font-bold whitespace-nowrap px-1.5 py-0.5 rounded"
                          style={{ fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.82)', lineHeight: '1.3', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {player.name.split(' ')[0]}
                        </span>
                      )}
                      {player && (
                        <span
                          className="text-emerald-300 font-medium whitespace-nowrap px-1.5 py-0.5 rounded"
                          style={{ fontSize: '9px', backgroundColor: 'rgba(0,0,0,0.75)', lineHeight: '1.2' }}
                        >
                          {player.position}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>



        {/* Actions */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2 text-sm">
            {filledCount === lineupSize && allWarnings.length === 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {isHe ? 'הרכב מלא ✓' : 'Full Lineup ✓'}
              </span>
            ) : (
              <span className="text-slate-400">{filledCount}/{lineupSize} {isHe ? 'שחקנים בהרכב' : 'players'}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              {isHe ? 'איפוס' : 'Reset'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? (isHe ? 'שומר...' : 'Saving...') : (isHe ? 'שמור הרכב' : 'Save Lineup')}
            </Button>
          </div>
        </div>
      </div>

            {/* Sidebar */}
            <div>
              {/* Squad Status Card */}
              <Card className="bg-slate-900/50 border-slate-800 mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    {isHe ? 'סטטוס ההרכב' : 'Lineup Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{isHe ? 'שחקנים בהרכב:' : 'In lineup:'}</span>
                    <span className={filledCount === lineupSize ? 'text-emerald-400 font-semibold' : 'text-white'}>{filledCount}/{lineupSize}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{isHe ? 'זמינים בסגל:' : 'Available:'}</span>
                    <span className="text-white">{players.filter(p => p.availability === 'זמין' || !p.availability).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{isHe ? 'על הספסל:' : 'On bench:'}</span>
                    <span className="text-white">{bench.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{isHe ? 'עמדות חסרות:' : 'Missing slots:'}</span>
                    {filledCount === lineupSize ? (
                      <span className="text-emerald-400 text-xs">{isHe ? 'אין ✓' : 'None ✓'}</span>
                    ) : (
                      <span className="text-red-400 text-xs">{lineupSize - filledCount} {isHe ? 'עמדות' : 'slots'}</span>
                    )}
                  </div>
        
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    {showAllPlayers ? (isHe ? 'כל שחקני הסגל' : 'All Squad Players') : (isHe ? 'שחקנים זמינים' : 'Available Players')}
                    {selectedSlot !== null && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        בחר שחקן
                      </Badge>
                    )}
                  </h3>
                  <button
                    onClick={() => setShowAllPlayers(!showAllPlayers)}
                    className="text-xs px-2 py-1 rounded transition-all"
                    style={{
                      backgroundColor: showAllPlayers ? 'rgba(42,112,80,0.15)' : 'rgba(139,115,85,0.10)',
                      color: showAllPlayers ? '#2A7050' : '#9A8672',
                      border: `1px solid ${showAllPlayers ? 'rgba(42,112,80,0.3)' : 'rgba(139,115,85,0.2)'}`
                    }}
                  >
                    {showAllPlayers ? (isHe ? 'הצג זמינים בלבד' : 'Available only') : (isHe ? 'הצג כל הסגל' : 'Show all squad')}
                  </button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {availablePlayers.length > 0 ? (
                      availablePlayers.map((player) => {
                        const isInLineup = lineupPlayerIds.has(player.id);
                        const isInBench = bench.some(b => b.player.id === player.id);
                        const skillAvg = player.skill_ratings ? 
                          Math.round(Object.values(player.skill_ratings).reduce((a,b) => a+b, 0) / Object.values(player.skill_ratings).length * 20) : null;
                        return (
                          <div
                            key={player.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                              {player.number || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{player.name}</p>
                              <p className="text-xs text-slate-400">{player.position}</p>
                              {skillAvg !== null && (
                                <p className="text-xs text-emerald-400">{isHe ? 'כושר:' : 'Rating:'} {skillAvg}%</p>
                              )}
                            </div>
                            {isInLineup ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                {isHe ? 'בהרכב' : 'In lineup'}
                              </Badge>
                            ) : isInBench ? (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                {isHe ? 'ספסל' : 'Bench'}
                              </Badge>
                            ) : (
                              <div className="flex gap-1">
                                {selectedSlot !== null && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handlePlayerSelect(player)}
                                    className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/20"
                                  >
                                    {isHe ? 'להרכב' : 'Add'}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAddToBench(player)}
                                  disabled={bench.length >= benchMax}
                                  className="h-7 px-2 text-slate-400 hover:bg-slate-700"
                                >
                                  {isHe ? 'לספסל' : 'Bench'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">
                        {isHe ? 'כל השחקנים הזמינים כבר בהרכב או ספסל' : 'All available players are already in the lineup or bench'}
                      </p>
                    )}
                  </div>

                  {selectedSlot !== null && (
                    <Button
                      variant="ghost"
                      className="w-full mt-3 text-slate-400"
                      onClick={() => setSelectedSlot(null)}
                    >
                      <X className="w-4 h-4 ml-2" />
                      {isHe ? 'ביטול בחירה' : 'Cancel Selection'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Bench */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Star className="w-4 h-4 text-amber-400" />
                    {isHe ? `ספסל מחליפים (${bench.length}/${benchMax})` : `Substitutes Bench (${bench.length}/${benchMax})`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bench.map((b, i) => {
                    const skillAvg = b.player.skill_ratings ? 
                      Math.round(Object.values(b.player.skill_ratings).reduce((a,v) => a+v, 0) / Object.values(b.player.skill_ratings).length * 20) : null;
                    return (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">
                        {b.player.number || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.player.name}</p>
                        <p className="text-xs text-slate-400">{b.player.position}{skillAvg !== null ? ` · ${skillAvg}%` : ''}</p>
                        <Select
                          value={b.subType}
                          onValueChange={(value) => {
                            const newBench = [...bench];
                            newBench[i] = { ...newBench[i], subType: value };
                            setBench(newBench);
                          }}
                        >
                          <SelectTrigger className="h-6 text-xs bg-slate-800 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="חילוף לפי מצב">{isHe ? 'לפי מצב' : 'By situation'}</SelectItem>
                            <SelectItem value="חילוף דקה 60">{isHe ? 'דקה 60' : 'Min 60'}</SelectItem>
                            <SelectItem value="חילוף אם מובילים">{isHe ? 'אם מובילים' : 'If winning'}</SelectItem>
                            <SelectItem value="חילוף אם מפסידים">{isHe ? 'אם מפסידים' : 'If losing'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFromBench(b.player.id)}
                        className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )})}
                  {bench.length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                      {isHe ? 'לחץ "לספסל" ליד שחקן זמין' : 'Click "Bench" next to an available player'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* readiness tab removed */}
        {false && <div>
              {/* Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface-card)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>שחקנים בהרכב</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: filledCount === lineupSize ? 'var(--state-good-text)' : 'var(--text-primary)' }}>
                    {filledCount}/{lineupSize}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface-card)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>מחליפים</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                    {bench.length}/{benchMax}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface-card)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>בעיות</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: (validation.issues.length + validation.warnings.length) > 0 ? 'var(--state-fix-text)' : 'var(--state-good-text)' }}>
                    {validation.issues.length + validation.warnings.length}
                  </p>
                </div>
              </div>

              {/* Critical Issues */}
              {readinessReport.issues.filter(i => i.severity === 'CRITICAL').length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--state-fix-text)' }}>
                      <AlertCircle className="w-5 h-5" />
                      בעיות קריטיות ({readinessReport.criticalCount})
                    </h4>
                  </div>
                  {readinessReport.issues.filter(i => i.severity === 'CRITICAL').map((issue, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--state-fix-bg)', border: '1px solid var(--state-fix-border)' }}>
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--state-fix-text)' }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--state-fix-text)' }}>{issue.title}</p>
                          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                            {issue.whyThisMatters}
                          </p>
                          <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                            {issue.actionNow.map((action, j) => (
                              <p key={j}>• {action}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                      {issue.autoFixAvailable && issue.type === 'duplicate' && (
                        <Button
                          size="sm"
                          onClick={handleAutoFixDuplicates}
                          className="mt-2 h-7 bg-emerald-600 hover:bg-emerald-700"
                        >
                          תקן אוטומטית
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* High Priority Issues */}
              {readinessReport.issues.filter(i => i.severity === 'HIGH').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    סיכונים והתראות ({readinessReport.highCount})
                  </h4>
                  {readinessReport.issues.filter(i => i.severity === 'HIGH').map((issue, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{issue.title}</p>
                          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                            {issue.whyThisMatters}
                          </p>
                          <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                            {issue.actionNow.map((action, j) => (
                              <p key={j}>• {action}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Status */}
              <div className="p-4 rounded-lg" style={{ 
                backgroundColor: readinessReport.legalityOk ? 
                  (readinessReport.highCount > 0 ? 'rgba(251, 191, 36, 0.08)' : 'var(--state-good-bg)') :
                  'var(--state-fix-bg)',
                border: `1px solid ${readinessReport.legalityOk ? 
                  (readinessReport.highCount > 0 ? 'rgba(251, 191, 36, 0.2)' : 'var(--state-good-border)') :
                  'var(--state-fix-border)'}`
              }}>
                <div className="flex items-center gap-2">
                  {readinessReport.legalityOk ? (
                    readinessReport.highCount > 0 ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <div>
                          <p className="text-sm font-medium text-amber-400">ההרכב חוקי אך יש סיכונים</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {readinessReport.summary}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" style={{ color: 'var(--state-good-text)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--state-good-text)' }}>
                          {readinessReport.summary}
                        </p>
                      </>
                    )
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" style={{ color: 'var(--state-fix-text)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--state-fix-text)' }}>
                          {readinessReport.summary}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          יש לתקן את הבעיות הקריטיות לפני שמירה
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Info Items */}
              {validation.info.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--text-muted)' }}>
                    מידע נוסף
                  </h4>
                  {validation.info.slice(0, 3).map((info, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>•</span>
                      <span>{info.message} - {info.player} ב{info.position}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Formation Info */}
              <div>
                <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>מערך משחק:</h4>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {currentFormation} - {FORMATION_DESCRIPTIONS[currentFormation] || 'מערך מאוזן'}
                </p>
              </div>
        </div>}
      </Tabs>

      {/* Modals */}
      {showPlayerPanel && (
        <PlayerSlotPanel
          player={showPlayerPanel}
          onClose={() => setShowPlayerPanel(null)}
          onRemove={handleRemovePlayer}
          onReplace={handleReplacePlayer}
        />
      )}

      {showRecommendations && (
        <LineupRecommendations
          players={players}
          positions={positions}
          currentLineup={lineup}
          activeSnapshot={activeLineupSnapshot}
          onApply={handleApplyRecommendations}
          onClose={() => setShowRecommendations(false)}
        />
      )}

      {/* Debug Snapshot Modal */}
      {showDebugSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDebugSnapshot(false)}>
          <Card 
            className="w-full max-w-4xl max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle style={{ color: 'var(--text-primary)' }}>
                🔍 Debug Snapshot - מצב ההרכב הנוכחי
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <strong>Formation:</strong> {activeLineupSnapshot.formationId}
                </p>
                <table className="w-full text-xs border" style={{ borderColor: 'var(--border-default)' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-card)' }}>
                      <th className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Slot</th>
                      <th className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Position Code</th>
                      <th className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Player ID</th>
                      <th className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Player Name</th>
                      <th className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Primary Position</th>
                      <th className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Secondary Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLineupSnapshot.slots.map((slot) => (
                      <tr key={slot.slotIndex} style={{ backgroundColor: slot.player ? 'transparent' : 'var(--state-fix-bg)' }}>
                        <td className="p-2 border text-center" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                          {slot.slotIndex}
                        </td>
                        <td className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                          {slot.positionCode}
                        </td>
                        <td className="p-2 border font-mono text-xs" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                          {slot.playerId || '-'}
                        </td>
                        <td className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                          {slot.player?.name || 'ריק'}
                        </td>
                        <td className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                          {slot.player?.position || '-'}
                        </td>
                        <td className="p-2 border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                          {slot.player?.position_secondary || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={() => setShowDebugSnapshot(false)}
                className="w-full mt-4"
              >
                סגור
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}