import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Target, Filter, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ControlZones({ 
  homePlayers, 
  awayPlayers, 
  onToggle, 
  isActive,
  onFilterChange,
  customZones = [],
  onAddCustomZone,
  onUpdateCustomZone,
  onRemoveCustomZone,
  isFullscreen,
  containerRef 
}) {
  const [mode, setMode] = useState('static'); // 'static' or 'dynamic'
  const [filter, setFilter] = useState('all'); // 'all', 'center', 'final_third', 'left', 'right', 'custom'
  const [hoveredZone, setHoveredZone] = useState(null);
  const [isDrawingZone, setIsDrawingZone] = useState(false);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    if (onFilterChange) {
      onFilterChange(newFilter);
    }
  };

  const handleCreateZone = () => {
    // Create a default zone in the center
    const newZone = {
      id: `custom-${Date.now()}`,
      x: 75,
      y: 30,
      width: 50,
      height: 30,
      label: 'אזור מותאם',
    };
    console.log('Creating custom zone:', newZone);
    if (onAddCustomZone) {
      onAddCustomZone(newZone);
    }
    handleFilterChange('custom');
  };

  // Grid configuration - 200x90 viewport divided into cells
  const GRID_COLS = 30;
  const GRID_ROWS = 15;
  const CELL_WIDTH = 200 / GRID_COLS;
  const CELL_HEIGHT = 90 / GRID_ROWS;

  // Calculate control zones
  const controlData = useMemo(() => {
    if (!isActive) return null;

    const zones = [];
    let homeControl = 0;
    let awayControl = 0;
    let neutralZones = 0;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const centerX = (col + 0.5) * CELL_WIDTH;
        const centerY = (row + 0.5) * CELL_HEIGHT;

        // Apply filter
        if (filter === 'center' && (centerX < 50 || centerX > 150)) continue;
        if (filter === 'final_third' && centerX < 133) continue;
        if (filter === 'left' && centerY > 45) continue;
        if (filter === 'right' && centerY < 45) continue;

        // Find closest home and away players
        let minHomeDistance = Infinity;
        let closestHomePlayer = null;
        homePlayers.forEach(player => {
          const dist = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
          if (dist < minHomeDistance) {
            minHomeDistance = dist;
            closestHomePlayer = player;
          }
        });

        let minAwayDistance = Infinity;
        let closestAwayPlayer = null;
        awayPlayers.forEach(player => {
          const dist = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
          if (dist < minAwayDistance) {
            minAwayDistance = dist;
            closestAwayPlayer = player;
          }
        });

        // Determine control
        const distanceDiff = minAwayDistance - minHomeDistance;
        let color = null;
        let opacity = 0;
        let controller = null;

        // Significant advantage threshold
        const ADVANTAGE_THRESHOLD = 3;

        if (distanceDiff > ADVANTAGE_THRESHOLD) {
          // Home team controls
          color = '#10b981'; // Green
          opacity = Math.min(0.4, (distanceDiff / 15) * 0.4);
          controller = 'home';
          homeControl++;
        } else if (distanceDiff < -ADVANTAGE_THRESHOLD) {
          // Away team controls
          color = '#ef4444'; // Red
          opacity = Math.min(0.4, (Math.abs(distanceDiff) / 15) * 0.4);
          controller = 'away';
          awayControl++;
        } else {
          // Neutral zone
          color = '#94a3b8'; // Neutral gray
          opacity = 0.05;
          controller = 'neutral';
          neutralZones++;
        }

        zones.push({
          x: col * CELL_WIDTH,
          y: row * CELL_HEIGHT,
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
          centerX,
          centerY,
          color,
          opacity,
          controller,
          homeDistance: minHomeDistance,
          awayDistance: minAwayDistance,
          advantage: Math.abs(distanceDiff),
          dominantPlayer: distanceDiff > 0 ? closestHomePlayer : closestAwayPlayer,
        });
      }
    }

    const totalZones = homeControl + awayControl + neutralZones;
    const homePercentage = Math.round((homeControl / totalZones) * 100);
    const awayPercentage = Math.round((awayControl / totalZones) * 100);

    return {
      zones,
      homeControl,
      awayControl,
      neutralZones,
      homePercentage,
      awayPercentage,
    };
  }, [homePlayers, awayPlayers, isActive, filter]);

  // Generate insight
  const insight = useMemo(() => {
    if (!controlData) return null;

    const { homePercentage, awayPercentage } = controlData;
    
    if (homePercentage >= 60) {
      return { text: `הקבוצה שלך שולטת ב-${homePercentage}% מהמרחב`, type: 'good' };
    } else if (awayPercentage >= 60) {
      return { text: `היריב שולט ב-${awayPercentage}% מהמרחב - נדרש שינוי`, type: 'critical' };
    } else {
      return { text: `שליטה מאוזנת: ${homePercentage}% לעומת ${awayPercentage}%`, type: 'neutral' };
    }
  }, [controlData]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={`w-full justify-start text-xs ${isActive ? 'bg-purple-500/20 text-purple-400' : 'text-slate-300 hover:text-white'}`}
        >
          <Target className="w-3 h-3 ml-2" />
          <span className="text-slate-200">אזורי שליטה</span>
          {isActive && <span className="mr-auto text-[10px] bg-purple-500/30 px-1.5 py-0.5 rounded text-purple-300">פעיל</span>}
        </Button>
      </div>

      {isActive && (
        <div className="space-y-2 bg-slate-800/50 rounded-lg p-2">
          <div className="flex gap-2">
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-7 text-xs bg-slate-900 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">סטטי</SelectItem>
                <SelectItem value="dynamic">דינמי</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="h-7 text-xs bg-slate-900 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המגרש</SelectItem>
                <SelectItem value="center">מרכז</SelectItem>
                <SelectItem value="final_third">שליש אחרון</SelectItem>
                <SelectItem value="left">צד ימין</SelectItem>
                <SelectItem value="right">צד שמאל</SelectItem>
                <SelectItem value="custom">אזור מותאם</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateZone}
            className="w-full h-7 text-xs bg-slate-900 border-slate-700 hover:bg-slate-800"
          >
            <Target className="w-3 h-3 ml-1" />
            צור אזור חדש
          </Button>

          {insight && (
            <div className={`text-[10px] p-2 rounded border ${
              insight.type === 'good' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              insight.type === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              'bg-slate-500/10 border-slate-500/30 text-white'
            }`}>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {insight.text}
              </div>
            </div>
          )}

          {controlData && (
            <div className="text-[10px] text-white space-y-1">
              <div className="flex justify-between">
                <span>שליטה שלך:</span>
                <span className="text-emerald-400 font-medium">{controlData.homePercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span>שליטת יריב:</span>
                <span className="text-red-400 font-medium">{controlData.awayPercentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded overflow-hidden flex">
                <div 
                  className="bg-emerald-500" 
                  style={{ width: `${controlData.homePercentage}%` }}
                />
                <div 
                  className="bg-red-500" 
                  style={{ width: `${controlData.awayPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* This will be rendered on SVG */}
      {isActive && controlData && (
        <svg style={{ display: 'none' }}>
          <g id="control-zones-layer">
            {controlData.zones.map((zone, i) => (
              <rect
                key={i}
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                fill={zone.color}
                opacity={zone.opacity}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ pointerEvents: 'all' }}
              />
            ))}
            
            {/* Tooltip */}
            {hoveredZone && (
              <g>
                <rect
                  x={hoveredZone.centerX - 25}
                  y={hoveredZone.centerY - 12}
                  width="50"
                  height="24"
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth="0.5"
                  rx="2"
                  opacity="0.95"
                />
                <text
                  x={hoveredZone.centerX}
                  y={hoveredZone.centerY - 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2.5"
                  fontWeight="bold"
                >
                  {hoveredZone.controller === 'home' ? 'שליטה שלך' : 
                   hoveredZone.controller === 'away' ? 'שליטת יריב' : 'ניטרלי'}
                </text>
                <text
                  x={hoveredZone.centerX}
                  y={hoveredZone.centerY + 3}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="2"
                >
                  יתרון: {hoveredZone.advantage.toFixed(1)}m
                </text>
                {hoveredZone.dominantPlayer && (
                  <text
                    x={hoveredZone.centerX}
                    y={hoveredZone.centerY + 8}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="1.8"
                  >
                    שחקן #{hoveredZone.dominantPlayer.number}
                  </text>
                )}
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

// Export zones data for rendering on main SVG
export function useControlZonesData(homePlayers, awayPlayers, isActive, filter = 'all', customZone = null) {
  return useMemo(() => {
    if (!isActive) return null;

    const GRID_COLS = 30;
    const GRID_ROWS = 15;
    const CELL_WIDTH = 200 / GRID_COLS;
    const CELL_HEIGHT = 90 / GRID_ROWS;

    const zones = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const centerX = (col + 0.5) * CELL_WIDTH;
        const centerY = (row + 0.5) * CELL_HEIGHT;

        if (filter === 'center' && (centerX < 50 || centerX > 150)) continue;
        if (filter === 'final_third' && centerX < 133) continue;
        if (filter === 'left' && centerY > 45) continue;
        if (filter === 'right' && centerY < 45) continue;
        
        // Custom zone filter
        if (customZone) {
          if (centerX < customZone.x || centerX > customZone.x + customZone.width ||
              centerY < customZone.y || centerY > customZone.y + customZone.height) {
            continue;
          }
        }

        let minHomeDistance = Infinity;
        let closestHomePlayer = null;
        homePlayers.forEach(player => {
          const dist = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
          if (dist < minHomeDistance) {
            minHomeDistance = dist;
            closestHomePlayer = player;
          }
        });

        let minAwayDistance = Infinity;
        let closestAwayPlayer = null;
        awayPlayers.forEach(player => {
          const dist = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
          if (dist < minAwayDistance) {
            minAwayDistance = dist;
            closestAwayPlayer = player;
          }
        });

        const distanceDiff = minAwayDistance - minHomeDistance;
        const ADVANTAGE_THRESHOLD = 3;

        let color = null;
        let opacity = 0;

        if (distanceDiff > ADVANTAGE_THRESHOLD) {
          color = '#10b981';
          opacity = Math.min(0.3, (distanceDiff / 15) * 0.3);
        } else if (distanceDiff < -ADVANTAGE_THRESHOLD) {
          color = '#ef4444';
          opacity = Math.min(0.3, (Math.abs(distanceDiff) / 15) * 0.3);
        } else {
          color = '#94a3b8';
          opacity = 0.05;
        }

        zones.push({
          x: col * CELL_WIDTH,
          y: row * CELL_HEIGHT,
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
          centerX,
          centerY,
          color,
          opacity,
          controller: distanceDiff > ADVANTAGE_THRESHOLD ? 'home' : 
                      distanceDiff < -ADVANTAGE_THRESHOLD ? 'away' : 'neutral',
          advantage: Math.abs(distanceDiff),
          dominantPlayer: distanceDiff > 0 ? closestHomePlayer : closestAwayPlayer,
        });
      }
    }

    return zones;
  }, [homePlayers, awayPlayers, isActive, filter, customZone]);
}