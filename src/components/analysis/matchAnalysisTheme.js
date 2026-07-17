// Design tokens + keyframes for the Match Analysis redesign (hifi handoff).
// Kept in one place so the page, cards, modal and tabs stay in sync.

export const MA = {
  bgPage: '#EDE9E0',
  bgContainer: '#F6F4EE',
  card: '#FFFFFF',
  surfaceSoft: '#FBFAF6',

  darkHero: 'radial-gradient(120% 180% at 85% -20%, #1B3A28 0%, #0D1A12 55%)',
  darkHeroModal: 'radial-gradient(140% 200% at 50% -40%, #1B3A28 0%, #0D1A12 60%)',
  darkPanel: 'linear-gradient(135deg,#0D1A12,#13241A)',

  greenMain: '#16A34A',
  greenAccent: '#4ADE80',
  successBg: '#E7F6EC',

  warn: '#D97706',
  warnBg: '#FDF3E3',
  danger: '#DC2626',
  dangerBg: '#FCEBEB',

  drawYellow: '#FBBF24',
  lossRed: '#F87171',
  info: '#2563EB',

  cream: '#F4EFE6',
  textPrimary: '#14231A',
  textSecondary: '#5C6B61',
  textMuted: '#94A39A',
  textFaint: '#C8BFB3',

  cardShadow: '0 1px 2px rgba(13,26,18,.05), 0 4px 12px rgba(13,26,18,.06)',
  cardShadowHover: '0 12px 32px rgba(13,26,18,.14)',
  containerShadow: '0 24px 60px rgba(13,26,18,.14)',

  heading: "'Heebo', sans-serif",
  body: "'Assistant', sans-serif",
};

// Result → accent colour + panel gradient used by cards and the scoreboard.
export function resultTheme(result) {
  if (result === 'win') {
    return { accent: MA.greenAccent, panelBg: 'linear-gradient(160deg,#0D1A12,#1B3A28)', label: 'ניצחון', dot: MA.greenAccent };
  }
  if (result === 'draw') {
    return { accent: MA.drawYellow, panelBg: 'linear-gradient(160deg,#241C0A,#4A3B12)', label: 'תיקו', dot: MA.drawYellow };
  }
  if (result === 'loss') {
    return { accent: MA.lossRed, panelBg: 'linear-gradient(160deg,#2A0D0D,#4A1414)', label: 'הפסד', dot: MA.lossRed };
  }
  return { accent: MA.textMuted, panelBg: 'linear-gradient(160deg,#1A1F1C,#2C332E)', label: '—', dot: MA.textMuted };
}

// Heatmap severity ramp: white → orange → deep orange → red.
export function severityCell(intensity) {
  if (intensity >= 0.7) return { bg: 'rgba(220,38,38,.10)', border: 'rgba(220,38,38,.4)', color: MA.danger };
  if (intensity >= 0.3) return { bg: 'rgba(249,115,22,.12)', border: 'rgba(249,115,22,.3)', color: '#EA580C' };
  if (intensity > 0) return { bg: 'rgba(217,119,6,.10)', border: 'rgba(217,119,6,.3)', color: MA.warn };
  return { bg: MA.surfaceSoft, border: 'rgba(13,26,18,0.08)', color: MA.textFaint };
}

export function ratingColor(rating) {
  if (rating >= 8) return MA.greenMain;
  if (rating >= 6) return MA.warn;
  return MA.danger;
}

// Injected once by the page. Class names are `ma-` prefixed to avoid collisions.
export const matchAnalysisStyles = `
  @keyframes maFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes maGrowBar { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes maDrawLine { from { stroke-dashoffset:600; } to { stroke-dashoffset:0; } }
  @keyframes maPulseGlow { 0%,100% { box-shadow:0 0 0 0 rgba(74,222,128,0.35); } 50% { box-shadow:0 0 24px 4px rgba(74,222,128,0.25); } }
  @keyframes maFloaty { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
  @keyframes maSlideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }

  .ma-fade { animation: maFadeUp .5s ease-out both; }
  .ma-bar-fill { transform-origin: right; animation: maGrowBar .9s .2s ease-out both; }
  .ma-line { stroke-dasharray: 600; animation: maDrawLine 1.4s ease-out both; }
  .ma-ring { animation: maDrawLine 1.2s ease-out both; }
  .ma-pulse { animation: maPulseGlow 3s ease-in-out infinite; }
  .ma-floaty { animation: maFloaty 3s ease-in-out infinite; }

  .ma-card-hover { transition: transform .2s ease-out, box-shadow .2s ease-out; }
  .ma-card-hover:hover { transform: translateY(-3px); box-shadow: ${MA.cardShadowHover}; }

  .ma-delete-btn, .ma-row-action { opacity: 0; transition: opacity .15s ease-out; }
  .ma-card-hover:hover .ma-delete-btn,
  .ma-row:hover .ma-row-action { opacity: 1; }
  .ma-delete-btn:focus-visible, .ma-row-action:focus-visible { opacity: 1; }

  .ma-scroll-x { overflow-x: auto; scrollbar-width: thin; }
  .ma-scroll-x::-webkit-scrollbar { height: 4px; }
  .ma-scroll-x::-webkit-scrollbar-thumb { background: rgba(13,26,18,.15); border-radius: 4px; }

  /* Layout primitives — collapse on small screens (handoff 1c) */
  .ma-hero { padding: 28px 32px 0; }
  .ma-hero-title { font-size: 30px; }
  .ma-hero-num { font-size: 34px; }
  .ma-hero-stats { display: flex; gap: 28px; }
  .ma-pad { padding: 24px 32px 32px; }
  .ma-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  .ma-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .ma-grid-split { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
  .ma-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }

  @media (max-width: 900px) {
    .ma-grid-3, .ma-grid-2, .ma-grid-split { grid-template-columns: 1fr; }
    .ma-grid-4 { grid-template-columns: 1fr 1fr; }
  }

  /* Modal: centred dialog on desktop, bottom sheet on phones (handoff 1c) */
  .ma-sheet-handle { display: none; }

  @media (max-width: 430px) {
    .ma-hit { min-height: 44px; }
    .ma-hero { padding: 20px 16px 0; }
    .ma-hero-title { font-size: 22px; }
    .ma-hero-num { font-size: 22px; }
    .ma-hero-stats { flex-wrap: wrap; gap: 12px 20px; }
    .ma-pad { padding: 16px 16px 24px; }

    /* No hover on touch — row actions must be visible, not hover-revealed */
    .ma-delete-btn, .ma-row-action { opacity: 1; }

    /* Modal sizing/positioning is driven by inline styles + useIsMobile in
       MatchAnalysisModal (deterministic across the Radix grid + utility
       classes). Only the sheet handle stays a CSS concern here. */
    .ma-sheet-handle { display: block; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ma-fade, .ma-bar-fill, .ma-line, .ma-ring, .ma-pulse, .ma-floaty, .ma-sheet,
    .ma-card-hover, .ma-card-hover:hover {
      animation: none !important;
      transition: none !important;
      transform: none !important;
      stroke-dashoffset: 0 !important;
    }
  }
`;
