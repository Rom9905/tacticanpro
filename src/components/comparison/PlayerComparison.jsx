import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  X,
  Download
} from 'lucide-react';


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ComparisonRadarChart from './ComparisonRadarChart';
import ComparisonDuel from './ComparisonDuel';
import { useLang } from '@/lib/LanguageContext';
import ComparisonTable from './ComparisonTable';
import ComparisonInsights from './ComparisonInsights';
import ComparisonSummaryCards from './ComparisonSummaryCards';
import { isGoalkeeper, goalkeeperSkills, fieldPlayerSkills } from './AutoSuggestRatings';
import { jsPDF } from 'jspdf';

export default function PlayerComparison({ 
  teamId, 
  preselectedPlayerIds = [],
  preselectedPlayerId = null,
  onClose: _onClose,
  onAddToLineup 
}) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [allPlayers, setAllPlayers] = useState([]);
  const initialIds = preselectedPlayerId 
    ? [preselectedPlayerId, ...preselectedPlayerIds.filter(id => id !== preselectedPlayerId)]
    : preselectedPlayerIds;
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(initialIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [samePositionOnly, setSamePositionOnly] = useState(false);
  const [contextFilter] = useState('all'); // 'all', 'before_match', 'after_match', 'last_month'
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  const [_matchData, setMatchData] = useState([]);
  const [ratingsByPlayer, setRatingsByPlayer] = useState({});

  useEffect(() => {
    if (teamId) {
      loadPlayers();
      loadMatchData();
      loadTeamData();
    }
  }, [teamId]);

  const [teamData, setTeamData] = useState(null);

  const loadPlayers = async () => {
    const players = await base44.entities.Player.filter({ team_id: teamId });
    setAllPlayers(players);
  };

  const loadMatchData = async () => {
    const analyses = await base44.entities.MatchAnalysis.filter({ team_id: teamId }, '-date', 50);
    setMatchData(analyses.slice(0, 5));

    // Average match rating per player (same logic as squad/profile)
    const acc = {};
    analyses.forEach(a => {
      (a.player_ratings || []).forEach(r => {
        if (r.did_not_play || !r.rating || !r.player_id) return;
        (acc[r.player_id] || (acc[r.player_id] = [])).push(r.rating);
      });
    });
    const map = {};
    Object.entries(acc).forEach(([pid, arr]) => { map[pid] = arr.reduce((s, v) => s + v, 0) / arr.length; });
    setRatingsByPlayer(map);
  };

  const loadTeamData = async () => {
    const teams = await base44.entities.Team.filter({ id: teamId });
    if (teams.length > 0) setTeamData(teams[0]);
  };

  const selectedPlayers = allPlayers.filter(p => selectedPlayerIds.includes(p.id));

  // Apply filters
  const filteredPlayers = allPlayers.filter(p => {
    if (selectedPlayerIds.includes(p.id)) return false;
    
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesPosition = true;
    if (positionFilter !== 'all') {
      matchesPosition = p.position === positionFilter;
    }
    
    // If same position only is enabled and we have selected players
    if (samePositionOnly && selectedPlayers.length > 0) {
      const referencePosition = selectedPlayers[0].position;
      matchesPosition = p.position === referencePosition;
    }
    
    return matchesSearch && matchesPosition;
  });

  const togglePlayer = (playerId) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(prev => prev.filter(id => id !== playerId));
    } else if (selectedPlayerIds.length < 4) {
      setSelectedPlayerIds(prev => [...prev, playerId]);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) return;

    const report = {
      team_id: teamId,
      name: reportName,
      player_ids: selectedPlayerIds,
      context: contextFilter,
      created_date: new Date().toISOString(),
      comparison_data: {
        players: selectedPlayers.map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          strengths: p.strengths,
          improvements: p.improvements,
          season_goals: p.season_goals,
          season_assists: p.season_assists,
        }))
      }
    };

    // Save as a tactical board note or similar entity
    await base44.entities.TacticalBoard.create(report);
    setShowSaveDialog(false);
    setReportName('');
  };

  const positions = [...new Set(allPlayers.map(p => p.position).filter(Boolean))];

  const canCompare = selectedPlayerIds.length >= 2;

  const handleDownloadPDF = () => {
    const hasGK = selectedPlayers.some(p => isGoalkeeper(p));
    const skillAttrs = hasGK ? goalkeeperSkills : fieldPlayerSkills;
    const today = new Date().toLocaleDateString('he-IL');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    // helpers
    const checkPage = (needed = 8) => {
      if (y + needed > 280) { doc.addPage(); y = margin; }
    };

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Player Comparison Report', pageW / 2, 14, { align: 'center' });
    y = 28;

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const meta = `Team: ${teamData?.name || '-'}   |   Date: ${today}   |   Players: ${selectedPlayers.map(p => p.name).join(', ')}`;
    doc.text(meta, pageW / 2, y, { align: 'center', maxWidth: contentW });
    y += 10;

    // Table helper
    const drawTable = (title, headers, rows) => {
      checkPage(14);
      doc.setFontSize(11);
      doc.setTextColor(125, 211, 252);
      doc.text(title, margin, y);
      y += 2;
      doc.setDrawColor(51, 65, 85);
      doc.line(margin, y, margin + contentW, y);
      y += 4;

      const colCount = headers.length;
      const labelW = 52;
      const valW = (contentW - labelW) / (colCount - 1);

      // Header row
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y - 4, contentW, 8, 'F');
      headers.forEach((h, i) => {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const x = i === 0 ? margin + 2 : margin + labelW + (i - 1) * valW + valW / 2;
        doc.text(h, x, y, { align: i === 0 ? 'left' : 'center' });
      });
      y += 6;

      rows.forEach((row, ri) => {
        checkPage(8);
        if (ri % 2 === 0) {
          doc.setFillColor(26, 37, 53);
          doc.rect(margin, y - 4, contentW, 7, 'F');
        }
        row.forEach((cell, i) => {
          doc.setFontSize(8.5);
          const x = i === 0 ? margin + 2 : margin + labelW + (i - 1) * valW + valW / 2;
          if (i === 0) {
            doc.setTextColor(148, 163, 184);
            doc.text(String(cell), x, y, { align: 'left' });
          } else if (typeof cell === 'number' && cell > 0) {
            // dots for skill ratings
            const dotSize = 2.5;
            const dotSpacing = 3.5;
            const maxVal = Math.max(...row.slice(1).map(v => typeof v === 'number' ? v : 0));
            const startX = x - (5 * dotSpacing) / 2 + dotSize / 2;
            for (let d = 1; d <= 5; d++) {
              const filled = d <= cell;
              const isBest = filled && cell === maxVal && maxVal > 0;
              if (filled) {
                doc.setFillColor(isBest ? 16 : 59, isBest ? 185 : 130, isBest ? 129 : 246);
              } else {
                doc.setFillColor(51, 65, 85);
              }
              doc.circle(startX + (d - 1) * dotSpacing, y - 1, dotSize / 2, 'F');
            }
          } else if (Array.isArray(cell)) {
            // badges (strengths/improvements)
            doc.setTextColor(226, 232, 240);
            doc.text(cell.join(', '), x, y, { align: 'center', maxWidth: valW - 2 });
          } else {
            doc.setTextColor(226, 232, 240);
            doc.text(String(cell ?? '-'), x, y, { align: 'center' });
          }
        });
        y += 7;
      });
      y += 4;
    };

    // General attributes
    const generalAttrs = [
      { label: 'Position', key: 'position' },
      { label: 'Dominant Foot', key: 'dominant_foot' },
      { label: 'Games Played', key: 'games_played' },
      { label: 'Goals', key: 'season_goals' },
      { label: 'Assists', key: 'season_assists' },
      { label: 'Minutes Played', key: 'minutes_played' },
      { label: 'Availability', key: 'availability' },
      { label: 'Squad Status', key: 'squad_status' },
    ];

    const generalHeaders = ['Attribute', ...selectedPlayers.map(p => p.name)];
    const generalRows = generalAttrs.map(attr => [
      attr.label,
      ...selectedPlayers.map(p => p[attr.key] ?? '-')
    ]);
    drawTable('General Stats', generalHeaders, generalRows);

    // Strengths
    const strengthHeaders = ['', ...selectedPlayers.map(p => p.name)];
    const strengthRows = [['Strengths', ...selectedPlayers.map(p => (p.strengths || []).slice(0, 5))]];
    drawTable('Key Strengths', strengthHeaders, strengthRows);

    // Improvements
    const improvRows = [['Areas to Improve', ...selectedPlayers.map(p => (p.improvements || []).slice(0, 5))]];
    drawTable('Areas to Improve', strengthHeaders, improvRows);

    // Skill ratings
    const skillHeaders = ['Skill', ...selectedPlayers.map(p => p.name)];
    const skillRows = skillAttrs.map(skill => [
      skill.label,
      ...selectedPlayers.map(p => p.skill_ratings?.[skill.key] || 0)
    ]);
    drawTable('Skill Ratings', skillHeaders, skillRows);

    doc.save(`player-comparison-${selectedPlayers.map(p => p.name).join('-')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Selection Interface — chip picker (Premium Match-Day) */}
      <div className="premium-card" style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 14.5, color: '#14231A' }}>
            {isHe ? 'בחר שחקנים להשוואה (2–4)' : 'Select Players to Compare (2–4)'}
          </div>
          {selectedPlayerIds.length > 0 && (
            <button onClick={() => setSelectedPlayerIds([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: '#94A39A', fontFamily: 'Assistant,sans-serif' }}>
              {isHe ? 'נקה הכל' : 'Clear all'}
            </button>
          )}
        </div>

        {/* Search + position filter */}
        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A39A' }} />
            <input
              placeholder={isHe ? 'חפש שחקן...' : 'Search player...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none"
              style={{ boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid rgba(13,26,18,0.10)', borderRadius: 12, padding: '9px 36px 9px 12px', fontSize: 13.5, color: '#14231A' }}
            />
          </div>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            style={{ background: '#FFFFFF', border: '1px solid rgba(13,26,18,0.10)', borderRadius: 12, padding: '9px 12px', fontSize: 13.5, color: '#14231A', cursor: 'pointer' }}
          >
            <option value="all">{isHe ? 'כל העמדות' : 'All Positions'}</option>
            {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
          </select>
        </div>

        {/* Same position toggle */}
        {selectedPlayers.length > 0 && (
          <label className="flex items-center gap-2 cursor-pointer mb-3" style={{ fontSize: 12.5, color: '#5C6B61' }}>
            <input type="checkbox" checked={samePositionOnly} onChange={(e) => setSamePositionOnly(e.target.checked)} className="w-4 h-4" />
            <span>{isHe ? `השווה רק שחקנים מאותה עמדה (${selectedPlayers[0].position})` : `Compare same position only (${selectedPlayers[0].position})`}</span>
          </label>
        )}

        {/* Chips — selected first, then available */}
        <div className="flex flex-wrap gap-2">
          {[...selectedPlayers, ...filteredPlayers].map(player => {
            const sel = selectedPlayerIds.includes(player.id);
            const disabled = !sel && selectedPlayerIds.length >= 4;
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                disabled={disabled}
                style={{
                  borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'Assistant,sans-serif',
                  background: sel ? '#0D1A12' : '#FFFFFF',
                  color: sel ? '#4ADE80' : disabled ? '#C0C7C2' : '#14231A',
                  border: `1px solid ${sel ? '#0D1A12' : 'rgba(13,26,18,0.14)'}`,
                  opacity: disabled ? 0.55 : 1, transition: 'all .15s',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {player.name} · {player.position}
                {sel && <X className="w-3 h-3" />}
              </button>
            );
          })}
          {filteredPlayers.length === 0 && selectedPlayers.length === 0 && (
            <div className="w-full text-center py-6" style={{ color: '#94A39A', fontSize: 13 }}>
              {isHe ? 'לא נמצאו שחקנים זמינים' : 'No players found'}
            </div>
          )}
        </div>
      </div>

      {/* Comparison View */}
      {canCompare && (
        <>
          {selectedPlayers.length === 2 ? (
            /* ── Duel mode: hero + radar + insights (no duplicated cards/table) ── */
            <>
              <ComparisonDuel
                playerA={selectedPlayers[0]}
                playerB={selectedPlayers[1]}
                ratingA={ratingsByPlayer[selectedPlayers[0].id]}
                ratingB={ratingsByPlayer[selectedPlayers[1].id]}
                isHe={isHe}
              />
              <ComparisonRadarChart players={selectedPlayers} />
              <ComparisonInsights
                players={selectedPlayers}
                teamStyle={teamData}
                onAddToLineup={onAddToLineup}
              />
            </>
          ) : (
            /* ── 3–4 players: summary columns + radar + table ── */
            <>
              <ComparisonSummaryCards players={selectedPlayers} />
              <ComparisonRadarChart players={selectedPlayers} />
              <ComparisonTable players={selectedPlayers} />
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleDownloadPDF}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              <Download className="w-4 h-4 ml-2" />
              {isHe ? 'הורד דוח השוואה (PDF)' : 'Download Comparison Report (PDF)'}
            </Button>
          </div>
        </>
      )}

      {/* Save Report Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>{isHe ? 'שמור דוח השוואה' : 'Save Comparison Report'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder={isHe ? 'שם הדוח' : 'Report name'}
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="text-sm text-slate-400">
              {isHe ? 'השוואה בין: ' : 'Comparing: '}{selectedPlayers.map(p => p.name).join(', ')}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                {isHe ? 'ביטול' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSaveReport}
                disabled={!reportName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isHe ? 'שמור' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}