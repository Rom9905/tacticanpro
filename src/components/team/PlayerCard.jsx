import React from 'react';
import { Edit2, Trash2, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useLang } from '@/lib/LanguageContext';
import { tr, POSITION_MAP, AVAILABILITY_MAP } from '@/lib/hebrewToEnglish';

// ── colour by rating (README design tokens) ──
const ratingColor = (r) => (r >= 7 ? '#16A34A' : r >= 5.5 ? '#D97706' : '#DC2626');

const availabilityStyle = (s) => {
  if (s === 'פצוע') return { bg: '#FCEBEB', color: '#DC2626', border: 'rgba(220,38,38,0.20)' };
  if (s === 'מושעה') return { bg: '#FDF3E3', color: '#D97706', border: 'rgba(217,119,6,0.20)' };
  if (s === 'לא זמין') return { bg: 'rgba(139,115,85,0.10)', color: '#7A6B57', border: 'rgba(139,115,85,0.25)' };
  return { bg: '#E7F6EC', color: '#16A34A', border: 'rgba(22,163,74,0.28)' };
};

const trendInfo = (status) => {
  if (status === 'בהתקדמות') return { label: 'בהתקדמות', color: '#16A34A', Icon: TrendingUp };
  if (status === 'בירידה') return { label: 'בירידה', color: '#DC2626', Icon: TrendingDown };
  return { label: 'יציב', color: '#2563EB', Icon: Minus };
};

export default function PlayerCard({ player, onEdit, onDelete, rating = null }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const tVal = (map, val) => (isHe ? val : tr(map, val));

  const hasRating = typeof rating === 'number' && !isNaN(rating);
  const ratingText = hasRating ? rating.toFixed(1) : '—';
  const rColor = hasRating ? ratingColor(rating) : 'rgba(13,26,18,0.20)';
  const ringOffset = hasRating ? (144.5 * (1 - rating / 10)).toFixed(1) : 144.5;

  const avail = availabilityStyle(player.availability || player.status);
  const trend = trendInfo(player.professional_status || 'יציב');
  const TrendIcon = trend.Icon;

  const goProfile = () => { window.location.href = createPageUrl(`PlayerProfile?id=${player.id}`); };

  return (
    <div
      onClick={goProfile}
      className="premium-card premium-card-clickable group"
      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}
    >
      {/* Avatar — photo with rating badge, or rating ring as fallback */}
      {player.photo_url ? (
        <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
          <img
            src={player.photo_url}
            alt={player.name}
            style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(13,26,18,0.10)' }}
          />
          <span
            style={{
              position: 'absolute', bottom: -6, insetInlineStart: -6, minWidth: 22, height: 20, padding: '0 5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#0D1A12', color: hasRating ? ratingColor(rating) : 'rgba(244,239,230,0.55)',
              borderRadius: 8, fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 12,
              border: '2px solid #FFFFFF',
            }}
          >
            {ratingText}
          </span>
        </div>
      ) : (
        <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
          <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="26" cy="26" r="23" fill="none" stroke="rgba(13,26,18,0.08)" strokeWidth="4" />
            <circle
              cx="26" cy="26" r="23" fill="none" stroke={rColor} strokeWidth="4" strokeLinecap="round"
              strokeDasharray="144.5" strokeDashoffset={ringOffset}
              style={{ animation: 'ringIn 1s ease-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 16, color: '#14231A' }}>
            {ratingText}
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 15, color: '#14231A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.name}
          </span>
          {player.is_starter && <Star className="w-3.5 h-3.5" style={{ color: '#D9A400', fill: '#D9A400' }} />}
        </div>
        <div style={{ fontSize: 12.5, color: '#5C6B61', marginTop: 1 }}>
          {tVal(POSITION_MAP, player.position)}{player.number ? ` · #${player.number}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 12, color: '#5C6B61' }}>
          <span><b style={{ color: '#14231A' }}>{player.season_goals || 0}</b> {isHe ? 'גולים' : 'goals'}</span>
          <span><b style={{ color: '#14231A' }}>{player.season_assists || 0}</b> {isHe ? 'בישולים' : 'assists'}</span>
        </div>
      </div>

      {/* Status + trend + hover actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <span style={{ background: avail.bg, color: avail.color, border: `1px solid ${avail.border}`, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 999 }}>
          {tVal(AVAILABILITY_MAP, player.availability || player.status || 'זמין')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: trend.color, fontSize: 12 }}>
          <TrendIcon className="w-3 h-3" /> {trend.label}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(player); }}
            className="p-1 rounded hover:bg-black/5" style={{ color: '#94A39A' }} title={isHe ? 'עריכה' : 'Edit'}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(player); }}
            className="p-1 rounded hover:bg-red-500/10" style={{ color: '#94A39A' }} title={isHe ? 'מחיקה' : 'Delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
