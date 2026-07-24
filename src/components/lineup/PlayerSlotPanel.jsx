import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { motion } from 'framer-motion';

const skillPct = (p) => {
  const vals = p?.skill_ratings ? Object.values(p.skill_ratings) : [];
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20);
};

export default function PlayerSlotPanel({ player, onClose, onRemove, onReplace }) {
  if (!player) return null;

  const pct = skillPct(player);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(13,26,18,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 16, boxShadow: 'var(--shadow-modal)',
          padding: 20, width: 'min(360px, 92vw)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, flex: 'none', borderRadius: '50%', overflow: 'hidden',
            background: 'linear-gradient(180deg,#16281C,#0D1A12)', border: '2.5px solid #4ADE80',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 17, color: '#4ADE80' }}>
                {player.number || '?'}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 16, color: '#14231A' }}>{player.name}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5C6B61' }}>
              {player.position}{pct !== null ? ` · כושר ${pct}%` : ''}
            </div>
          </div>
        </div>

        {/* Strengths */}
        {player.strengths?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {player.strengths.slice(0, 3).map((strength, i) => (
              <span key={i} style={{ fontSize: 11.5, fontWeight: 700, color: '#16A34A', background: '#E7F6EC', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 9999, padding: '3px 10px' }}>
                {strength}
              </span>
            ))}
          </div>
        )}

        <Link
          to={createPageUrl(`PlayerProfile?id=${player.id}`)}
          style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 700, color: '#16A34A', marginBottom: 14 }}
        >
          פרופיל שחקן מלא
        </Link>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onRemove}
            style={{ flex: 1, border: '1px solid rgba(220,38,38,0.3)', background: '#FCEBEB', color: '#DC2626', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '9px 0', cursor: 'pointer' }}
          >
            הסר מההרכב
          </button>
          <button
            onClick={onReplace}
            style={{ flex: 1, border: 'none', background: '#0D1A12', color: '#4ADE80', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '9px 0', cursor: 'pointer' }}
          >
            החלף שחקן
          </button>
          <button
            onClick={onClose}
            style={{ border: '1px solid rgba(13,26,18,0.14)', background: '#FFFFFF', color: '#5C6B61', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}
          >
            סגור
          </button>
        </div>
      </motion.div>
    </div>
  );
}
