import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Edit3, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CoachNotesEditor({ player, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(player?.coach_professional_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Player.update(player.id, {
        coach_professional_notes: notes
      });
      onUpdate && onUpdate();
      setIsOpen(false);
    } catch (error) {
      console.error('Save failed:', error);
    }
    setSaving(false);
  };

  return (
    <>
      {player.coach_professional_notes ? (
        <div className="rounded-xl p-5 mb-5"
          style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: '#2A5FA8' }} />
              <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>הערות מקצועיות של המאמן</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setNotes(player.coach_professional_notes); setIsOpen(true); }}
              style={{ color: '#7A6B57' }}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#5C4E38' }}>
            {player.coach_professional_notes}
          </p>
        </div>
      ) : (
        <div className="rounded-xl p-5 mb-5 text-center"
          style={{ backgroundColor: 'rgba(41,95,168,0.06)', border: '1px dashed rgba(41,95,168,0.25)' }}>
          <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
          <p className="text-sm font-medium mb-1" style={{ color: '#2C2416' }}>אין הערות מקצועיות</p>
          <p className="text-xs mb-3" style={{ color: '#9A8672' }}>הוסף הערות על השחקן - הבנה טקטית, קבלת החלטות, התנהלות באימונים</p>
          <Button
            size="sm"
            onClick={() => { setNotes(''); setIsOpen(true); }}
            style={{ backgroundColor: '#2A5FA8', color: '#fff' }}
          >
            <Plus className="w-3.5 h-3.5 ml-1" />
            הוסף הערות
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-2xl"
          style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#2C2416' }}>הערות מקצועיות - {player?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs mb-2" style={{ color: '#7A6B57' }}>
                כתוב הערות מקצועיות על השחקן - חולשות, חוזקות, הבנה טקטית, קבלת החלטות, התנהלות באימונים, התאמה טקטית וכו׳
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={10}
                placeholder="לדוגמה: שחקן עם הבנה טקטית טובה אך מתקשה בקבלת החלטות תחת לחץ. באימונים מראה מוטיבציה גבוהה ורצון להשתפר..."
                style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)} style={{ color: '#7A6B57' }}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: '#2A5FA8', color: '#fff' }}>
                {saving ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}