import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  X,
  Users,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ComparisonRadarChart from './ComparisonRadarChart';
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
  const [contextFilter, setContextFilter] = useState('all'); // 'all', 'before_match', 'after_match', 'last_month'
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  const [_matchData, setMatchData] = useState([]);

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
    const analyses = await base44.entities.MatchAnalysis.filter({ team_id: teamId }, '-date', 5);
    setMatchData(analyses);
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
      {/* Selection Interface */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-emerald-400" />
            {isHe ? 'בחר שחקנים להשוואה (2-4)' : 'Select Players to Compare (2-4)'}
            </CardTitle>
            {selectedPlayerIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPlayerIds([])}
              className="text-slate-400 hover:text-white"
            >
              {isHe ? 'נקה הכל' : 'Clear all'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder={isHe ? 'חפש שחקן...' : 'Search player...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder={isHe ? 'כל העמדות' : 'All Positions'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">{isHe ? 'כל העמדות' : 'All Positions'}</SelectItem>
                {positions.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={contextFilter} onValueChange={setContextFilter}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">{isHe ? 'כל התקופה' : 'All Time'}</SelectItem>
                <SelectItem value="before_match">{isHe ? 'לפני משחק' : 'Before Match'}</SelectItem>
                <SelectItem value="after_match">{isHe ? 'אחרי משחק' : 'After Match'}</SelectItem>
                <SelectItem value="last_month">{isHe ? 'חודש אחרון' : 'Last Month'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Same Position Toggle */}
          {selectedPlayers.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input
                type="checkbox"
                checked={samePositionOnly}
                onChange={(e) => setSamePositionOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700"
              />
              <span>{isHe ? `השווה רק שחקנים מאותה עמדה (${selectedPlayers[0].position})` : `Compare same position only (${selectedPlayers[0].position})`}</span>
            </label>
          )}

          {/* Selected Players */}
          {selectedPlayers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map(player => (
                <Badge
                  key={player.id}
                  className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-2 px-3 py-1.5"
                >
                  <span>{player.name}</span>
                  <button
                    onClick={() => togglePlayer(player.id)}
                    className="hover:text-emerald-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Available Players */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredPlayers.slice(0, 12).map(player => (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                disabled={selectedPlayerIds.length >= 4 && !selectedPlayerIds.includes(player.id)}
                className={`
                  p-3 rounded-lg border text-right transition-all
                  ${selectedPlayerIds.length >= 4 && !selectedPlayerIds.includes(player.id)
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800 border-slate-700 text-white hover:border-emerald-500/50 hover:bg-slate-700'
                  }
                `}
              >
                <div className="font-medium text-sm">{player.name}</div>
                <div className="text-xs text-slate-400 mt-1">{player.position}</div>
              </button>
            ))}
          </div>

          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              {isHe ? 'לא נמצאו שחקנים זמינים' : 'No players found'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison View */}
      {canCompare && (
        <>
          {/* Summary Cards */}
          <ComparisonSummaryCards players={selectedPlayers} />

          {/* Radar Chart */}
          <ComparisonRadarChart players={selectedPlayers} />

          {/* Comparison Table */}
          <ComparisonTable players={selectedPlayers} />

          {/* Insights & Recommendations */}
          <ComparisonInsights 
            players={selectedPlayers}
            teamStyle={teamData}
            onAddToLineup={onAddToLineup}
          />

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