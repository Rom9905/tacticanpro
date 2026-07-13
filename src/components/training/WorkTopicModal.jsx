import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Target, PenSquare, Dumbbell, Swords } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';

const PRIORITIES_HE = [
  { value: 'critical', label: 'קריטי',  color: '#B94040' },
  { value: 'high',     label: 'גבוה',   color: '#D97706' },
  { value: 'medium',   label: 'בינוני', color: '#2A5FA8' },
  { value: 'low',      label: 'נמוך',   color: '#9A8672' },
];
const PRIORITIES_EN = [
  { value: 'critical', label: 'Critical', color: '#B94040' },
  { value: 'high',     label: 'High',     color: '#D97706' },
  { value: 'medium',   label: 'Medium',   color: '#2A5FA8' },
  { value: 'low',      label: 'Low',      color: '#9A8672' },
];

const CATEGORIES_HE = ['התקפה', 'הגנה', 'מעברים', 'מצבים נייחים', 'לחץ', 'כללי'];
const CATEGORIES_EN = ['Attack', 'Defense', 'Transitions', 'Set Pieces', 'Pressing', 'General'];

const TACTICAL_TOPICS_HE = [
  'לחץ גבוה', 'בנייה מהגנה', 'מעברים התקפיים', 'מעברים הגנתיים',
  'תיאום הגנתי', 'מצבים נייחים', 'שחקן נגד שחקן', 'שליטה במרכז',
  'הגנה ארגונית', 'בנייה מהלחץ', 'יציאה מלחץ', 'משחק אורכי', 'כדורים גבוהים'
];
const TACTICAL_TOPICS_EN = [
  'High Press', 'Build from Defense', 'Attacking Transitions', 'Defensive Transitions',
  'Defensive Shape', 'Set Pieces', '1v1 Marking', 'Midfield Control',
  'Organized Defense', 'Build under Press', 'Press Escape', 'Long Game', 'Aerial Balls'
];

export default function WorkTopicModal({ open, topic, teamId, summaries, onClose, onSaved }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';

  const PRIORITIES = isHe ? PRIORITIES_HE : PRIORITIES_EN;
  const _CATEGORIES = isHe ? CATEGORIES_HE : CATEGORIES_EN;
  const _TACTICAL_TOPICS = isHe ? TACTICAL_TOPICS_HE : TACTICAL_TOPICS_EN;

  const isNew = !topic?.id;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('כללי');
  const [source, setSource] = useState('manual');
  const [linkedTopics, setLinkedTopics] = useState([]);
  const [progressPct, setProgressPct] = useState(0);
  const [progressNote, setProgressNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [_fromSummary, setFromSummary] = useState(null);

  useEffect(() => {
    if (topic) {
      setTitle(topic.title || '');
      setDescription(topic.description || '');
      setPriority(topic.priority || 'medium');
      setCategory(topic.category || 'כללי');
      setSource(topic.source || 'manual');
      setLinkedTopics(topic.linked_topics || []);
      setProgressPct(topic.progress_pct || 0);
      setProgressNote(topic.progress_note || '');
    }
  }, [topic]);

  const toggleLinkedTopic = (t) =>
    setLinkedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data = {
      team_id: teamId, title: title.trim(), description, priority,
      category, source, linked_topics: linkedTopics,
      progress_pct: progressPct, progress_note: progressNote,
      status: topic?.status || 'active',
    };
    if (isNew) {
      await base44.entities.TacticalGoal.create(data);
    } else {
      await base44.entities.TacticalGoal.update(topic.id, data);
    }
    setSaving(false);
    onSaved && onSaved();
  };

  const applyFromSummary = (s) => {
    if (!title) setTitle(s.topic || '');
    if (!description) setDescription(s.issues_found || s.tactical_insights || '');
    setLinkedTopics(prev => {
      const merged = new Set([...prev, ...(s.tactical_topics || [])]);
      return Array.from(merged);
    });
    setSource(s.event_type === 'match' ? 'match' : 'training');
    setFromSummary(null);
  };

  const recentSummaries = (summaries || [])
    .filter(s => s.issues_found || s.tactical_topics?.length > 0)
    .slice(0, 10);

  const sourceOptions = [
    { value: 'manual',   labelHe: 'ידני',  labelEn: 'Manual',   icon: PenSquare },
    { value: 'match',    labelHe: 'משחק',  labelEn: 'Match',    icon: Swords },
    { value: 'training', labelHe: 'אימון', labelEn: 'Training', icon: Dumbbell },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }}
        dir={isHe ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#2C2416' }}>
            <Target className="w-4 h-4" style={{ color: '#2A7050' }} />
            {isNew
              ? (isHe ? 'נושא עבודה חדש' : 'New Work Topic')
              : (isHe ? 'עדכון נושא עבודה' : 'Update Work Topic')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Import from summary */}
          {isNew && recentSummaries.length > 0 && (
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(42,112,80,0.07)', border: '1px solid rgba(42,112,80,0.22)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#2A7050' }}>
                📥 {isHe ? 'ייבא מסיכום מקצועי (אופציונלי)' : 'Import from Professional Summary (optional)'}
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recentSummaries.map(s => {
                  const isTraining = s.event_type === 'training';
                  return (
                    <button key={s.id} onClick={() => applyFromSummary(s)}
                      className="w-full text-right flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white transition-all"
                      style={{ border: '1px solid rgba(139,115,85,0.15)' }}>
                      {isTraining
                        ? <Dumbbell className="w-3 h-3 flex-shrink-0" style={{ color: '#2A7050' }} />
                        : <Swords className="w-3 h-3 flex-shrink-0" style={{ color: '#2A5FA8' }} />}
                      <span style={{ color: '#5C4E38' }}>{s.event_label || s.topic || (isHe ? 'סיכום' : 'Summary')}</span>
                      <span className="mr-auto text-[10px]" style={{ color: '#9A8672' }}>
                        {s.event_date ? new Date(s.event_date).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: '2-digit', month: 'short' }) : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#5C4E38' }}>
              {isHe ? 'שם הנושא *' : 'Topic Name *'}
            </label>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
              placeholder={isHe ? 'לדוגמה: בנייה מהלחץ' : 'e.g. Build-up under pressure'}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#5C4E38' }}>
              {isHe ? 'תיאור' : 'Description'}
            </label>
            <Textarea
              className="min-h-[60px] text-sm resize-none"
              style={{ backgroundColor: '#F0EBE2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }}
              placeholder={isHe ? 'תאר את הנושא...' : 'Describe the topic...'}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>
              {isHe ? 'רמת דחיפות' : 'Priority Level'}
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => setPriority(p.value)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: priority === p.value ? `${p.color}20` : 'rgba(139,115,85,0.06)',
                    border: `1.5px solid ${priority === p.value ? p.color + '66' : 'rgba(139,115,85,0.18)'}`,
                    color: priority === p.value ? p.color : '#9A8672',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>
              {isHe ? 'קטגוריה' : 'Category'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES_HE.map((c, i) => (
                <button key={c} onClick={() => setCategory(c)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: category === c ? 'rgba(42,112,80,0.15)' : 'rgba(139,115,85,0.06)',
                    border: `1px solid ${category === c ? 'rgba(42,112,80,0.45)' : 'rgba(139,115,85,0.18)'}`,
                    color: category === c ? '#2A7050' : '#7A6B57',
                  }}>
                  {isHe ? c : CATEGORIES_EN[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>
              {isHe ? 'מקור הנושא' : 'Topic Source'}
            </label>
            <div className="flex gap-2">
              {sourceOptions.map(s => {
                const Icon = s.icon;
                return (
                  <button key={s.value} onClick={() => setSource(s.value)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: source === s.value ? 'rgba(42,112,80,0.12)' : 'rgba(139,115,85,0.06)',
                      border: `1.5px solid ${source === s.value ? 'rgba(42,112,80,0.40)' : 'rgba(139,115,85,0.18)'}`,
                      color: source === s.value ? '#2A7050' : '#9A8672',
                    }}>
                    <Icon className="w-3 h-3" /> {isHe ? s.labelHe : s.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linked tactical topics */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>
              {isHe ? 'נושאים טקטיים מקושרים' : 'Linked Tactical Topics'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TACTICAL_TOPICS_HE.map((t, i) => (
                <button key={t} onClick={() => toggleLinkedTopic(t)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: linkedTopics.includes(t) ? 'rgba(42,112,80,0.15)' : 'rgba(139,115,85,0.06)',
                    border: `1px solid ${linkedTopics.includes(t) ? 'rgba(42,112,80,0.40)' : 'rgba(139,115,85,0.15)'}`,
                    color: linkedTopics.includes(t) ? '#2A7050' : '#7A6B57',
                  }}>
                  {isHe ? t : TACTICAL_TOPICS_EN[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>
              {isHe ? `התקדמות: ${progressPct}%` : `Progress: ${progressPct}%`}
            </label>
            <input type="range" min="0" max="100" step="5"
              value={progressPct}
              onChange={e => setProgressPct(Number(e.target.value))}
              className="w-full"
            />
            <input
              className="w-full mt-2 rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
              placeholder={isHe ? 'הסבר קצר על ההתקדמות (אופציונלי)' : 'Short progress note (optional)'}
              value={progressNote}
              onChange={e => setProgressNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(139,115,85,0.15)' }}>
          <Button variant="ghost" onClick={onClose} className="flex-1" style={{ color: '#7A6B57' }}>
            {isHe ? 'ביטול' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1"
            style={{ backgroundColor: '#2A7050', color: '#fff' }}>
            {saving
              ? (isHe ? 'שומר...' : 'Saving...')
              : isNew
                ? (isHe ? '+ הוסף נושא' : '+ Add Topic')
                : (isHe ? '✓ שמור שינויים' : '✓ Save Changes')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}