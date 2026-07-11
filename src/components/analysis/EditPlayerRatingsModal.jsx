import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Save, Star } from 'lucide-react';

export default function EditPlayerRatingsModal({ open, onClose, analysis, onSave }) {
  const [ratings, setRatings] = useState([]);
  const [playerNames, setPlayerNames] = useState({}); // id -> name
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && analysis) {
      const initialRatings = analysis.player_ratings || [];

      // Always load players to resolve names
      if (analysis.team_id) {
        base44.entities.Player.filter({ team_id: analysis.team_id }).then(players => {
          const nameMap = {};
          players.forEach(p => { nameMap[p.id] = p.name; });
          setPlayerNames(nameMap);

          // Fix ratings: ensure player_name is set, and if note = player name (legacy), clear it
          // Also: treat rating=null AND no explicit did_not_play=false as DNP (legacy records)
          const fixed = initialRatings.map(r => {
            const isDnp = !!r.did_not_play || (r.rating == null && r.did_not_play !== false);
            const resolvedName = r.player_name || nameMap[r.player_id] || r.note || '';
            const isNoteActuallyName = !isDnp && r.note && (r.note === nameMap[r.player_id] || r.note === r.player_name);
            return {
              ...r,
              player_name: resolvedName,
              note: isNoteActuallyName ? '' : (r.note || ''),
              did_not_play: isDnp,
              rating: isDnp ? 5 : (r.rating ?? 5),
            };
          });
          setRatings(fixed);
        });
      } else {
        setRatings(initialRatings);
      }
    }
  }, [open, analysis]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Clean ratings before saving: keep only DB fields
      const cleanedRatings = ratings.map(r => ({
        player_id: r.player_id,
        player_name: r.player_name || '',
        rating: r.did_not_play ? null : (r.rating || null),
        note: r.did_not_play ? '' : (r.note || ''),
        did_not_play: !!r.did_not_play,
      }));
      await base44.entities.MatchAnalysis.update(analysis.id, {
        player_ratings: cleanedRatings
      });
      onSave && onSave(cleanedRatings);
    } catch (error) {
      console.error('Error saving ratings:', error);
    }
    setLoading(false);
  };

  const updateRating = (index, field, value) => {
    setRatings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const toggleDidNotPlay = (index) => {
    setRatings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], did_not_play: !next[index].did_not_play };
      return next;
    });
  };

  const getColorByRating = (rating) => {
    if (rating >= 8) return { bg: 'rgba(42,112,80,0.12)', text: '#2A7050', border: 'rgba(42,112,80,0.25)' };
    if (rating >= 6) return { bg: 'rgba(217,119,6,0.12)', text: '#D97706', border: 'rgba(217,119,6,0.25)' };
    return { bg: 'rgba(185,64,64,0.12)', text: '#B94040', border: 'rgba(185,64,64,0.25)' };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        dir="rtl"
        className="max-w-3xl max-h-[85vh] overflow-hidden"
        style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.22)' }}
      >
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2" style={{ color: '#2C2416' }}>
            <Star className="w-5 h-5" style={{ color: '#D97706' }} />
            עריכת ציוני שחקנים והערות מאמן
          </DialogTitle>
          <p className="text-xs mt-1" style={{ color: '#9A8672' }}>
            שנה ציונים והוסף/ערוך הערות אישיות על כל שחקן מהמשחק
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-200px)] space-y-2 px-1">
          {ratings.map((rating, index) => {
            const dnp = rating.did_not_play;
            const colors = dnp
              ? { bg: 'rgba(139,115,85,0.06)', text: '#9A8672', border: 'rgba(139,115,85,0.15)' }
              : getColorByRating(rating.rating);

            // Resolve display name
            const displayName = rating.player_name
              || playerNames[rating.player_id]
              || rating.player_id
              || '—';

            return (
              <div
                key={index}
                className="p-3 rounded-lg space-y-2"
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  opacity: dnp ? 0.65 : 1
                }}
              >
                <div className="flex items-center justify-between">
                  {/* Player name — read only */}
                  <span className="text-sm font-semibold" style={{ color: '#2C2416' }}>
                    {displayName}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2" style={{ opacity: dnp ? 0.4 : 1 }}>
                      <span className="text-xs" style={{ color: '#7A6B57' }}>ציון:</span>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={rating.rating}
                        onChange={(e) => updateRating(index, 'rating', parseInt(e.target.value) || 1)}
                        disabled={dnp}
                        className="w-14 text-center text-sm font-bold"
                        style={{
                          backgroundColor: '#FAF7F2',
                          borderColor: colors.border,
                          color: colors.text
                        }}
                      />
                      <span className="text-xs" style={{ color: '#9A8672' }}>/10</span>
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!dnp}
                        onChange={() => toggleDidNotPlay(index)}
                        className="w-3 h-3 rounded cursor-pointer"
                        style={{ accentColor: '#9A8672' }}
                      />
                      <span className="text-xs" style={{ color: '#9A8672' }}>לא שיחק</span>
                    </label>
                  </div>
                </div>
                {/* Note field — editable only when played */}
                {!dnp && (
                  <Input
                    placeholder="הוסף הערת מאמן (למשל: 'שמר על מבנה מצוין', 'איבד ריכוז בדקה 60')"
                    value={rating.note || ''}
                    onChange={(e) => updateRating(index, 'note', e.target.value)}
                    className="text-xs"
                    style={{
                      backgroundColor: '#FAF7F2',
                      borderColor: 'rgba(139,115,85,0.22)',
                      color: '#5C4E38'
                    }}
                  />
                )}
                {dnp && (
                  <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(139,115,85,0.08)', color: '#9A8672' }}>
                    לא שיחק — הציון לא ייכלל בחישובים
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid rgba(139,115,85,0.18)' }}>
          <Button variant="outline" onClick={onClose} style={{ borderColor: 'rgba(139,115,85,0.28)' }}>
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            style={{ backgroundColor: '#2A7050', color: '#fff' }}
          >
            {loading ? <>שומר...</> : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמור שינויים
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}