import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function LineupQuickView({ player, position, explanation, isOpen, onClose }) {
  if (!player) return null;
  
  const strengths = player.strengths || [];
  const improvements = player.improvements || [];
  const fitnessStatus = player.fitness_status ?? 85;
  const mentalStatus = player.mental_status ?? 75;
  
  // Get relevant strengths for position
  const positionRelevant = {
    'שוער': ['בניה משוער', 'ריכוז', 'תיקולים'],
    'בלם': ['משחק גב', '1 על 1 הגנתי', 'כותרות', 'מיקום'],
    'מגן ימין': ['צלבות', 'ריצות עומק', '1 על 1 הגנתי', 'מהירות'],
    'מגן שמאל': ['צלבות', 'ריצות עומק', '1 על 1 הגנתי', 'מהירות'],
    'קשר הגנתי': ['תיקולים', 'יירוטים', 'מיקום'],
    'קשר מרכזי': ['מסירות קצרות', 'ראייה', 'החלטות'],
    'קשר התקפי': ['ראייה', 'בעיטות', 'ריצות עומק'],
    'כנף ימין': ['דריבלים', 'צלבות', 'מהירות', '1 על 1 התקפי'],
    'כנף שמאל': ['דריבלים', 'צלבות', 'מהירות', '1 על 1 התקפי'],
    'חלוץ': ['בעיטות', 'משחק גב', 'מיקום']
  };
  
  const relevantTraits = positionRelevant[position] || [];
  const relevantStrengths = strengths.filter(s => relevantTraits.includes(s)).slice(0, 2);
  const relevantWeaknesses = improvements.filter(w => relevantTraits.includes(w)).slice(0, 2);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-default)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>
            {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Position & Role */}
          <div>
            <div className="flex gap-2 mb-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {position}
              </Badge>
              {player.role && (
                <Badge variant="outline" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}>
                  {player.role}
                </Badge>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              עמדה ראשית: {player.position}
              {player.position_secondary && ` | משנית: ${player.position_secondary}`}
            </p>
          </div>
          
          {/* Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>מוכנות פיזית</p>
              <p className="text-lg font-bold" style={{ color: fitnessStatus >= 75 ? 'var(--state-good-text)' : 'var(--state-note-text)' }}>
                {fitnessStatus}%
              </p>
            </div>
            <div className="p-2 rounded" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>מצב מנטלי</p>
              <p className="text-lg font-bold" style={{ color: mentalStatus >= 70 ? 'var(--state-good-text)' : 'var(--state-note-text)' }}>
                {mentalStatus}%
              </p>
            </div>
          </div>
          
          {/* Why Selected */}
          {explanation && explanation.why.length > 0 && (
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--state-good-bg)', border: '1px solid var(--state-good-border)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--state-good-text)' }}>
                למה נבחר:
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {explanation.why.join(' • ')}
              </p>
            </div>
          )}
          
          {/* Strengths */}
          {relevantStrengths.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--state-good-text)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  חוזקות רלוונטיות
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {relevantStrengths.map((s, i) => (
                  <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Weaknesses */}
          {relevantWeaknesses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  נקודות לשיפור
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {relevantWeaknesses.map((w, i) => (
                  <Badge key={i} className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Risks */}
          {explanation && explanation.risks.length > 0 && (
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--state-note-bg)', border: '1px solid var(--state-note-border)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--state-note-text)' }}>
                שים לב:
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {explanation.risks.join(' • ')}
              </p>
            </div>
          )}
          
          {/* Link to Profile */}
          <Link to={createPageUrl('PlayerProfile') + `?id=${player.id}`}>
            <Button variant="outline" className="w-full" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              <ExternalLink className="w-4 h-4 mr-2" />
              פתח פרופיל שחקן
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}