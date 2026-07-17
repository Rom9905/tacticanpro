import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Shield, Target, Calendar, ChevronRight } from 'lucide-react';
import GamePrepForm from './GamePrepForm';
import GamePrepAnalysis from './GamePrepAnalysis';

export default function GamePrepList({ teamId, team, players, onRefresh: _onRefresh, onSelectPrep }) {
  const [preps, setPreps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPrep, setSelectedPrep] = useState(null);

  const loadPreps = async () => {
    setLoading(true);
    const data = await base44.entities.GamePrep.filter({ team_id: teamId }, '-date', 50);
    setPreps(data);
    setLoading(false);
  };

  useEffect(() => { if (teamId) loadPreps(); }, [teamId]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#2A7050' }} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: '#2C2416' }}>{preps.length} הכנות שמורות</p>
        <Button onClick={() => setShowForm(true)} size="sm"
          style={{ backgroundColor: '#2A5FA8', color: '#fff' }}
          className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> הכנה חדשה
        </Button>
      </div>

      {preps.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'rgba(139,115,85,0.06)', border: '1px dashed rgba(139,115,85,0.25)' }}>
          <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8BFB3' }} />
          <p className="text-sm font-medium" style={{ color: '#5C4E38' }}>עוד אין הכנות</p>
          <p className="text-xs mt-1" style={{ color: '#9A8672' }}>לחץ "הכנה חדשה" כדי להתחיל</p>
        </div>
      ) : (
        <div className="space-y-3">
          {preps.map(prep => (
            <PrepCard key={prep.id} prep={prep} onClick={() => onSelectPrep ? onSelectPrep(prep) : setSelectedPrep(prep)} />
          ))}
        </div>
      )}

      {showForm && (
        <GamePrepForm
          teamId={teamId}
          team={team}
          players={players}
          generalPreps={preps.filter(p => p.prep_type === 'general')}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadPreps(); }}
        />
      )}

      {selectedPrep && (
        <GamePrepAnalysis
          prep={selectedPrep}
          players={players}
          onClose={() => setSelectedPrep(null)}
          onUpdated={(updated) => { setSelectedPrep(updated); loadPreps(); }}
        />
      )}
    </div>
  );
}

function PrepCard({ prep, onClick }) {
  const isGeneral = prep.prep_type === 'general';
  return (
    <button onClick={onClick} className="w-full text-right rounded-xl p-4 transition-all hover:shadow-md"
      style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold" style={{ color: '#2C2416' }}>{prep.name}</span>
            <Badge className="text-[10px] px-2 py-0"
              style={{
                backgroundColor: isGeneral ? 'rgba(42,95,168,0.12)' : 'rgba(42,112,80,0.12)',
                color: isGeneral ? '#2A5FA8' : '#2A7050',
                border: `1px solid ${isGeneral ? 'rgba(42,95,168,0.3)' : 'rgba(42,112,80,0.3)'}`,
              }}>
              {isGeneral ? 'הכנה כללית' : 'יריב ספציפי'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {prep.date && (
              <span className="text-xs flex items-center gap-1" style={{ color: '#9A8672' }}>
                <Calendar className="w-3 h-3" />{new Date(prep.date).toLocaleDateString('he-IL')}
              </span>
            )}
            {prep.opponent_formation && (
              <span className="text-xs flex items-center gap-1" style={{ color: '#7A6B57' }}>
                <Target className="w-3 h-3" />{prep.opponent_formation}
              </span>
            )}
            {prep.opponent_attack_style && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(185,64,64,0.08)', color: '#B94040' }}>
                {prep.opponent_attack_style}
              </span>
            )}
          </div>
          {prep.additional_notes && (
            <p className="text-xs mt-1.5 line-clamp-1" style={{ color: '#9A8672' }}>{prep.additional_notes}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {prep.times_used > 0 && (
            <span className="text-xs" style={{ color: '#9A8672' }}>שימוש ×{prep.times_used}</span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: '#C8BFB3' }} />
        </div>
      </div>
    </button>
  );
}