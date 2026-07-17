import React, { useState } from 'react';
import { ChevronLeft, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { MA, resultTheme } from './matchAnalysisTheme';

function possessionTheme(p) {
  if (p >= 55) return { bg: `linear-gradient(90deg,${MA.greenMain},${MA.greenAccent})`, color: MA.greenMain };
  if (p >= 45) return { bg: `linear-gradient(90deg,${MA.warn},${MA.drawYellow})`, color: MA.warn };
  return { bg: `linear-gradient(90deg,${MA.danger},${MA.lossRed})`, color: MA.danger };
}

const chipBase = {
  fontSize: 11, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap',
};

export default function MatchReportCard({ analysis, onClick, onDelete, index = 0 }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isMobile = useIsMobile();

  const handleDeleteClick = (e) => { e.stopPropagation(); setConfirmDelete(true); };
  const handleConfirmDelete = async (e) => {
    e.stopPropagation();
    if (!onDelete || deleting) return;
    setDeleting(true);
    await onDelete(analysis);
    setDeleting(false);
    setConfirmDelete(false);
  };
  const handleCancelDelete = (e) => { e.stopPropagation(); setConfirmDelete(false); };

  const ourScore = analysis._summary?.result_our ?? analysis.result?.our_score ?? null;
  const oppScore = analysis._summary?.result_opponent ?? analysis.result?.opponent_score ?? null;
  const hasScore = ourScore != null && oppScore != null;

  const result = !hasScore ? null : ourScore > oppScore ? 'win' : ourScore < oppScore ? 'loss' : 'draw';
  const theme = resultTheme(result);

  // Possession is optional — the card must degrade gracefully without it.
  const possession = analysis.stats?.possession;
  const hasPossession = possession != null && !Number.isNaN(Number(possession));
  const possTheme = hasPossession ? possessionTheme(Number(possession)) : null;

  const tag = analysis._summary?.tactical_topics?.[0] || null;
  const issue = analysis._summary?.issues_found
    || analysis.report?.issues?.[0]
    || analysis.tactical_problems?.[0]?.text
    || null;

  const metaParts = [];
  if (analysis.date) metaParts.push(format(new Date(analysis.date), 'd בMMM', { locale: he }));
  if (analysis.location) metaParts.push(analysis.location);

  return (
    <div
      onClick={onClick}
      className="ma-fade ma-card-hover"
      style={{
        position: 'relative', display: 'flex', alignItems: 'stretch', background: MA.card,
        flexDirection: isMobile ? 'column' : 'row',
        borderRadius: 16, boxShadow: MA.cardShadow, overflow: 'hidden', cursor: 'pointer',
        animationDelay: `${Math.min(index, 8) * 80}ms`,
      }}
    >
      {/* Result panel — side column on desktop, top strip on phones */}
      <div style={{
        background: theme.panelBg, display: 'flex', flexShrink: 0,
        ...(isMobile
          ? { flexDirection: 'row', alignItems: 'center', gap: 10, padding: '10px 14px' }
          : { width: 110, minWidth: 110, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 6px' }),
      }}>
        <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: theme.accent, fontFamily: MA.heading, lineHeight: 1 }}>
          {hasScore ? `${ourScore}–${oppScore}` : '—'}
        </div>
        {hasScore && (
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#0D1A12',
            background: theme.accent, borderRadius: 9999, padding: '2px 10px',
          }}>
            {theme.label}
          </span>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, padding: isMobile ? '12px 14px 14px' : '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, fontFamily: MA.heading, color: MA.textPrimary }}>
            מול {analysis.opponent}
          </h3>
          {metaParts.length > 0 && (
            <span style={{ fontSize: 12, color: MA.textMuted }}>{metaParts.join(' · ')}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {hasPossession ? (
            <>
              <span style={{ fontSize: 11, color: MA.textMuted, width: 44 }}>שליטה</span>
              <div style={{ flex: 1, maxWidth: 220, minWidth: 80, height: 6, borderRadius: 9999, background: 'rgba(13,26,18,.07)', overflow: 'hidden' }}>
                <div className="ma-bar-fill" style={{ width: `${possession}%`, height: '100%', borderRadius: 9999, background: possTheme.bg }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: possTheme.color, fontFamily: MA.heading }}>
                {possession}%
              </span>
            </>
          ) : (
            <span style={{ ...chipBase, background: 'rgba(13,26,18,.04)', color: MA.textMuted, border: '1px dashed rgba(13,26,18,.15)' }}>
              ניתוח ללא נתוני שליטה
            </span>
          )}

          {tag && (
            <span style={{ ...chipBase, background: 'rgba(13,26,18,.05)', color: MA.textSecondary, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tag}
            </span>
          )}
          {issue && (
            <span style={{ ...chipBase, background: MA.dangerBg, color: MA.danger, display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <AlertTriangle style={{ width: 11, height: 11, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue}</span>
            </span>
          )}
        </div>
      </div>

      {/* Chevron — the full card is tappable, so the hint is desktop-only */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 18, color: MA.textMuted }}>
          <ChevronLeft className="w-5 h-5" />
        </div>
      )}

      {/* Delete — revealed on hover of the row wrapper */}
      {onDelete && (
        <div style={{ position: 'absolute', top: 10, left: 10 }}
          onClick={(e) => e.stopPropagation()}>
          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={handleCancelDelete}
                style={{ ...chipBase, border: 'none', cursor: 'pointer', fontWeight: 600, background: 'rgba(13,26,18,0.06)', color: MA.textSecondary }}>
                ביטול
              </button>
              <button onClick={handleConfirmDelete} disabled={deleting}
                style={{ ...chipBase, border: 'none', cursor: 'pointer', fontWeight: 600, background: MA.dangerBg, color: MA.danger, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                מחיקה
              </button>
            </div>
          ) : (
            <button onClick={handleDeleteClick} title="מחק משחק"
              className="ma-delete-btn"
              style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: MA.dangerBg, color: MA.danger, display: 'flex' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
