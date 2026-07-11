import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, MinusCircle, Star, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/LanguageContext';

const improvementColors = {
  yes: { active: 'rgba(42,112,80,0.15)', border: 'rgba(42,112,80,0.4)', text: '#2A7050' },
  partly: { active: 'rgba(180,140,30,0.15)', border: 'rgba(180,140,30,0.4)', text: '#9A6A10' },
  no: { active: 'rgba(180,50,50,0.15)', border: 'rgba(180,50,50,0.4)', text: '#B94040' },
};

export default function EventSummaryModal({ open, onClose, event, onSaved }) {
  const { t, dir } = useLang();
  const es = t.eventSummary;

  const [worked, setWorked] = useState([]);
  const [notWorked, setNotWorked] = useState([]);
  const [mainIssueImproved, setMainIssueImproved] = useState('');
  const [satisfaction, setSatisfaction] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setWorked([]); setNotWorked([]); setMainIssueImproved(''); setSatisfaction(0); }
  }, [open]);

  const toggleWorked = (o) => setWorked(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  const toggleNotWorked = (o) => setNotWorked(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);

  const handleSave = async () => {
    if (!event) return;
    setSaving(true);
    try {
      await base44.entities.GameSchedule.update(event.id, {
        status: 'completed',
        notes: JSON.stringify({
          ...(event.parsedNotes || {}),
          summary: { worked, notWorked, mainIssueImproved, satisfaction },
        }),
      });
      onSaved && onSaved();
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (!open) return null;

  const isTraining = event?.parsedNotes?.type === 'training';
  const eventLabel = isTraining ? es.training : `${es.matchVs} ${event?.opponent || ''}`;

  const improvementOptions = [
    { key: 'yes', label: es.yes, colors: improvementColors.yes },
    { key: 'partly', label: es.partly, colors: improvementColors.partly },
    { key: 'no', label: es.no, colors: improvementColors.no },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} dir={dir}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: '#2C2416' }}>{es.titlePrefix} {eventLabel}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:opacity-70"
            style={{ backgroundColor: 'rgba(139,115,85,0.12)', color: '#7A6B57' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* What worked */}
          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#2A7050' }}>
              <CheckCircle2 className="w-4 h-4" /> {es.whatWorked}
            </label>
            <div className="flex flex-wrap gap-2">
              {es.workedOptions.map(o => (
                <button key={o} onClick={() => toggleWorked(o)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: worked.includes(o) ? 'rgba(42,112,80,0.15)' : 'rgba(139,115,85,0.06)',
                    border: `1.5px solid ${worked.includes(o) ? 'rgba(42,112,80,0.4)' : 'rgba(139,115,85,0.18)'}`,
                    color: worked.includes(o) ? '#2A7050' : '#7A6B57',
                  }}>{o}</button>
              ))}
            </div>
          </div>

          {/* What didn't work */}
          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#B94040' }}>
              <XCircle className="w-4 h-4" /> {es.whatDidntWork}
            </label>
            <div className="flex flex-wrap gap-2">
              {es.notWorkedOptions.map(o => (
                <button key={o} onClick={() => toggleNotWorked(o)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: notWorked.includes(o) ? 'rgba(180,50,50,0.12)' : 'rgba(139,115,85,0.06)',
                    border: `1.5px solid ${notWorked.includes(o) ? 'rgba(180,50,50,0.4)' : 'rgba(139,115,85,0.18)'}`,
                    color: notWorked.includes(o) ? '#B94040' : '#7A6B57',
                  }}>{o}</button>
              ))}
            </div>
          </div>

          {/* Main issue improved */}
          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#5C4E38' }}>
              <MinusCircle className="w-4 h-4" /> {es.mainIssueImproved}
            </label>
            <div className="flex gap-2">
              {improvementOptions.map(({ key, label, colors }) => {
                const isActive = mainIssueImproved === key;
                return (
                  <button key={key} onClick={() => setMainIssueImproved(key)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? colors.active : 'rgba(139,115,85,0.06)',
                      border: `1.5px solid ${isActive ? colors.border : 'rgba(139,115,85,0.18)'}`,
                      color: isActive ? colors.text : '#7A6B57',
                    }}>{label}</button>
                );
              })}
            </div>
          </div>

          {/* Satisfaction */}
          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#5C4E38' }}>
              <Star className="w-4 h-4" /> {es.satisfaction}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setSatisfaction(n)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{
                    backgroundColor: satisfaction === n ? 'rgba(42,112,80,0.18)' : 'rgba(139,115,85,0.06)',
                    border: `1.5px solid ${satisfaction === n ? 'rgba(42,112,80,0.45)' : 'rgba(139,115,85,0.18)'}`,
                    color: satisfaction === n ? '#2A7050' : '#9A8672',
                  }}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1" style={{ color: '#7A6B57' }}>{es.skip}</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1"
            style={{ backgroundColor: '#2A7050', color: '#fff' }}>
            {saving ? es.saving : es.save}
          </Button>
        </div>
      </div>
    </div>
  );
}