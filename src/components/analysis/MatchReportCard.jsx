import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, Target, Shield, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function MatchReportCard({ analysis, onClick, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async (e) => {
    e.stopPropagation();
    if (!onDelete || deleting) return;
    setDeleting(true);
    await onDelete(analysis);
    setDeleting(false);
    setConfirmDelete(false);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };
  const ourScore = analysis.result?.our_score || 0;
  const oppScore = analysis.result?.opponent_score || 0;
  
  const result = ourScore > oppScore ? 'win' : ourScore < oppScore ? 'loss' : 'draw';
  const resultColors = {
    win: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    loss: 'bg-red-500/10 text-red-600 border-red-500/30',
    draw: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  };
  const resultText = {
    win: 'ניצחון',
    loss: 'הפסד',
    draw: 'תיקו',
  };

  return (
    <Card 
      className="premium-card premium-card-clickable border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Score */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--success-bg)' }}>
                  <Shield className="w-5 h-5" style={{ color: 'var(--brand-green-dark)' }} />
                </div>
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Heebo, sans-serif', fontWeight: 800 }}>
                {ourScore} - {oppScore}
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--danger-bg)' }}>
                  <Target className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="mr-4">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>מול {analysis.opponent}</h3>
              <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {analysis.date && format(new Date(analysis.date), 'd בMMM yyyy', { locale: he })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className={resultColors[result]}>
              {resultText[result]}
            </Badge>
            
            {/* Quick Stats */}
            {analysis.stats && (
              <div className="hidden md:flex items-center gap-3 text-sm">
                {analysis.stats.possession !== undefined && (
                  <div className="text-center px-3 py-1 rounded" style={{ backgroundColor: 'var(--bg-card-soft)' }}>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{analysis.stats.possession}%</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>שליטה</div>
                  </div>
                )}
                {analysis.stats.shots !== undefined && (
                  <div className="text-center px-3 py-1 rounded" style={{ backgroundColor: 'var(--bg-card-soft)' }}>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{analysis.stats.shots}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>בעיטות</div>
                  </div>
                )}
              </div>
            )}

            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:-translate-x-1 transition-all" />
          </div>
        </div>

        {/* Delete button — hover */}
        {onDelete && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCancelDelete}
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: 'rgba(13,26,18,0.06)', color: 'var(--text-secondary)' }}
                >
                  ביטול
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                  style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  מחיקה
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteClick}
                className="p-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
                title="מחק משחק"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Summary / Issues Preview */}
        {(analysis._summary?.issues_found || analysis.report?.summary) && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-3">
            {analysis._summary?.issues_found && (
              <p className="text-xs line-clamp-1 flex-1" style={{ color: 'var(--danger)' }}>
                ⚠ {analysis._summary.issues_found}
              </p>
            )}
            {analysis._summary?.tactical_topics?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {analysis._summary.tactical_topics.slice(0, 3).map(t => (
                  <span key={t} className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(13,26,18,0.06)', color: 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
            )}
            {!analysis._summary && analysis.report?.summary && (
              <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{analysis.report.summary}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}