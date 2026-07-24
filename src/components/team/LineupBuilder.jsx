import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Save, RotateCcw, Star, X, Copy, CheckCircle, Zap } from 'lucide-react';
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
import { computeFitScore } from '../lineup/SmartLineupEngine';
import { useLang } from '@/lib/LanguageContext';
import {
  getFormat, formationsFor, layoutFor, positionMappingFor, pitchStyleFor, FORMATION_DESCRIPTIONS,
} from '@/lib/teamFormats';

// ─── Premium Match-Day surfaces ───
const CARD = {
  background: 'var(--bg-card, #FFFFFF)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-card)',
};
const ROW = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 10px',
  borderRadius: 12,
  background: '#FBFAF6',
  border: '1px solid rgba(13,26,18,0.07)',
  transition: 'border-color .2s ease',
};
const NUM_CIRCLE = (size) => ({
  width: size,
  height: size,
  flex: 'none',
  borderRadius: '50%',
  overflow: 'hidden',
  background: 'linear-gradient(180deg,#16281C,#0D1A12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const skillPct = (p) => {
  const vals = p?.skill_ratings ? Object.values(p.skill_ratings) : [];
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20);
};

const isAvailable = (p) => (p.availability || 'זמין') === 'זמין';

// Short hint after the formation name: the tail of the description when it
// has a dash, otherwise the description itself.
const formationHint = (formation) => {
  const desc = FORMATION_DESCRIPTIONS[formation];
  if (!desc) return '';
  return desc.split(/ [-—] /)[1] || desc;
};

export default function LineupBuilder({ team, players, onUpdate }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [lineup, setLineup] = useState([]);
  const [bench, setBench] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const teamFormat = getFormat(team);
  const [currentFormation, setCurrentFormation] = useState(team?.formation || teamFormat.defaultFormation);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showPlayerPanel, setShowPlayerPanel] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  // Layout comes from the team's format (7v7 / 9v9 / 11v11).
  const positions = layoutFor(team, currentFormation);
  const lineupSize = teamFormat.lineupSize;
  const benchMax = teamFormat.benchSize;
  const positionMapping = positionMappingFor(team, currentFormation);
  // Pitch design per format: markings shrink and tokens grow on small pitches.
  const { tokenScale, markingScale } = pitchStyleFor(team);
  // SVG marking geometry (viewBox 65x100), centred on x=32.5.
  const penW = 35 * markingScale, penX = 32.5 - penW / 2;
  const goalW = 19 * markingScale, goalX = 32.5 - goalW / 2;
  const penD = 14 * markingScale, goalD = 6 * markingScale;
  const circleR = 8 * markingScale;
  const tokenPx = Math.round(42 * tokenScale);
  // Penalty spots and the "D" arc clipped at the box edge.
  const spotTop = 2 + penD * 0.75, spotBottom = 98 - penD * 0.75;
  const arcDy = penD * 0.25;
  const arcDx = circleR > arcDy ? Math.sqrt(circleR * circleR - arcDy * arcDy) : 0;
  const boxEdgeTop = 2 + penD, boxEdgeBottom = 98 - penD;
  const arcTop = arcDx
    ? `M${(32.5 - arcDx).toFixed(2)} ${boxEdgeTop.toFixed(2)} A${circleR} ${circleR} 0 0 0 ${(32.5 + arcDx).toFixed(2)} ${boxEdgeTop.toFixed(2)}`
    : '';
  const arcBottom = arcDx
    ? `M${(32.5 + arcDx).toFixed(2)} ${boxEdgeBottom.toFixed(2)} A${circleR} ${circleR} 0 0 0 ${(32.5 - arcDx).toFixed(2)} ${boxEdgeBottom.toFixed(2)}`
    : '';

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

  const availablePlayers = players
    .filter(p => (showAllPlayers || isAvailable(p)) && !lineupPlayerIds.has(p.id))
    .slice()
    .sort((a, b) => (skillPct(b) ?? -1) - (skillPct(a) ?? -1));

  const handleSlotClick = (index) => {
    if (lineup[index]) {
      setShowPlayerPanel(lineup[index]);
      setSelectedSlot(null);
    } else {
      setSelectedSlot(prev => (prev === index ? null : index));
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
    if (selectedSlot === null) return;
    // Assign to the picked slot and clear the player from any other slot / the bench.
    setLineup(lineup.map((p, i) => (i === selectedSlot ? player : (p?.id === player.id ? null : p))));
    setBench(bench.filter(b => b.player.id !== player.id));
    setSelectedSlot(null);
  };

  // Greedy best-fit auto-fill, reusing the SmartLineupEngine scoring.
  // Slots with no legal candidate stay empty rather than taking an
  // out-of-position player that PositionRules would flag as critical.
  const handleAutoFill = () => {
    const used = new Set();
    const next = positions.map((slot) => {
      let best = null, bestScore = -Infinity;
      players.forEach(p => {
        if (used.has(p.id) || !isAvailable(p)) return;
        const score = computeFitScore(p, slot.pos, 'balanced');
        if (score <= -999) return;
        // Skill % is the tie-break between equally-fitting players.
        const total = score * 100 + (skillPct(p) ?? 0);
        if (total > bestScore) { bestScore = total; best = p; }
      });
      if (best) used.add(best.id);
      return best;
    });

    setLineup(next);
    setBench(bench.filter(b => !used.has(b.player.id)));
    setSelectedSlot(null);
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
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = () => {
    if (window.confirm(isHe ? 'לאפס את ההרכב? כל השחקנים יוסרו.' : 'Reset lineup? All players will be removed.')) {
      setLineup(positions.map(() => null));
      setSelectedSlot(null);
    }
  };

  const filledCount = lineup.filter(Boolean).length;
  const isFull = filledCount === lineupSize;
  const missingCount = lineupSize - filledCount;
  const pickMode = selectedSlot !== null;

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

  // Advanced validation - RUNS ON SNAPSHOT
  const validation = validateLineup(lineup, positions, positionMapping);

  // Generate readiness report - RUNS ON SNAPSHOT with activeSnapshot
  const readinessReport = generateReadinessReport(team || {}, lineup, positions, activeLineupSnapshot);

  const allWarnings = [
    ...(isFull ? [] : [`חסרים ${missingCount} שחקנים`]),
    ...validation.issues.map(i => i.message),
  ];

  const handleAutoFixDuplicates = () => {
    setLineup(autoFixDuplicates(lineup));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;

    const templateData = {
      team_id: team.id,
      name: templateName,
      formation: currentFormation,
      starters: lineup.filter(Boolean).map((player) => ({
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

  // ─── Line strength (defense / midfield / attack) ───
  const classifyLine = (pos = '') => {
    if (pos.includes('שוער') || pos.includes('בלם') || pos.includes('מגן')) return 'defense';
    if (pos.includes('קשר')) return 'midfield';
    return 'attack';
  };
  const onField = lineup.filter(Boolean);
  const lines = [
    { id: 'defense', label: isHe ? 'הגנה' : 'Defense', color: '#2563EB' },
    { id: 'midfield', label: isHe ? 'קישור' : 'Midfield', color: '#16A34A' },
    { id: 'attack', label: isHe ? 'התקפה' : 'Attack', color: '#D97706' },
  ].map(line => {
    const members = onField.filter(p => classifyLine(p.position) === line.id);
    const pcts = members.map(skillPct).filter(v => v !== null);
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
    return { ...line, members: members.length, avg };
  });

  const countColor = isFull ? '#16A34A' : '#14231A';
  const subtitle = [team?.name, team?.league, teamFormat.label].filter(Boolean).join(' · ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ─── Templates bar ─── */}
      <div style={{ ...CARD, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Select value={selectedTemplate || ''} onValueChange={(id) => {
          const template = templates.find(t => t.id === id);
          if (template) handleLoadTemplate(template);
        }}>
          <SelectTrigger className="w-48" style={{ background: '#FFFFFF', border: '1px solid rgba(13,26,18,0.14)', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: '#14231A' }}>
            <SelectValue placeholder={isHe ? 'בחר תבנית הרכב' : 'Select lineup template'} />
          </SelectTrigger>
          <SelectContent>
            {templates.map(template => (
              <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTemplate && (
          <button
            onClick={async () => {
              const template = templates.find(t => t.id === selectedTemplate);
              if (template && window.confirm(isHe ? `למחוק את התבנית "${template.name}"?` : `Delete template "${template.name}"?`)) {
                await base44.entities.LineupTemplate.delete(selectedTemplate);
                setSelectedTemplate(null);
                await loadTemplates();
              }
            }}
            title={isHe ? 'מחק תבנית' : 'Delete template'}
            style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {showSaveTemplate ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input
              placeholder={isHe ? 'שם התבנית' : 'Template name'}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-40"
              style={{ background: '#FFFFFF', border: '1px solid rgba(13,26,18,0.14)', borderRadius: 10, color: '#14231A' }}
            />
            <button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
              className="premium-btn-green"
              style={{ fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '8px 16px', border: 'none', cursor: 'pointer', opacity: templateName.trim() ? 1 : 0.5 }}
            >
              {isHe ? 'שמור' : 'Save'}
            </button>
            <button
              onClick={() => setShowSaveTemplate(false)}
              style={{ border: 'none', background: 'none', color: '#5C6B61', cursor: 'pointer', padding: 6, display: 'flex' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveTemplate(true)}
            disabled={filledCount === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', border: '1px solid rgba(13,26,18,0.15)', background: '#FFFFFF', color: '#14231A', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '8px 14px', cursor: filledCount ? 'pointer' : 'not-allowed', opacity: filledCount ? 1 : 0.5 }}
          >
            <Save className="w-4 h-4" />
            {isHe ? 'שמור תבנית' : 'Save Template'}
          </button>
        )}

        <button
          onClick={() => {
            const name = window.prompt(isHe ? 'שם ההרכב המשוכפל:' : 'Duplicate lineup name:');
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
          style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', border: '1px solid rgba(13,26,18,0.15)', background: '#FFFFFF', color: '#14231A', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '8px 14px', cursor: filledCount ? 'pointer' : 'not-allowed', opacity: filledCount ? 1 : 0.5 }}
        >
          <Copy className="w-4 h-4" />
          {isHe ? 'שכפל הרכב' : 'Duplicate'}
        </button>
      </div>

      {/* ─── Toolbar ─── */}
      <div style={{ ...CARD, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 19, color: '#14231A' }}>
            {isHe ? 'הרכב משחק' : 'Match Lineup'}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#5C6B61' }}>{subtitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Format is read-only — it belongs to the team. */}
          <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', color: '#16A34A', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: 9999, padding: '6px 14px' }}>
            {teamFormat.label}
          </span>
          <Select value={currentFormation} onValueChange={setCurrentFormation}>
            <SelectTrigger className="w-auto" style={{ background: '#FFFFFF', border: '1px solid rgba(13,26,18,0.14)', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: '#14231A', whiteSpace: 'nowrap' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formationsFor(team).map(formation => (
                <SelectItem key={formation} value={formation}>
                  {formation}{formationHint(formation) ? ` — ${formationHint(formation)}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={handleAutoFill}
            style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', border: '1px solid rgba(22,163,74,0.35)', background: 'rgba(74,222,128,0.12)', color: '#16A34A', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', transition: 'all .2s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.12)'; }}
          >
            <Zap className="w-4 h-4" />
            {isHe ? 'מלא אוטומטית' : 'Auto-fill'}
          </button>
          <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', color: countColor, background: '#FBFAF6', border: '1px solid rgba(13,26,18,0.08)', borderRadius: 9999, padding: '6px 14px' }}>
            {filledCount}/{lineupSize}
          </span>
        </div>
      </div>

      {/* ─── Main row ─── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* ─── Pitch column ─── */}
        <div style={{ flex: '1 1 420px', minWidth: 'min(420px,100%)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            maxWidth: 540, width: '100%', margin: '0 auto', position: 'relative',
            aspectRatio: '65/100', borderRadius: 18, overflow: 'hidden',
            background: 'linear-gradient(180deg,#37954F 0%,#2E8047 55%,#2A7742 100%)',
            boxShadow: '0 2px 4px rgba(13,26,18,.06), 0 12px 28px rgba(13,26,18,.14)',
          }}>
            {/* Mow stripes */}
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.05) 8.333%, rgba(13,26,18,0.02) 8.333%, rgba(13,26,18,0.02) 16.666%)' }} />
            {/* Vignette */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(130% 95% at 50% 42%, rgba(0,0,0,0) 55%, rgba(13,26,18,0.28) 100%)' }} />

            <svg viewBox="0 0 65 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <g fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="0.35">
                <rect x="2" y="2" width="61" height="96" />
                <line x1="2" y1="50" x2="63" y2="50" />
                <circle cx="32.5" cy="50" r={circleR} />
                <rect x={penX} y="2" width={penW} height={penD} />
                <rect x={penX} y={98 - penD} width={penW} height={penD} />
                <rect x={goalX} y="2" width={goalW} height={goalD} />
                <rect x={goalX} y={98 - goalD} width={goalW} height={goalD} />
                <rect x="27.5" y="0.4" width="10" height="1.6" />
                <rect x="27.5" y="98" width="10" height="1.6" />
                {arcTop && <path d={arcTop} />}
                {arcBottom && <path d={arcBottom} />}
                <path d="M2 3.8 A1.8 1.8 0 0 0 3.8 2" />
                <path d="M61.2 2 A1.8 1.8 0 0 0 63 3.8" />
                <path d="M3.8 98 A1.8 1.8 0 0 0 2 96.2" />
                <path d="M63 96.2 A1.8 1.8 0 0 0 61.2 98" />
              </g>
              <g fill="rgba(255,255,255,0.62)">
                <circle cx="32.5" cy="50" r="0.6" />
                <circle cx="32.5" cy={spotTop} r="0.5" />
                <circle cx="32.5" cy={spotBottom} r="0.5" />
              </g>
            </svg>

            {/* Player tokens */}
            {positions.map((pos, index) => {
              const player = lineup[index];
              const isSelected = selectedSlot === index;
              return (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSlotClick(index)}
                  style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)', cursor: 'pointer', zIndex: 2 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {player ? (
                      <>
                        <div
                          style={{
                            width: tokenPx, height: tokenPx, borderRadius: '50%', overflow: 'hidden',
                            background: 'linear-gradient(180deg,#16281C,#0D1A12)',
                            border: `2.5px solid ${isSelected ? '#FBBF24' : '#4ADE80'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 5px 12px rgba(13,26,18,0.45), inset 0 1px 0 rgba(255,255,255,0.14)',
                            transition: 'transform .15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                        >
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 16, color: '#4ADE80' }}>
                              {player.number || '?'}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', background: 'rgba(13,26,18,0.88)', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                          {player.name.split(' ').slice(-1)[0]}
                        </span>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: '#86EFAC', background: 'rgba(13,26,18,0.68)', padding: '1px 6px', borderRadius: 5, whiteSpace: 'nowrap' }}>
                          {player.position}
                        </span>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            width: tokenPx, height: tokenPx, borderRadius: '50%',
                            background: 'rgba(13,26,18,0.22)',
                            border: `2px dashed ${isSelected ? '#FBBF24' : 'rgba(255,255,255,0.75)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 700,
                            transition: 'transform .15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                        >+</div>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.92)', background: 'rgba(13,26,18,0.5)', padding: '1px 6px', borderRadius: 5, whiteSpace: 'nowrap' }}>
                          {pos.pos}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Line strength */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 540, width: '100%', margin: '0 auto' }}>
            {lines.map(line => (
              <div key={line.id} style={{ ...CARD, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#5C6B61' }}>{line.label}</span>
                  <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 16, color: line.avg !== null ? line.color : '#94A39A' }}>
                    {line.avg !== null ? `${line.avg}%` : '—'}
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(13,26,18,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${line.avg || 0}%`, background: line.color, borderRadius: 3, transition: 'width .4s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: '#94A39A', marginTop: 5 }}>
                  {line.members} {isHe ? 'שחקנים' : 'players'}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ maxWidth: 540, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            {isFull && allWarnings.length === 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: '#16A34A' }}>
                <CheckCircle className="w-4 h-4" />
                {isHe ? 'ההרכב מלא ומוכן למשחק' : 'Lineup is complete and match-ready'}
              </span>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#D97706', background: '#FDF3E3', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 9999, padding: '5px 12px' }}>
                {isHe
                  ? (isFull ? allWarnings[0] : `חסרים ${missingCount} שחקנים להרכב מלא`)
                  : (isFull ? allWarnings[0] : `${missingCount} players missing`)}
              </span>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleReset}
                style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(13,26,18,0.15)', background: '#FFFFFF', color: '#14231A', fontSize: 13.5, fontWeight: 700, borderRadius: 10, padding: '9px 16px', cursor: 'pointer', transition: 'all .2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FBFAF6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <RotateCcw className="w-4 h-4" />
                {isHe ? 'איפוס' : 'Reset'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="premium-btn-green"
                style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', fontSize: 13.5, fontWeight: 700, borderRadius: 10, padding: '9px 20px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? (isHe ? 'שומר...' : 'Saving...') : saved ? (isHe ? 'נשמר' : 'Saved') : (isHe ? 'שמור הרכב' : 'Save Lineup')}
              </button>
            </div>
          </div>

          {/* Critical readiness issues */}
          {readinessReport.issues.filter(i => i.severity === 'CRITICAL').length > 0 && (
            <div style={{ maxWidth: 540, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {readinessReport.issues.filter(i => i.severity === 'CRITICAL').map((issue, i) => (
                <div key={i} style={{ background: '#FCEBEB', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 2 }}>{issue.title}</div>
                  <div style={{ fontSize: 11.5, color: '#5C6B61' }}>{issue.whyThisMatters}</div>
                  {issue.autoFixAvailable && issue.type === 'duplicate' && (
                    <button
                      onClick={handleAutoFixDuplicates}
                      className="premium-btn-green"
                      style={{ marginTop: 8, border: 'none', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}
                    >
                      {isHe ? 'תקן אוטומטית' : 'Auto-fix'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Sidebar ─── */}
        <div style={{ flex: '1 1 320px', minWidth: 'min(320px,100%)', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Lineup status */}
          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 14, color: '#14231A', marginBottom: 10 }}>
              <Star className="w-4 h-4" style={{ color: '#D97706' }} />
              {isHe ? 'סטטוס ההרכב' : 'Lineup Status'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                <span style={{ color: '#5C6B61', whiteSpace: 'nowrap', flex: 'none' }}>{isHe ? 'שחקנים בהרכב' : 'In lineup'}</span>
                <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, whiteSpace: 'nowrap', color: countColor }}>{filledCount}/{lineupSize}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                <span style={{ color: '#5C6B61', whiteSpace: 'nowrap', flex: 'none' }}>{isHe ? 'זמינים בסגל' : 'Available'}</span>
                <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, color: '#14231A' }}>{players.filter(isAvailable).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                <span style={{ color: '#5C6B61', whiteSpace: 'nowrap', flex: 'none' }}>{isHe ? 'על הספסל' : 'On bench'}</span>
                <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, whiteSpace: 'nowrap', color: '#14231A' }}>{bench.length}/{benchMax}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                <span style={{ color: '#5C6B61', whiteSpace: 'nowrap', flex: 'none' }}>{isHe ? 'עמדות חסרות' : 'Missing slots'}</span>
                <span style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', color: isFull ? '#16A34A' : '#DC2626' }}>
                  {isFull ? (isHe ? 'אין ✓' : 'None ✓') : `${missingCount} ${isHe ? 'עמדות' : 'slots'}`}
                </span>
              </div>
            </div>
          </div>

          {/* Available players */}
          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 14, color: '#14231A' }}>
                {showAllPlayers ? (isHe ? 'כל שחקני הסגל' : 'All Squad Players') : (isHe ? 'שחקנים זמינים' : 'Available Players')}
              </span>
              <button
                onClick={() => setShowAllPlayers(!showAllPlayers)}
                style={{
                  fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', borderRadius: 8, padding: '4px 9px', cursor: 'pointer', transition: 'all .2s ease',
                  background: showAllPlayers ? 'rgba(42,112,80,0.12)' : '#FFFFFF',
                  color: showAllPlayers ? '#16A34A' : '#94A39A',
                  border: `1px solid ${showAllPlayers ? 'rgba(42,112,80,0.3)' : 'rgba(13,26,18,0.12)'}`,
                }}
              >
                {showAllPlayers ? (isHe ? 'הצג זמינים בלבד' : 'Available only') : (isHe ? 'הצג את כל הסגל' : 'Show all squad')}
              </button>
            </div>

            {pickMode && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#FDF3E3', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 10, padding: '7px 12px', marginBottom: 10 }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#D97706', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isHe ? `בחר שחקן לעמדת ${positions[selectedSlot]?.pos}` : `Pick a player for ${positions[selectedSlot]?.pos}`}
                </span>
                <button
                  onClick={() => setSelectedSlot(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#D97706', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                >
                  <X className="w-3 h-3" />
                  {isHe ? 'ביטול' : 'Cancel'}
                </button>
              </motion.div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto', paddingLeft: 2 }}>
              {availablePlayers.length > 0 ? availablePlayers.map(player => {
                const inBench = bench.some(b => b.player.id === player.id);
                const ok = isAvailable(player);
                const pct = skillPct(player);
                return (
                  <div
                    key={player.id}
                    style={ROW}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(22,163,74,0.35)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(13,26,18,0.07)'; }}
                  >
                    <div style={NUM_CIRCLE(38)}>
                      {player.photo_url ? (
                        <img src={player.photo_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 13, color: '#4ADE80' }}>{player.number || '?'}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#14231A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                      <div style={{ fontSize: 12, color: '#5C6B61' }}>
                        {player.position}{pct !== null ? ` · ${isHe ? 'כושר' : 'Rating'} ${pct}%` : ''}
                      </div>
                    </div>
                    {!ok && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FCEBEB', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 9999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                        {player.availability}
                      </span>
                    )}
                    {inBench && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EAF1FD', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 9999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                        {isHe ? 'ספסל' : 'Bench'}
                      </span>
                    )}
                    {pickMode && !inBench && ok && (
                      <button
                        onClick={() => handlePlayerSelect(player)}
                        className="premium-btn-green"
                        style={{ border: 'none', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {isHe ? 'להרכב' : 'Add'}
                      </button>
                    )}
                    {!pickMode && !inBench && ok && bench.length < benchMax && (
                      <button
                        onClick={() => handleAddToBench(player)}
                        style={{ border: '1px solid rgba(13,26,18,0.14)', background: '#FFFFFF', color: '#5C6B61', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F6F4EE'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                      >
                        {isHe ? 'לספסל' : 'Bench'}
                      </button>
                    )}
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', fontSize: 13, color: '#94A39A', padding: '16px 0' }}>
                  {isHe ? 'כל השחקנים הזמינים כבר בהרכב או בספסל' : 'All available players are already in the lineup or bench'}
                </div>
              )}
            </div>
          </div>

          {/* Bench */}
          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 14, color: '#14231A', marginBottom: 10 }}>
              {isHe ? `ספסל מחליפים (${bench.length}/${benchMax})` : `Substitutes Bench (${bench.length}/${benchMax})`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bench.map((b, i) => {
                const pct = skillPct(b.player);
                return (
                  <div key={b.player.id} style={ROW}>
                    <div style={NUM_CIRCLE(32)}>
                      {b.player.photo_url ? (
                        <img src={b.player.photo_url} alt={b.player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 12, color: '#4ADE80' }}>{b.player.number || '?'}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#14231A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.player.name}
                        <span style={{ fontWeight: 600, color: '#94A39A', fontSize: 11.5 }}>
                          {' · '}{b.player.position}{pct !== null ? ` · ${pct}%` : ''}
                        </span>
                      </div>
                      <Select
                        value={b.subType}
                        onValueChange={(value) => {
                          const newBench = [...bench];
                          newBench[i] = { ...newBench[i], subType: value };
                          setBench(newBench);
                        }}
                      >
                        <SelectTrigger style={{ maxWidth: 150, height: 26, background: '#FFFFFF', border: '1px solid rgba(13,26,18,0.12)', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: '#5C6B61' }}>
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
                    <button
                      onClick={() => handleRemoveFromBench(b.player.id)}
                      style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, display: 'flex' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FCEBEB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {bench.length === 0 && (
                <div style={{ textAlign: 'center', fontSize: 13, color: '#94A39A', padding: '12px 0' }}>
                  {isHe ? 'לחץ "לספסל" ליד שחקן זמין' : 'Click "Bench" next to an available player'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
