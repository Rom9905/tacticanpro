import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function HeatZoneManager({ zones, onAddZone, onRemoveZone, onUpdateZone, currentLayer, containerRef }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneData, setZoneData] = useState({
    label: '',
    tacticalGoal: '',
    color: '#10b981',
    opacity: 0.3,
  });

  const presetZones = [
    { label: 'אזור בנייה', color: '#10b981', tacticalGoal: 'בנייה בטוחה מהשוער והמגנים' },
    { label: 'אזור לחץ', color: '#ef4444', tacticalGoal: 'לחץ אגרסיבי והשבת כדור' },
    { label: 'שליש אחרון', color: '#f59e0b', tacticalGoal: 'יצירת הזדמנויות וסיום' },
    { label: 'מלכודת', color: '#8b5cf6', tacticalGoal: 'כיווץ המרחב וכיבוש כדור' },
  ];

  const handleSave = () => {
    const newZone = {
      id: editingZone?.id || `zone-${Date.now()}`,
      x: editingZone?.x || 50,
      y: editingZone?.y || 30,
      width: editingZone?.width || 40,
      height: editingZone?.height || 25,
      ...zoneData,
      layerType: currentLayer,
    };
    
    if (editingZone) {
      onUpdateZone(newZone);
    } else {
      onAddZone(newZone);
    }
    
    setShowDialog(false);
    setEditingZone(null);
    setZoneData({ label: '', tacticalGoal: '', color: '#10b981', opacity: 0.3 });
  };

  const handlePreset = (preset) => {
    setZoneData(prev => ({
      ...prev,
      label: preset.label,
      tacticalGoal: preset.tacticalGoal,
      color: preset.color,
    }));
  };

  const filteredZones = zones.filter(z => !currentLayer || z.layerType === currentLayer);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-500 font-medium">אזורי שליטה</div>
        <Button
          size="sm"
          onClick={() => setShowDialog(true)}
          className="h-7 text-xs bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="w-3 h-3 ml-1" />
          אזור
        </Button>
      </div>

      <div className="space-y-1 max-h-32 overflow-y-auto">
        {filteredZones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50 text-xs group"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MapPin className="w-3 h-3 text-violet-400 shrink-0" />
              <div
                className="w-3 h-3 rounded shrink-0"
                style={{ backgroundColor: zone.color, opacity: zone.opacity }}
              />
              <span className="text-slate-300 truncate">{zone.label}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveZone(zone.id)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white" container={containerRef?.current}>
          <DialogHeader>
            <DialogTitle>הוספת אזור שליטה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">תבניות מהירות</label>
              <div className="grid grid-cols-2 gap-2">
                {presetZones.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 text-right border border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: preset.color }}
                      />
                      {preset.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">שם האזור</label>
              <Input
                value={zoneData.label}
                onChange={(e) => setZoneData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="לדוגמה: אזור בנייה"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">מטרה טקטית</label>
              <Textarea
                value={zoneData.tacticalGoal}
                onChange={(e) => setZoneData(prev => ({ ...prev, tacticalGoal: e.target.value }))}
                placeholder="מה המטרה באזור זה?"
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">צבע</label>
                <input
                  type="color"
                  value={zoneData.color}
                  onChange={(e) => setZoneData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 rounded bg-slate-800 border border-slate-700"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">שקיפות</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.7"
                  step="0.1"
                  value={zoneData.opacity}
                  onChange={(e) => setZoneData(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDialog(false)}>ביטול</Button>
              <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
                הוסף אזור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}