import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EditProgramModal({ open, onClose, program, player, onSaved }) {
  const [formData, setFormData] = useState({
    focus_title: '',
    work_topics: [],
    goal_statement: '',
    notes_for_coach: '',
    progress_percentage: 0
  });
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    if (program) {
      setFormData({
        focus_title: program.focus_title || '',
        work_topics: program.work_topics || [],
        goal_statement: program.goal_statement || '',
        notes_for_coach: program.notes_for_coach || '',
        progress_percentage: program.progress_percentage || 0
      });
    } else if (player) {
      setFormData({
        focus_title: `פיתוח אישי - ${player.name}`,
        work_topics: player.improvements?.slice(0, 4) || [],
        goal_statement: '',
        notes_for_coach: '',
        progress_percentage: 0
      });
    }
  }, [program, player]);

  const handleSave = async () => {
    try {
      if (program) {
        await base44.entities.TrainingProgram.update(program.id, formData);
      } else {
        await base44.entities.TrainingProgram.create({
          ...formData,
          team_id: player.team_id,
          player_id: player.id,
          status: 'active',
          ai_generated: false
        });
      }
      onSaved && onSaved();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const addTopic = () => {
    if (newTopic.trim() && !formData.work_topics.includes(newTopic.trim())) {
      setFormData(prev => ({
        ...prev,
        work_topics: [...prev.work_topics, newTopic.trim()]
      }));
      setNewTopic('');
    }
  };

  const removeTopic = (topic) => {
    setFormData(prev => ({
      ...prev,
      work_topics: prev.work_topics.filter(t => t !== topic)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)' }}
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#2C2416' }}>
            {program ? 'עריכת תוכנית אישית' : 'יצירת תוכנית אישית'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label style={{ color: '#5C4E38' }}>שם התוכנית</Label>
            <Input
              value={formData.focus_title}
              onChange={(e) => setFormData(prev => ({ ...prev, focus_title: e.target.value }))}
              placeholder="פיתוח אישי..."
              style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
            />
          </div>

          <div>
            <Label style={{ color: '#5C4E38' }}>נושאי עבודה</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                placeholder="הוסף נושא עבודה..."
                style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
              />
              <Button
                onClick={addTopic}
                size="sm"
                style={{ backgroundColor: '#7A4FA0', color: '#fff' }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.work_topics.map((topic, i) => (
                <span key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'rgba(122,79,160,0.12)', color: '#7A4FA0', border: '1px solid rgba(122,79,160,0.28)' }}>
                  {topic}
                  <button onClick={() => removeTopic(topic)} style={{ color: '#7A4FA0' }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label style={{ color: '#5C4E38' }}>מטרת התוכנית</Label>
            <Textarea
              value={formData.goal_statement}
              onChange={(e) => setFormData(prev => ({ ...prev, goal_statement: e.target.value }))}
              rows={3}
              placeholder="מה המטרה המרכזית של התוכנית הזו..."
              style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
            />
          </div>

          {program && (
            <div>
              <Label style={{ color: '#5C4E38' }}>אחוז התקדמות ({formData.progress_percentage}%)</Label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.progress_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, progress_percentage: parseInt(e.target.value) }))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: '#EDE8DF', accentColor: '#7A4FA0' }}
              />
            </div>
          )}

          <div>
            <Label style={{ color: '#5C4E38' }}>הערות למאמן</Label>
            <Textarea
              value={formData.notes_for_coach}
              onChange={(e) => setFormData(prev => ({ ...prev, notes_for_coach: e.target.value }))}
              rows={4}
              placeholder="הערות נוספות על התוכנית..."
              style={{ backgroundColor: '#EDE8DF', borderColor: 'rgba(139,115,85,0.3)', color: '#2C2416' }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(139,115,85,0.14)' }}>
            <Button variant="ghost" onClick={onClose} style={{ color: '#7A6B57' }}>
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.focus_title || formData.work_topics.length === 0}
              style={{ backgroundColor: '#7A4FA0', color: '#fff' }}
            >
              {program ? 'עדכן' : 'צור תוכנית'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}