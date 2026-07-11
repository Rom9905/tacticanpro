import React, { useState, useEffect, useRef } from 'react';

function useCountUp(target, duration = 400) {
  const [val, setVal] = useState(0);
  const rafRef = useRef();
  useEffect(() => {
    if (typeof target !== 'number') { setVal(target); return; }
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setVal(target); return; }
    const start = performance.now();
    const animate = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setVal(Math.round(target * t));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

const SEMANTIC_PALETTE = {
  success: { bg: 'var(--success-bg)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', fg: 'var(--warning)' },
  danger:  { bg: 'var(--danger-bg)',  fg: 'var(--danger)' },
  info:    { bg: 'var(--info-bg)',    fg: 'var(--info)' },
};

export default function KPICard({ icon: Icon, label, value, onClick, semantic = 'info', detailLabel, detailLabelMissing }) {
  const c = SEMANTIC_PALETTE[semantic] || SEMANTIC_PALETTE.info;
  const animatedVal = useCountUp(value);
  const display = typeof value === 'number' ? animatedVal : value;
  const clickable = !!onClick;

  return (
    <div
      className={`premium-card p-4 ${clickable ? 'premium-card-clickable' : ''}`}
      style={{ border: '1px solid rgba(13,26,18,.08)' }}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {/* Top row: icon circle + label */}
      <div className="flex items-center gap-2 mb-2">
        <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: '40px', height: '40px', backgroundColor: c.bg }}>
          {Icon && <Icon className="w-5 h-5" style={{ color: c.fg }} />}
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      {/* Big number */}
      <p className="font-bold leading-none mb-2" style={{ fontSize: '40px', fontFamily: 'Heebo, sans-serif', fontWeight: 800, color: 'var(--text-primary)' }}>
        {display}
      </p>
      {/* Action row */}
      {clickable && (
        <p className="text-xs font-semibold flex items-center gap-0.5" style={{ color: 'var(--brand-green-dark)' }}>
          {detailLabel} ←
        </p>
      )}
      {!clickable && detailLabelMissing && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{detailLabelMissing}</p>
      )}
    </div>
  );
}