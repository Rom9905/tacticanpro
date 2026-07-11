import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Download,
  Maximize2,
  Minimize2,
  Move,
  Pencil,
  Eraser,
  ChevronLeft,
  ChevronRight,
  Circle as CircleIcon,
  Folder,
  X,
  GripVertical,
  Lock,
  Unlock,
  Image as ImageIcon,
  FileDown,
  ArrowRight,
  Type,
  Diamond,
  Square,
  Triangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import TeamSelector from '../components/team/TeamSelector';
import { useSubscriptionGuard } from '@/components/useSubscriptionGuard';
import LayerManager from '../components/tactical/LayerManager';
import HeatZoneManager from '../components/tactical/HeatZoneManager';
import TemplateSelector from '../components/tactical/TemplateSelector';
import MatchAnalysisLink from '../components/tactical/MatchAnalysisLink';
import PlayerTagging from '../components/tactical/PlayerTagging';
import ControlZones, { useControlZonesData } from '../components/tactical/ControlZones';

export default function TacticalBoard() {
  const hasPlan = useSubscriptionGuard();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [savedBoards, setSavedBoards] = useState([]);
  const [currentBoard, setCurrentBoard] = useState(null);
  
  // Canvas state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tool, setTool] = useState('move'); // move, draw, dashed, erase, arrow, text, diamond, circle, square, triangle, cross

  // Restrict tools to basic if no plan
  const basicTools = ['move', 'draw', 'dashed', 'arrow', 'erase'];

  // Debug: Component mounted
  useEffect(() => {
    console.log("✅ TACTIC BOARD MOUNTED", new Date().toISOString());
  }, []);

  // Debug: Tool changes
  useEffect(() => {
    console.log("🔧 ACTIVE TOOL =", tool);
  }, [tool]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ffffff');
  
  // Players & Ball
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [ball, setBall] = useState({ x: 50, y: 50 });
  const [drawings, setDrawings] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  
  // Animation
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Dragging
  const [draggedItem, setDraggedItem] = useState(null);
  
  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Dialogs
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [boardName, setBoardName] = useState('');
  
  // Export options
  const [exportOptions, setExportOptions] = useState({
    showNames: false,
    showNumbers: true,
    showDrawings: true,
  });
  
  // Menu position for fullscreen
  const [menuPosition, setMenuPosition] = useState({ x: 20, y: 20 });
  const [isDraggingMenu, setIsDraggingMenu] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  
  // Locked items
  const [lockedItems, setLockedItems] = useState(new Set());
  
  // New features state
  const [currentLayers, setCurrentLayers] = useState({
    buildup: true,
    pressing: false,
    restDefense: false,
    setPieces: false,
  });
  const [heatZones, setHeatZones] = useState([]);
  const [activeLayer, setActiveLayer] = useState(null);
  const [playerShowMode, setPlayerShowMode] = useState('all'); // 'all', 'roles', 'responsibilities'
  const [controlZonesActive, setControlZonesActive] = useState(false);
  const [controlZonesFilter, setControlZonesFilter] = useState('all');
  const [customControlZones, setCustomControlZones] = useState([]);
  const [draggedCustomZone, setDraggedCustomZone] = useState(null);

  useEffect(() => {
    loadTeams();
    initializePlayers();
    // Start with first frame
    const initialFrame = {
      homePlayers: [],
      awayPlayers: [],
      ball: { x: 50, y: 50 },
      drawings: [],
    };
    setFrames([initialFrame]);
    setCurrentFrame(0);
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadBoards(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    const user = await base44.auth.me();
    const data = await base44.entities.Team.filter({ created_by: user.email });
    setTeams(data);
    if (data.length > 0) {
      setSelectedTeamId(data[0].id);
    }
  };

  const loadBoards = async (teamId) => {
    const user = await base44.auth.me();
    const data = await base44.entities.TacticalBoard.filter({ team_id: teamId, created_by: user.email });
    setSavedBoards(data);
  };

  const initializePlayers = () => {
    // Default 4-4-2 formation - landscape 200x90
    const homePositions = [
      { x: 20, y: 45 },  // GK
      { x: 45, y: 20 }, { x: 45, y: 38 }, { x: 45, y: 52 }, { x: 45, y: 70 },  // DEF
      { x: 80, y: 20 }, { x: 80, y: 38 }, { x: 80, y: 52 }, { x: 80, y: 70 },  // MID
      { x: 120, y: 32 }, { x: 120, y: 58 },  // FWD
    ];
    
    const awayPositions = [
      { x: 180, y: 45 },  // GK
      { x: 155, y: 70 }, { x: 155, y: 52 }, { x: 155, y: 38 }, { x: 155, y: 20 },  // DEF
      { x: 120, y: 70 }, { x: 120, y: 52 }, { x: 120, y: 38 }, { x: 120, y: 20 },  // MID
      { x: 80, y: 58 }, { x: 80, y: 32 },  // FWD
    ];

    const home = homePositions.map((pos, i) => ({ id: `home-${i}`, ...pos, number: i + 1 }));
    const away = awayPositions.map((pos, i) => ({ id: `away-${i}`, ...pos, number: i + 1 }));
    setHomePlayers(home);
    setAwayPlayers(away);
    
    // Update first frame with initial positions
    if (frames.length > 0) {
      const updatedFrames = [...frames];
      updatedFrames[0] = {
        homePlayers: home,
        awayPlayers: away,
        ball: { x: 100, y: 45 },
        drawings: [],
      };
      setFrames(updatedFrames);
    }
  };

  // Initial ball position scaled
  useEffect(() => {
    setBall({ x: 100, y: 45 });
  }, []);

  const saveState = useCallback(() => {
    const state = {
      homePlayers: [...homePlayers],
      awayPlayers: [...awayPlayers],
      ball: { ...ball },
      drawings: [...drawings],
    };
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, state]);
    setHistoryIndex(newHistory.length);
  }, [homePlayers, awayPlayers, ball, drawings, history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHomePlayers(prevState.homePlayers);
      setAwayPlayers(prevState.awayPlayers);
      setBall(prevState.ball);
      setDrawings(prevState.drawings);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHomePlayers(nextState.homePlayers);
      setAwayPlayers(nextState.awayPlayers);
      setBall(nextState.ball);
      setDrawings(nextState.drawings);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, isFullscreen]);

  const handleReset = () => {
    saveState();
    initializePlayers();
    setBall({ x: 50, y: 50 });
    setDrawings([]);
    setFrames([]);
    setCurrentFrame(0);
  };

  const handleMouseDown = (e) => {
    console.log("👆 POINTER DOWN - tool:", tool);
    if (!canvasRef.current) return;
    
    // Use SVG's built-in coordinate conversion
    const svg = canvasRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = svgP.x;
    const y = svgP.y;
    console.log("📍 Position:", x.toFixed(1), y.toFixed(1));

    // Check if clicking on a custom control zone (only in move mode)
    if (tool === 'move' && controlZonesActive && controlZonesFilter === 'custom' && customControlZones.length > 0) {
      for (const zone of customControlZones) {
        if (x >= zone.x && x <= zone.x + zone.width &&
            y >= zone.y && y <= zone.y + zone.height) {
          saveState();
          setDraggedCustomZone({ ...zone, offsetX: x - zone.x, offsetY: y - zone.y });
          return;
        }
      }
    }

    if (tool === 'draw' || tool === 'dashed' || tool === 'arrow') {
      saveState();
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
      return;
    }
    
    if (tool === 'diamond' || tool === 'circle' || tool === 'square' || tool === 'triangle' || tool === 'cross') {
      saveState();
      const shape = {
        type: tool,
        x,
        y,
        color: drawingColor,
      };
      setDrawings(prev => [...prev, shape]);
      return;
    }
    
    if (tool === 'text') {
      saveState();
      const text = prompt('הכנס טקסט:');
      if (text) {
        const textObj = {
          type: 'text',
          x,
          y,
          text,
          color: drawingColor,
        };
        setDrawings(prev => [...prev, textObj]);
      }
      return;
    }

    if (tool === 'erase') {
      saveState();
      // Find and remove drawing under cursor
      const threshold = 3;
      setDrawings(prev => prev.filter(drawing => {
        return !drawing.points.some(point => 
          Math.abs(point.x - x) < threshold && Math.abs(point.y - y) < threshold
        );
      }));
      return;
    }

    // Check if clicking on a player or ball - adjusted for 200x90 viewport
    const clickRadius = 5;
    
    // Check ball (if not locked)
    if (Math.abs(ball.x - x) < clickRadius && Math.abs(ball.y - y) < clickRadius) {
      if (!lockedItems.has('ball')) {
        saveState();
        setDraggedItem({ type: 'ball' });
      }
      return;
    }

    // Check home players
    for (const player of homePlayers) {
      if (Math.abs(player.x - x) < clickRadius && Math.abs(player.y - y) < clickRadius) {
        if (!lockedItems.has(player.id)) {
          saveState();
          setDraggedItem({ type: 'home', id: player.id });
        }
        return;
      }
    }

    // Check away players
    for (const player of awayPlayers) {
      if (Math.abs(player.x - x) < clickRadius && Math.abs(player.y - y) < clickRadius) {
        if (!lockedItems.has(player.id)) {
          saveState();
          setDraggedItem({ type: 'away', id: player.id });
        }
        return;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    if (!isDrawing && !draggedItem && !draggedCustomZone) return;
    
    // Use SVG's built-in coordinate conversion
    const svg = canvasRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.max(0, Math.min(200, svgP.x));
    const y = Math.max(0, Math.min(90, svgP.y));

    if (draggedCustomZone) {
      const newX = Math.max(0, Math.min(200 - draggedCustomZone.width, x - draggedCustomZone.offsetX));
      const newY = Math.max(0, Math.min(90 - draggedCustomZone.height, y - draggedCustomZone.offsetY));
      setCustomControlZones(prev => prev.map(z => 
        z.id === draggedCustomZone.id ? { ...z, x: newX, y: newY } : z
      ));
      setDraggedCustomZone({ ...draggedCustomZone, x: newX, y: newY });
      return;
    }

    if (isDrawing) {
      console.log("✏️ DRAWING at", x.toFixed(1), y.toFixed(1));
      setCurrentPath(prev => {
        // Only add point if it's different enough from the last one
        if (prev.length === 0) return [{ x, y }];
        const last = prev[prev.length - 1];
        const dist = Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
        if (dist > 0.5) {
          return [...prev, { x, y }];
        }
        return prev;
      });
      return;
    }

    if (draggedItem) {
      if (draggedItem.type === 'ball') {
        setBall({ x, y });
      } else if (draggedItem.type === 'home') {
        setHomePlayers(prev => prev.map(p => 
          p.id === draggedItem.id ? { ...p, x, y } : p
        ));
      } else if (draggedItem.type === 'away') {
        setAwayPlayers(prev => prev.map(p => 
          p.id === draggedItem.id ? { ...p, x, y } : p
        ));
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPath.length > 1) {
      console.log("✅ Drawing complete, points:", currentPath.length);
      setDrawings(prev => [...prev, { 
        points: currentPath, 
        color: drawingColor,
        dashed: tool === 'dashed',
        arrow: tool === 'arrow'
      }]);
      setCurrentPath([]);
    }
    setIsDrawing(false);
    setDraggedItem(null);
    setDraggedCustomZone(null);
  };

  // Frames & Animation
  const addFrame = () => {
    saveState();
    // New frame copies the current frame
    const frameData = {
      homePlayers: homePlayers.map(p => ({ ...p })),
      awayPlayers: awayPlayers.map(p => ({ ...p })),
      ball: { ...ball },
      drawings: [...drawings],
    };
    const newFrames = [...frames, frameData];
    setFrames(newFrames);
    setCurrentFrame(newFrames.length - 1);
  };

  // Update current frame when changes are made
  useEffect(() => {
    if (frames.length > 0 && currentFrame >= 0) {
      const updatedFrames = [...frames];
      updatedFrames[currentFrame] = {
        homePlayers: homePlayers.map(p => ({ ...p })),
        awayPlayers: awayPlayers.map(p => ({ ...p })),
        ball: { ...ball },
        drawings: [...drawings],
        layers: { ...currentLayers },
        heatZones: [...heatZones],
      };
      setFrames(updatedFrames);
    }
  }, [homePlayers, awayPlayers, ball, drawings, currentLayers, heatZones]);

  const loadFrame = (index) => {
    if (frames[index]) {
      setHomePlayers(frames[index].homePlayers || []);
      setAwayPlayers(frames[index].awayPlayers || []);
      setBall(frames[index].ball || { x: 100, y: 45 });
      setDrawings(frames[index].drawings || []);
      setCurrentLayers(frames[index].layers || { buildup: true, pressing: false, restDefense: false, setPieces: false });
      setHeatZones(frames[index].heatZones || []);
      setCurrentFrame(index);
    }
  };

  const deleteFrame = (index) => {
    setFrames(prev => prev.filter((_, i) => i !== index));
    if (currentFrame >= frames.length - 1) {
      setCurrentFrame(Math.max(0, frames.length - 2));
    }
  };

  const playAnimation = () => {
    if (frames.length < 2) return;
    setIsPlaying(true);
    let frameIndex = 0;
    
    const interval = setInterval(() => {
      loadFrame(frameIndex);
      frameIndex++;
      if (frameIndex >= frames.length) {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 1000);
  };

  // Save & Load
  const handleSave = async () => {
    if (!boardName.trim() || !selectedTeamId) return;
    
    const boardData = {
      team_id: selectedTeamId,
      name: boardName,
      frames: frames.length > 0 ? frames : [{
        players: [...homePlayers, ...awayPlayers],
        ball,
        drawings,
      }],
    };

    if (currentBoard) {
      await base44.entities.TacticalBoard.update(currentBoard.id, boardData);
    } else {
      await base44.entities.TacticalBoard.create(boardData);
    }

    loadBoards(selectedTeamId);
    setShowSaveDialog(false);
    setBoardName('');
  };

  const handleLoad = (board) => {
    setCurrentBoard(board);
    setBoardName(board.name);
    if (board.frames && board.frames.length > 0) {
      setFrames(board.frames);
      loadFrame(0);
    }
    setShowLoadDialog(false);
  };
  
  const handleLoadTemplate = (template) => {
    if (template.frames && template.frames.length > 0) {
      const frame = template.frames[0];
      
      // Load home players
      const homePlayers = frame.homePlayers || [];
      
      // Load or generate away players - if not in template, create mirror formation
      let awayPlayers = frame.awayPlayers || [];
      if (awayPlayers.length === 0 && homePlayers.length > 0) {
        // Mirror home players to create away formation
        awayPlayers = homePlayers.map((p, i) => ({
          ...p,
          id: `away-${i}`,
          x: 200 - p.x, // Mirror horizontally
          team: 'away'
        }));
      }
      
      setHomePlayers(homePlayers);
      setAwayPlayers(awayPlayers);
      setBall(frame.ball || { x: 100, y: 45 });
      setDrawings(frame.drawings || []);
      setCurrentLayers(frame.layers || { buildup: true, pressing: false, restDefense: false, setPieces: false });
      setHeatZones(frame.heatZones || []);
      setFrames([frame]);
      setCurrentFrame(0);
      setBoardName(template.name);
    }
  };
  
  const handleCreateFromAnalysis = (boardData) => {
    if (boardData.frames && boardData.frames.length > 0) {
      const frame = boardData.frames[0];
      setHomePlayers(frame.homePlayers || []);
      setAwayPlayers(frame.awayPlayers || []);
      setBall(frame.ball || { x: 100, y: 45 });
      setDrawings(frame.drawings || []);
      setCurrentLayers(frame.layers || { buildup: true, pressing: false, restDefense: false, setPieces: false });
      setHeatZones(frame.heatZones || []);
      setFrames([frame]);
      setCurrentFrame(0);
      setBoardName(boardData.name);
      setCurrentBoard({ ...boardData, id: null });
    }
  };
  
  const toggleLayer = (layerId) => {
    setCurrentLayers(prev => {
      const newLayers = { ...prev, [layerId]: !prev[layerId] };
      // Auto-disable other layers if more than 2 are active
      const activeCount = Object.values(newLayers).filter(Boolean).length;
      if (activeCount > 2) {
        // Keep only the newly activated one and the most recent other one
        const activeKeys = Object.keys(newLayers).filter(k => newLayers[k]);
        if (activeKeys.length > 2) {
          // Disable the oldest active layer
          const oldestActive = activeKeys.find(k => k !== layerId);
          if (oldestActive) {
            newLayers[oldestActive] = false;
          }
        }
      }
      return newLayers;
    });
    setActiveLayer(currentLayers[layerId] ? null : layerId);
  };
  
  const addHeatZone = (zone) => {
    setHeatZones(prev => [...prev, zone]);
  };
  
  const removeHeatZone = (zoneId) => {
    setHeatZones(prev => prev.filter(z => z.id !== zoneId));
  };
  
  const updateHeatZone = (zone) => {
    setHeatZones(prev => prev.map(z => z.id === zone.id ? zone : z));
  };
  
  const updatePlayer = (updatedPlayer) => {
    if (updatedPlayer.team === 'home') {
      setHomePlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    } else {
      setAwayPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    }
  };

  // Control zones data
  const controlZones = useControlZonesData(
    homePlayers, 
    awayPlayers, 
    controlZonesActive, 
    controlZonesFilter === 'custom' ? 'all' : controlZonesFilter,
    controlZonesFilter === 'custom' ? customControlZones[0] : null
  );

  const handleExportPNG = async () => {
    const svg = canvasRef.current;
    if (!svg) return;
    
    // Clone and clean SVG
    const svgClone = svg.cloneNode(true);
    
    // Remove UI elements if needed based on export options
    if (!exportOptions.showDrawings) {
      svgClone.querySelectorAll('polyline').forEach(el => el.remove());
    }
    if (!exportOptions.showNumbers) {
      svgClone.querySelectorAll('text').forEach(el => el.remove());
    }
    
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#1a3a2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `tactical-board-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setShowExportDialog(false);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleExportPDF = async () => {
    // For PDF, we'll use the same approach but with jspdf
    const svg = canvasRef.current;
    if (!svg) return;
    
    const svgClone = svg.cloneNode(true);
    if (!exportOptions.showDrawings) {
      svgClone.querySelectorAll('polyline').forEach(el => el.remove());
    }
    if (!exportOptions.showNumbers) {
      svgClone.querySelectorAll('text').forEach(el => el.remove());
    }
    
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = async () => {
      ctx.fillStyle = '#1a3a2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to PDF using jspdf
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`tactical-board-${Date.now()}.pdf`);
      setShowExportDialog(false);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Draggable menu
  useEffect(() => {
    if (!isDraggingMenu) return;
    
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMenuPosition({
          x: Math.max(0, Math.min(rect.width - 200, e.clientX - rect.left - 100)),
          y: Math.max(0, Math.min(rect.height - 400, e.clientY - rect.top - 20))
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingMenu(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingMenu]);

  const toggleLock = (itemId) => {
    setLockedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const allTools = [
    { id: 'move', icon: Move, label: 'הזז' },
    { id: 'draw', icon: Pencil, label: 'קו רציף' },
    { id: 'dashed', icon: Pencil, label: 'קו מקווקו' },
    { id: 'arrow', icon: ArrowRight, label: 'חץ' },
    { id: 'text', icon: Type, label: 'טקסט' },
    { id: 'diamond', icon: Diamond, label: 'מעוין' },
    { id: 'circle', icon: CircleIcon, label: 'עיגול' },
    { id: 'square', icon: Square, label: 'ריבוע' },
    { id: 'triangle', icon: Triangle, label: 'משולש' },
    { id: 'cross', icon: X, label: 'איקס' },
    { id: 'erase', icon: Eraser, label: 'מחק' },
  ];
  const tools = hasPlan ? allTools : allTools.filter(t => basicTools.includes(t.id));

  const colors = ['#ffffff', '#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

  const ToolsMenu = ({ className = '' }) => (
    <div 
      className={`bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl ${isFullscreen ? 'p-3' : 'p-2'} ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {isMenuCollapsed ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMenuCollapsed(false)}
          className="text-slate-400"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      ) : (
        <div className={isFullscreen ? "space-y-3" : "space-y-2"}>
          <div className="flex items-center justify-between">
            <span className={`${isFullscreen ? 'text-xs' : 'text-[10px]'} text-slate-500 font-medium`}>כלים</span>
            {isFullscreen && (
              <div className="flex items-center gap-1">
                <div 
                  className="cursor-move text-slate-500 hover:text-slate-300"
                  onMouseDown={(e) => {
                    setIsDraggingMenu(true);
                    e.preventDefault();
                  }}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsMenuCollapsed(true)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          
          <div className={`flex ${isFullscreen ? 'gap-1' : 'gap-1 flex-wrap'}`}>
            {tools.map((t) => (
              <Button
                key={t.id}
                variant="ghost"
                size="icon"
                onClick={() => {
                  console.log("🔧 Tool changed to:", t.id);
                  setTool(t.id);
                }}
                className={`${isFullscreen ? 'h-9 w-9' : 'h-7 w-7'} ${tool === t.id ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500' : 'text-slate-400 hover:text-white'}`}
                title={t.label}
              >
                <t.icon className={isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} />
              </Button>
            ))}
          </div>

          {(tool === 'draw' || tool === 'dashed' || tool === 'arrow' || tool === 'text' || tool === 'diamond' || tool === 'circle' || tool === 'square' || tool === 'triangle' || tool === 'cross') && (
            <div className="flex gap-1 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setDrawingColor(color)}
                  className={`${isFullscreen ? 'w-6 h-6' : 'w-5 h-5'} rounded-full transition-all ${drawingColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          <div className={`border-t border-slate-700 ${isFullscreen ? 'pt-2' : 'pt-1.5'} space-y-${isFullscreen ? '2' : '1'}`}>
            <div className="flex gap-1 flex-wrap">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleUndo} 
                disabled={historyIndex <= 0}
                className={`${isFullscreen ? 'h-8 w-8' : 'h-6 w-6'} text-slate-400 disabled:opacity-30`} 
                title="בטל (Ctrl+Z)"
              >
                <RotateCcw className={isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`${isFullscreen ? 'h-8 w-8' : 'h-6 w-6'} text-slate-400 disabled:opacity-30`} 
                title="בצע שוב (Ctrl+Y)"
              >
                <RotateCcw className={`${isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} scale-x-[-1]`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset} className={`${isFullscreen ? 'h-8 w-8' : 'h-6 w-6'} text-slate-400`} title="איפוס">
                <Trash2 className={isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} />
              </Button>
            
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => toggleLock('ball')}
                className={`${isFullscreen ? 'h-8 w-8' : 'h-6 w-6'} ${lockedItems.has('ball') ? 'text-amber-400' : 'text-slate-400'}`}
                title="נעל/שחרר כדור"
              >
                {lockedItems.has('ball') ? <Lock className={isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} /> : <Unlock className={isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullscreen} 
                className={`${isFullscreen ? 'h-8 w-8' : 'h-6 w-6'} text-slate-400`}
                title={isFullscreen ? "יציאה ממסך מלא (ESC)" : "מסך מלא"}
              >
                {isFullscreen ? <Minimize2 className={isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} /> : <Maximize2 className={isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} />}
              </Button>
            </div>
          </div>

          {isFullscreen && (
            <div className="border-t border-slate-700 pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">פריימים ({frames.length})</span>
                <Button variant="ghost" size="sm" onClick={addFrame} className="h-7 text-xs text-emerald-400">
                  <Plus className="w-3 h-3 ml-1" />
                  הוסף
                </Button>
              </div>
            {frames.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {frames.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => loadFrame(i)}
                    className={`w-7 h-7 rounded text-xs font-medium ${currentFrame === i ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
            {frames.length >= 2 && (
              <Button
                onClick={playAnimation}
                disabled={isPlaying}
                className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                {isPlaying ? <Pause className="w-3 h-3 ml-1" /> : <Play className="w-3 h-3 ml-1" />}
                {isPlaying ? 'מנגן...' : 'הפעל'}
              </Button>
            )}
            </div>
          )}

          {isFullscreen && (
            <div className="border-t border-slate-700 pt-2 space-y-2">
              <LayerManager 
              layers={currentLayers}
              onToggleLayer={toggleLayer}
            />
            

            
            <div className="border-t border-slate-700 pt-2">
              <PlayerTagging
                 teamId={selectedTeamId}
                 homePlayers={homePlayers}
                 awayPlayers={awayPlayers}
                 onUpdatePlayer={updatePlayer}
                 showMode={playerShowMode}
                 onShowModeChange={setPlayerShowMode}
                 containerRef={containerRef}
               />
            </div>
            

            
            <div className="border-t border-slate-700 pt-2">
              <ControlZones
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                isActive={controlZonesActive}
                onToggle={() => setControlZonesActive(!controlZonesActive)}
                onFilterChange={setControlZonesFilter}
                customZones={customControlZones}
                onAddCustomZone={(zone) => setCustomControlZones(prev => [...prev, zone])}
                onUpdateCustomZone={(zone) => setCustomControlZones(prev => prev.map(z => z.id === zone.id ? zone : z))}
                onRemoveCustomZone={(zoneId) => setCustomControlZones(prev => prev.filter(z => z.id !== zoneId))}
                isFullscreen={isFullscreen}
                containerRef={containerRef}
              />
            </div>

            <div className="border-t border-slate-700 pt-2 space-y-1">
              <TemplateSelector
                teamId={selectedTeamId}
                onLoadTemplate={handleLoadTemplate}
                onSaveAsTemplate={() => {}}
                currentBoard={currentBoard}
                containerRef={containerRef}
              />
            </div>
            
            <div className="border-t border-slate-700 pt-2 flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(true)} className="flex-1 text-xs text-slate-400">
                <Save className="w-3 h-3 ml-1" />
                שמור
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowLoadDialog(true)} className="flex-1 text-xs text-slate-400">
                <Folder className="w-3 h-3 ml-1" />
                טען
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowExportDialog(true)} className="flex-1 text-xs text-slate-400">
                <Download className="w-3 h-3 ml-1" />
                ייצא
              </Button>
            </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div 
      className={`${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950' : 'min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6'}`}
      ref={containerRef}
    >
      <div className={isFullscreen ? 'h-full' : 'max-w-7xl mx-auto'}>
        {/* Header - hide in fullscreen */}
        {!isFullscreen && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">לוח טקטי</h1>
              <p className="text-slate-400">צייר מהלכים, בנה אנימציות ושתף עם הקבוצה</p>
            </div>
            <TeamSelector teams={teams} selectedTeamId={selectedTeamId} onSelect={setSelectedTeamId} />
          </div>
        )}

        {/* Tools Panel - Above board when not fullscreen */}
        {!isFullscreen && (
          <div className="mb-4 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Main Tools */}
              <div className="space-y-3">
                <ToolsMenu className="w-full" />
                
                {/* Frames */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">פריימים ({frames.length})</span>
                      <Button variant="ghost" size="sm" onClick={addFrame} className="h-7 text-xs text-emerald-400">
                        <Plus className="w-3 h-3 ml-1" />
                        הוסף
                      </Button>
                    </div>
                    {frames.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {frames.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => loadFrame(i)}
                            className={`w-7 h-7 rounded text-xs font-medium ${currentFrame === i ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    {frames.length >= 2 && (
                      <Button
                        onClick={playAnimation}
                        disabled={isPlaying}
                        className="w-full h-7 bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        {isPlaying ? <Pause className="w-3 h-3 ml-1" /> : <Play className="w-3 h-3 ml-1" />}
                        {isPlaying ? 'מנגן...' : 'הפעל'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Save/Load/Export */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(true)} className="flex-1 text-xs text-slate-400">
                        <Save className="w-3 h-3 ml-1" />
                        שמור
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowLoadDialog(true)} className="flex-1 text-xs text-slate-400">
                        <Folder className="w-3 h-3 ml-1" />
                        טען
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowExportDialog(true)} className="flex-1 text-xs text-slate-400">
                        <Download className="w-3 h-3 ml-1" />
                        ייצא
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Layers & Zones */}
              <div className="space-y-3">
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3 space-y-2">
                    <LayerManager 
                      layers={currentLayers}
                      onToggleLayer={toggleLayer}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Players & Templates */}
              <div className="space-y-3">
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <PlayerTagging
                      teamId={selectedTeamId}
                      homePlayers={homePlayers}
                      awayPlayers={awayPlayers}
                      onUpdatePlayer={updatePlayer}
                      showMode={playerShowMode}
                      onShowModeChange={setPlayerShowMode}
                      containerRef={containerRef}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3">
                    <ControlZones
                      homePlayers={homePlayers}
                      awayPlayers={awayPlayers}
                      isActive={controlZonesActive}
                      onToggle={() => setControlZonesActive(!controlZonesActive)}
                      onFilterChange={setControlZonesFilter}
                      customZones={customControlZones}
                      onAddCustomZone={(zone) => setCustomControlZones(prev => [...prev, zone])}
                      onUpdateCustomZone={(zone) => setCustomControlZones(prev => prev.map(z => z.id === zone.id ? zone : z))}
                      onRemoveCustomZone={(zoneId) => setCustomControlZones(prev => prev.filter(z => z.id !== zoneId))}
                      isFullscreen={isFullscreen}
                      containerRef={containerRef}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-3 space-y-1">
                    <TemplateSelector
                      teamId={selectedTeamId}
                      onLoadTemplate={handleLoadTemplate}
                      onSaveAsTemplate={() => {}}
                      currentBoard={currentBoard}
                      containerRef={containerRef}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="relative">
          {/* Canvas - Full Width */}
          <div className={isFullscreen ? 'h-screen w-screen' : 'w-full max-w-6xl mx-auto'}>
            <Card className={`${isFullscreen ? 'h-full rounded-none border-0' : 'bg-slate-900/50 border-slate-800'} overflow-hidden`}>
              <CardContent className="p-0 relative h-full" style={{ pointerEvents: 'auto' }}>
                <div
                  className="relative w-full h-full select-none"
                  style={{ 
                    aspectRatio: isFullscreen ? 'auto' : '16/9',
                    maxHeight: isFullscreen ? '100vh' : '70vh',
                    width: '100%',
                    height: isFullscreen ? '100vh' : 'auto',
                    touchAction: 'none',
                    border: isFullscreen ? 'none' : '3px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <svg
                    ref={canvasRef}
                    viewBox="0 0 200 90"
                    className="absolute inset-0 w-full h-full"
                    style={{ 
                      background: '#1a3a2a',
                      cursor: tool === 'draw' || tool === 'dashed' || tool === 'arrow' ? 'crosshair' : tool === 'erase' ? 'pointer' : 'grab',
                      touchAction: 'none',
                      pointerEvents: 'auto'
                    }}
                    preserveAspectRatio="xMidYMid meet"
                    onPointerDown={handleMouseDown}
                    onPointerMove={handleMouseMove}
                    onPointerUp={handleMouseUp}
                    onPointerLeave={handleMouseUp}
                  >
                    {/* Field markings - landscape 200x90 */}
                    <rect x="5" y="5" width="190" height="80" fill="none" stroke="#2d5a3d" strokeWidth="0.6" />
                    <line x1="100" y1="5" x2="100" y2="85" stroke="#2d5a3d" strokeWidth="0.6" />
                    <circle cx="100" cy="45" r="15" fill="none" stroke="#2d5a3d" strokeWidth="0.6" />
                    <circle cx="100" cy="45" r="0.8" fill="#2d5a3d" />
                    
                    {/* Penalty areas */}
                    <rect x="5" y="22" width="25" height="46" fill="none" stroke="#2d5a3d" strokeWidth="0.6" />
                    <rect x="170" y="22" width="25" height="46" fill="none" stroke="#2d5a3d" strokeWidth="0.6" />
                    
                    {/* Goal areas */}
                    <rect x="5" y="33" width="12" height="24" fill="none" stroke="#2d5a3d" strokeWidth="0.6" />
                    <rect x="183" y="33" width="12" height="24" fill="none" stroke="#2d5a3d" strokeWidth="0.6" />

                    {/* Layer Background Effects */}
                    <defs>
                      {/* Glow filter for highlighted players */}
                      <filter id="player-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feFlood floodColor="#06b6d4" floodOpacity="0.5" />
                        <feComposite in2="blur" operator="in" />
                        <feMerge>
                          <feMergeNode />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      {/* Arrow markers for different layers */}
                      <marker id="arrow-buildup" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
                      </marker>
                      <marker id="arrow-pressing" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                      </marker>
                    </defs>

                    {/* Build Up Layer */}
                    {currentLayers.buildup && (
                      <g opacity="0.7">
                        {/* Passing lanes between defenders and midfield */}
                        {homePlayers.slice(1, 5).map((defender, i) => 
                          homePlayers.slice(5, 9).map((midfielder, j) => (
                            <line
                              key={`buildup-${i}-${j}`}
                              x1={defender.x}
                              y1={defender.y}
                              x2={midfielder.x}
                              y2={midfielder.y}
                              stroke="#06b6d4"
                              strokeWidth="0.3"
                              strokeOpacity="0.3"
                              strokeDasharray="2,2"
                            />
                          ))
                        )}
                        {/* Direction arrows */}
                        {homePlayers.slice(5, 7).map((player, i) => (
                          <line
                            key={`buildup-arrow-${i}`}
                            x1={player.x}
                            y1={player.y}
                            x2={player.x + 15}
                            y2={player.y}
                            stroke="#06b6d4"
                            strokeWidth="0.8"
                            markerEnd="url(#arrow-buildup)"
                          />
                        ))}
                      </g>
                    )}

                    {/* Pressing Layer */}
                    {currentLayers.pressing && (
                      <g opacity="0.7">
                        {/* Pressing zone (high block area) */}
                        <rect
                          x="80"
                          y="20"
                          width="50"
                          height="50"
                          fill="#ef4444"
                          opacity="0.15"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="4,2"
                          rx="3"
                        />
                        {/* Pressure arrows */}
                        {homePlayers.slice(8, 11).map((attacker, i) => (
                          <line
                            key={`pressing-arrow-${i}`}
                            x1={attacker.x}
                            y1={attacker.y}
                            x2={attacker.x + 20}
                            y2={attacker.y + (i === 1 ? 0 : i === 0 ? -5 : 5)}
                            stroke="#ef4444"
                            strokeWidth="1"
                            markerEnd="url(#arrow-pressing)"
                          />
                        ))}
                        {/* Defensive line */}
                        {homePlayers.length >= 5 && (
                          <line
                            x1={Math.min(...homePlayers.slice(1, 5).map(p => p.x))}
                            y1="45"
                            x2={Math.min(...homePlayers.slice(1, 5).map(p => p.x))}
                            y2="45"
                            stroke="#ef4444"
                            strokeWidth="0.5"
                            strokeDasharray="3,3"
                            opacity="0.6"
                          />
                        )}
                      </g>
                    )}

                    {/* Rest Defense Layer */}
                    {currentLayers.restDefense && (
                      <g opacity="0.6">
                        {/* Defensive block frame */}
                        <rect
                          x="30"
                          y="20"
                          width="45"
                          height="50"
                          fill="#8b5cf6"
                          opacity="0.1"
                          stroke="#8b5cf6"
                          strokeWidth="1"
                          rx="2"
                        />
                        {/* Compactness lines between defenders */}
                        {homePlayers.slice(1, 4).map((player, i) => 
                          i < homePlayers.slice(1, 5).length - 1 ? (
                            <line
                              key={`defense-compact-${i}`}
                              x1={player.x}
                              y1={player.y}
                              x2={homePlayers[i + 2]?.x || player.x}
                              y2={homePlayers[i + 2]?.y || player.y}
                              stroke="#8b5cf6"
                              strokeWidth="0.4"
                              strokeDasharray="2,1"
                              opacity="0.5"
                            />
                          ) : null
                        )}
                      </g>
                    )}

                    {/* Set Pieces Layer */}
                    {currentLayers.setPieces && (
                      <g opacity="0.6">
                        {/* Target zones (dangerous areas) */}
                        <circle cx="180" cy="35" r="12" fill="#f59e0b" opacity="0.15" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" />
                        <circle cx="180" cy="55" r="12" fill="#f59e0b" opacity="0.15" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" />
                        {/* Running paths (curved lines) */}
                        {homePlayers.slice(8, 11).map((player, i) => (
                          <path
                            key={`setpiece-path-${i}`}
                            d={`M ${player.x} ${player.y} Q ${player.x + 20} ${player.y + (i - 1) * 10} ${player.x + 35} ${player.y + (i - 1) * 5}`}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="0.6"
                            strokeDasharray="3,2"
                          />
                        ))}
                      </g>
                    )}

                    {/* Custom Control Zones Boundaries */}
                    {controlZonesActive && controlZonesFilter === 'custom' && customControlZones.map((zone) => (
                     <g key={zone.id}>
                       <rect
                         x={zone.x}
                         y={zone.y}
                         width={zone.width}
                         height={zone.height}
                         fill="none"
                         stroke="#8b5cf6"
                         strokeWidth="1"
                         strokeDasharray="4,2"
                         opacity="0.8"
                         style={{ cursor: 'move', pointerEvents: 'all' }}
                       />
                       <text
                         x={zone.x + zone.width / 2}
                         y={zone.y - 2}
                         textAnchor="middle"
                         fill="#8b5cf6"
                         fontSize="2.5"
                         fontWeight="bold"
                       >
                         {zone.label}
                       </text>
                     </g>
                    ))}

                    {/* Control Zones - rendered first so they're behind everything */}
                    {controlZones && controlZones.map((zone, i) => (
                     <rect
                       key={`control-${i}`}
                       x={zone.x}
                       y={zone.y}
                       width={zone.width}
                       height={zone.height}
                       fill={zone.color}
                       opacity={zone.opacity}
                       style={{ pointerEvents: 'none' }}
                     />
                    ))}

                    {/* Heat Zones */}
                    {heatZones
                     .filter(zone => !activeLayer || zone.layerType === activeLayer || currentLayers[zone.layerType])
                     .map((zone, i) => (
                     <g key={zone.id}>
                        <rect
                          x={zone.x}
                          y={zone.y}
                          width={zone.width}
                          height={zone.height}
                          fill={zone.color}
                          opacity={zone.opacity}
                          stroke={zone.color}
                          strokeWidth="1"
                          strokeDasharray="4,2"
                          rx="2"
                        />
                        {zone.label && (
                          <text
                            x={zone.x + zone.width / 2}
                            y={zone.y + zone.height / 2}
                            textAnchor="middle"
                            fill="white"
                            fontSize="3"
                            fontWeight="bold"
                            style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                          >
                            {zone.label}
                          </text>
                        )}
                        {zone.tacticalGoal && (
                          <text
                            x={zone.x + zone.width / 2}
                            y={zone.y + zone.height / 2 + 4}
                            textAnchor="middle"
                            fill="white"
                            fontSize="2"
                            opacity="0.8"
                            style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                          >
                            {zone.tacticalGoal.substring(0, 30)}
                          </text>
                        )}
                      </g>
                    ))}

                    {/* Drawings */}
                    {drawings.map((drawing, i) => {
                      if (drawing.points) {
                        // Line drawing
                        return (
                          <path
                            key={i}
                            d={drawing.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                            fill="none"
                            stroke={drawing.color}
                            strokeWidth="1.5"
                            strokeDasharray={drawing.dashed ? "4,4" : "none"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            markerEnd={drawing.arrow ? "url(#arrowhead)" : "none"}
                          />
                        );
                      } else if (drawing.type === 'diamond') {
                        return (
                          <polygon
                            key={i}
                            points={`${drawing.x},${drawing.y-5} ${drawing.x+5},${drawing.y} ${drawing.x},${drawing.y+5} ${drawing.x-5},${drawing.y}`}
                            fill="none"
                            stroke={drawing.color}
                            strokeWidth="1.5"
                          />
                        );
                      } else if (drawing.type === 'circle') {
                        return (
                          <circle
                            key={i}
                            cx={drawing.x}
                            cy={drawing.y}
                            r="5"
                            fill="none"
                            stroke={drawing.color}
                            strokeWidth="1.5"
                          />
                        );
                      } else if (drawing.type === 'square') {
                        return (
                          <rect
                            key={i}
                            x={drawing.x - 4}
                            y={drawing.y - 4}
                            width="8"
                            height="8"
                            fill="none"
                            stroke={drawing.color}
                            strokeWidth="1.5"
                          />
                        );
                      } else if (drawing.type === 'triangle') {
                        return (
                          <polygon
                            key={i}
                            points={`${drawing.x},${drawing.y-5} ${drawing.x+5},${drawing.y+4} ${drawing.x-5},${drawing.y+4}`}
                            fill="none"
                            stroke={drawing.color}
                            strokeWidth="1.5"
                          />
                        );
                      } else if (drawing.type === 'cross') {
                        return (
                          <g key={i}>
                            <line
                              x1={drawing.x - 4}
                              y1={drawing.y - 4}
                              x2={drawing.x + 4}
                              y2={drawing.y + 4}
                              stroke={drawing.color}
                              strokeWidth="1.5"
                            />
                            <line
                              x1={drawing.x + 4}
                              y1={drawing.y - 4}
                              x2={drawing.x - 4}
                              y2={drawing.y + 4}
                              stroke={drawing.color}
                              strokeWidth="1.5"
                            />
                          </g>
                        );
                      } else if (drawing.type === 'text') {
                        return (
                          <text
                            key={i}
                            x={drawing.x}
                            y={drawing.y}
                            fill={drawing.color}
                            fontSize="4"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {drawing.text}
                          </text>
                        );
                      }
                      return null;
                    })}

                    {/* Arrow marker definition */}
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3, 0 6" fill={drawingColor} />
                      </marker>
                    </defs>

                    {/* Current drawing path */}
                    {currentPath.length > 1 && (
                      <path
                        d={currentPath.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                        fill="none"
                        stroke={drawingColor}
                        strokeWidth="1.5"
                        strokeDasharray={tool === 'dashed' ? "4,4" : "none"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.7"
                        markerEnd={tool === 'arrow' ? "url(#arrowhead)" : "none"}
                      />
                    )}

                    {/* Home players (emerald) - smaller */}
                    {homePlayers.map((player, idx) => {
                      // Highlight key players in Build Up layer
                      const isKeyBuildup = currentLayers.buildup && idx >= 1 && idx <= 6;
                      // Outline players staying back in Rest Defense
                      const isRestDefender = currentLayers.restDefense && idx >= 1 && idx <= 5;
                      
                      return (
                        <g key={player.id} className={lockedItems.has(player.id) ? 'opacity-70' : ''}>
                          {/* Glow effect for key buildup players */}
                          {isKeyBuildup && (
                            <circle
                              cx={player.x}
                              cy={player.y}
                              r="5"
                              fill="#06b6d4"
                              opacity="0.2"
                            />
                          )}
                          {/* Strong outline for rest defense */}
                          {isRestDefender && (
                            <circle
                              cx={player.x}
                              cy={player.y}
                              r="4"
                              fill="none"
                              stroke="#8b5cf6"
                              strokeWidth="0.6"
                              opacity="0.6"
                            />
                          )}
                          <circle
                            cx={player.x}
                            cy={player.y}
                            r="3"
                            fill="#10b981"
                            stroke={lockedItems.has(player.id) ? "#f59e0b" : "#ffffff"}
                            strokeWidth={lockedItems.has(player.id) ? "0.6" : "0.4"}
                            className={lockedItems.has(player.id) ? 'cursor-not-allowed' : 'cursor-move'}
                            filter={isKeyBuildup ? 'url(#player-glow)' : 'none'}
                          />
                          {(playerShowMode === 'all' || playerShowMode === 'roles') && (
                            <text
                              x={player.x}
                              y={player.y + 1.2}
                              textAnchor="middle"
                              fill="white"
                              fontSize="3.2"
                              fontWeight="bold"
                            >
                              {player.number}
                            </text>
                          )}
                          {(playerShowMode === 'all' || playerShowMode === 'roles') && player.name && (
                            <text
                              x={player.x}
                              y={player.y - 4}
                              textAnchor="middle"
                              fill="white"
                              fontSize="2"
                              style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                            >
                              {player.name}
                            </text>
                          )}
                          {(playerShowMode === 'all' || playerShowMode === 'roles') && player.role && (
                            <text
                              x={player.x}
                              y={player.y + 5.5}
                              textAnchor="middle"
                              fill="#a5f3fc"
                              fontSize="1.8"
                              style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                            >
                              {player.role}
                            </text>
                          )}
                          {(playerShowMode === 'all' || playerShowMode === 'responsibilities') && player.responsibility && (
                            <text
                              x={player.x}
                              y={player.y + (playerShowMode === 'responsibilities' ? 1.5 : 8)}
                              textAnchor="middle"
                              fill="#c084fc"
                              fontSize="1.6"
                              fontStyle="italic"
                              style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                            >
                              {player.responsibility.substring(0, 20)}
                            </text>
                          )}
                          {lockedItems.has(player.id) && (
                            <text
                              x={player.x}
                              y={player.y - 5}
                              textAnchor="middle"
                              fill="#f59e0b"
                              fontSize="2.5"
                            >
                              🔒
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Away players (red) - smaller */}
                    {awayPlayers.map((player) => (
                      <g key={player.id} className={lockedItems.has(player.id) ? 'opacity-70' : ''}>
                        <circle
                          cx={player.x}
                          cy={player.y}
                          r="3"
                          fill="#ef4444"
                          stroke={lockedItems.has(player.id) ? "#f59e0b" : "#ffffff"}
                          strokeWidth={lockedItems.has(player.id) ? "0.6" : "0.4"}
                          className={lockedItems.has(player.id) ? 'cursor-not-allowed' : 'cursor-move'}
                        />
                        {(playerShowMode === 'all' || playerShowMode === 'roles') && (
                          <text
                            x={player.x}
                            y={player.y + 1.2}
                            textAnchor="middle"
                            fill="white"
                            fontSize="3.2"
                            fontWeight="bold"
                          >
                            {player.number}
                          </text>
                        )}
                        {(playerShowMode === 'all' || playerShowMode === 'roles') && player.name && (
                          <text
                            x={player.x}
                            y={player.y - 4}
                            textAnchor="middle"
                            fill="white"
                            fontSize="2"
                            style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                          >
                            {player.name}
                          </text>
                        )}
                        {(playerShowMode === 'all' || playerShowMode === 'roles') && player.role && (
                          <text
                            x={player.x}
                            y={player.y + 5.5}
                            textAnchor="middle"
                            fill="#fca5a5"
                            fontSize="1.8"
                            style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                          >
                            {player.role}
                          </text>
                        )}
                        {(playerShowMode === 'all' || playerShowMode === 'responsibilities') && player.responsibility && (
                          <text
                            x={player.x}
                            y={player.y + (playerShowMode === 'responsibilities' ? 1.5 : 8)}
                            textAnchor="middle"
                            fill="#c084fc"
                            fontSize="1.6"
                            fontStyle="italic"
                            style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                          >
                            {player.responsibility.substring(0, 20)}
                          </text>
                        )}
                        {lockedItems.has(player.id) && (
                          <text
                            x={player.x}
                            y={player.y - 5}
                            textAnchor="middle"
                            fill="#f59e0b"
                            fontSize="2.5"
                          >
                            🔒
                          </text>
                        )}
                      </g>
                    ))}

                    {/* Ball - smaller */}
                    <circle
                      cx={ball.x}
                      cy={ball.y}
                      r="1.8"
                      fill="white"
                      stroke={lockedItems.has('ball') ? "#f59e0b" : "#333"}
                      strokeWidth="0.3"
                      className={lockedItems.has('ball') ? 'cursor-not-allowed' : 'cursor-move'}
                    />
                    {lockedItems.has('ball') && (
                      <text
                        x={ball.x}
                        y={ball.y - 3.5}
                        textAnchor="middle"
                        fill="#f59e0b"
                        fontSize="2"
                      >
                        🔒
                      </text>
                    )}
                  </svg>



                  {/* Fullscreen floating menu */}
                  {isFullscreen && (
                    <motion.div
                      className="absolute z-50 select-none"
                      style={{ 
                        left: menuPosition.x, 
                        top: menuPosition.y,
                        cursor: isDraggingMenu ? 'grabbing' : 'auto',
                        pointerEvents: 'auto'
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ToolsMenu />
                    </motion.div>
                  )}
                  
                  {/* Fullscreen exit hint */}
                  {isFullscreen && !isMenuCollapsed && (
                    <div className="absolute top-4 right-4 text-xs text-slate-500 bg-slate-900/80 px-3 py-2 rounded-lg">
                      לחץ ESC ליציאה ממסך מלא
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Save Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white" container={containerRef.current}>
            <DialogHeader>
              <DialogTitle>שמירת לוח טקטי</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="שם הלוח"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>ביטול</Button>
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">שמור</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Load Dialog */}
        <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white" container={containerRef.current}>
            <DialogHeader>
              <DialogTitle>טעינת לוח טקטי</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {savedBoards.length > 0 ? (
                savedBoards.map((board) => (
                  <div
                    key={board.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors group"
                  >
                    <div 
                      onClick={() => handleLoad(board)}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-medium">{board.name}</p>
                      <p className="text-xs text-slate-400">{board.frames?.length || 0} פריימים</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`למחוק את "${board.name}"?`)) {
                          try {
                            await base44.entities.TacticalBoard.delete(board.id);
                            if (currentBoard?.id === board.id) {
                              setCurrentBoard(null);
                              setBoardName('');
                            }
                            loadBoards(selectedTeamId);
                          } catch (error) {
                            console.error('Error deleting board:', error);
                            loadBoards(selectedTeamId);
                          }
                        }
                      }}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-8">אין לוחות שמורים</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white" container={containerRef.current}>
            <DialogHeader>
              <DialogTitle>ייצוא לוח טקטי</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-400 mb-3">בחר מה להציג בייצוא:</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.showNumbers}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, showNumbers: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">מספרי שחקנים</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.showDrawings}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, showDrawings: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">קווים וציורים</span>
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleExportPNG} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <ImageIcon className="w-4 h-4 ml-2" />
                  PNG
                </Button>
                <Button 
                  onClick={handleExportPDF} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <FileDown className="w-4 h-4 ml-2" />
                  PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}