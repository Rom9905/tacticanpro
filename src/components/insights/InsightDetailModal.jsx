import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomLine from '@/components/ui/BottomLine';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Users, Target, ExternalLink } from 'lucide-react';

export default function InsightDetailModal({ isOpen, onClose, insight }) {
  if (!insight) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl" style={{ color: 'var(--text-primary)' }}>
            פירוט תובנה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bottom Line */}
          {(insight.whatHappened || insight.practicalActions?.length > 0) && (
            <BottomLine
              summary={[
                insight.whatHappened,
                insight.practicalActions?.[0]
              ].filter(Boolean).slice(0, 2)}
              action={insight.howToMeasure ? `מדד הצלחה: ${insight.howToMeasure}` : undefined}
              color="#2A5FA8"
            />
          )}

          {/* What Happened */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              מה קרה
            </h3>
            <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {insight.whatHappened}
            </p>
          </div>

          {/* What Was Good */}
          {insight.whatWasGood && insight.whatWasGood.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--state-good-text)' }}>
                מה היה טוב
              </h3>
              <ul className="space-y-2">
                {insight.whatWasGood.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span style={{ color: 'var(--state-good-text)' }}>•</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What To Improve */}
          {insight.whatToImprove && insight.whatToImprove.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--state-fix-text)' }}>
                מה לשפר
              </h3>
              <ul className="space-y-2">
                {insight.whatToImprove.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span style={{ color: 'var(--state-fix-text)' }}>•</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Involved Players */}
          {insight.involvedPlayers && insight.involvedPlayers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Users className="w-4 h-4" />
                מי היה מעורב
              </h3>
              <div className="flex flex-wrap gap-2">
                {insight.involvedPlayers.map((player) => (
                  <Link key={player.id} to={createPageUrl(`PlayerProfile?id=${player.id}`)}>
                    <Badge 
                      className="cursor-pointer hover:opacity-80"
                      style={{ 
                        backgroundColor: 'var(--state-note-bg)',
                        color: 'var(--state-note-text)',
                        borderColor: 'var(--state-note-border)',
                        border: '1px solid'
                      }}
                    >
                      {player.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Practical Actions */}
          {insight.practicalActions && insight.practicalActions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Target className="w-4 h-4" />
                פעולה מעשית
              </h3>
              <div className="space-y-3">
                {insight.practicalActions.map((action, i) => (
                  <div 
                    key={i} 
                    className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: 'var(--state-note-bg)',
                      borderLeft: '3px solid var(--state-note-border)'
                    }}
                  >
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--state-note-text)' }}>
                      פעולה #{i + 1}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to Measure */}
          {insight.howToMeasure && (
            <div 
              className="p-4 rounded-lg"
              style={{ 
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-default)'
              }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                איך למדוד שיפור
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {insight.howToMeasure}
              </p>
            </div>
          )}

          {/* Related Recording */}
          {insight.recordingId && (
            <Button 
              variant="outline" 
              className="w-full"
              style={{
                color: 'var(--link)',
                borderColor: 'var(--border-strong)'
              }}
            >
              <ExternalLink className="w-4 h-4 ml-2" />
              פתח תיעוד קשור
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}