import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildGameStyleContext } from '@/hooks/useGameStyle';

export default function BottomLine({ dataForAI, context, staticInsight, color = 'var(--brand-green-dark)', collapsible = true, cacheKey, gameStyle, gameStyleNotes, variant = 'light' }) {
  const [insight, setInsight] = useState(staticInsight || null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const cacheRef = useRef({});

  useEffect(() => {
    if (staticInsight) {
      setInsight(staticInsight);
      return;
    }
    if (!dataForAI || !context) return;

    const key = cacheKey || JSON.stringify({ context, data: dataForAI }).slice(0, 200);
    if (cacheRef.current[key]) {
      setInsight(cacheRef.current[key]);
      return;
    }
    try {
      const stored = localStorage.getItem(`bl_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        cacheRef.current[key] = parsed;
        setInsight(parsed);
        return;
      }
    } catch (e) {}

    generateInsight(key);
  }, [cacheKey, staticInsight]);

  const generateInsight = async (key) => {
    setLoading(true);
    try {
      const gameStyleCtx = buildGameStyleContext(gameStyle, gameStyleNotes);
      const prompt = `אתה מנתח מקצועי בכדורגל. תפקידך: לחלץ תובנה מקצועית אמיתית מנתוני ${context}.

הנתונים:
${JSON.stringify(dataForAI, null, 2).slice(0, 2000)}${gameStyleCtx}

הנחיות קריטיות:
- כתוב תובנה אחת בלבד — משפט יחיד (עד 35 מילים)
- זהה קשר בין נתונים, לא חזרה עליהם
- הצג מסקנה שהמאמן לא רואה ישירות מהנתונים
- היה ספציפי ומקצועי, לא כללי
- אם יש שיטת משחק מוגדרת ויש פער בין השיטה לנתונים — התחל ב"על בסיס שיטת המשחק שהגדרת —"
- לדוגמה: אל תכתוב "יש בעיה בהגנה" — כתוב "רוב השערים שספגה הקבוצה הגיעו לאחר מסירות ארוכות שנכשלו, מה שמצביע על בעיה בהגנה על חלל הגב"
- עברית בלבד`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            insight: { type: 'string' },
            action: { type: 'string' }
          }
        }
      });

      if (result?.__ai_error) {
        setInsight({ insight: result.__ai_error, isError: true });
      } else {
        const text = result?.insight || '';
        if (text) {
          const cached = { insight: text, action: result?.action };
          cacheRef.current[key] = cached;
          setInsight(cached);
          try { localStorage.setItem(`bl_${key}`, JSON.stringify(cached)); } catch (e) {}
        }
      }
    } catch (e) {
      console.error('BottomLine AI error:', e);
    }
    setLoading(false);
  };

  if (!loading && !insight) return null;

  const insightText = typeof insight === 'string' ? insight : insight?.insight;
  const actionText = typeof insight === 'object' ? insight?.action : null;

  // Dark hero treatment used by the Match Analysis redesign.
  if (variant === 'dark') {
    return (
      <div style={{
        position: 'relative', borderRadius: 16, padding: '20px 22px',
        background: 'linear-gradient(135deg,#0D1A12,#13241A)',
        border: '1px solid rgba(74,222,128,.25)', overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{
          position: 'absolute', top: -30, insetInlineStart: -30, width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(74,222,128,.25),transparent 70%)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Lightbulb className="w-4 h-4 ma-floaty" style={{ color: '#4ADE80' }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: '#4ADE80' }}>השורה התחתונה</span>
        </div>
        {loading ? (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4ADE80' }} />
            <span style={{ fontSize: 13, color: 'rgba(244,239,230,.6)' }}>מנתח נתונים...</span>
          </div>
        ) : (
          <>
            <p style={{
              position: 'relative', margin: 0, fontSize: 17, fontWeight: 600, lineHeight: 1.65,
              color: insight?.isError ? '#FBBF24' : '#F4EFE6', fontFamily: "'Heebo', sans-serif",
            }}>
              {insight?.isError ? '⚠ ' : ''}{insightText}
            </p>
            {actionText && (
              <p style={{
                position: 'relative', margin: '12px 0 0', paddingTop: 10, fontSize: 13, fontWeight: 600,
                color: '#4ADE80', borderTop: '1px solid rgba(74,222,128,.2)',
              }}>
                ➜ {actionText}
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{ backgroundColor: 'var(--success-bg)', borderRight: '4px solid var(--brand-green)', border: '1px solid rgba(22,163,74,0.18)' }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-right"
        onClick={() => collapsible && setOpen(o => !o)}
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 flex-shrink-0" style={{ color }} />
          <span className="text-sm font-bold" style={{ color: 'var(--brand-green-dark)' }}>השורה התחתונה</span>
        </div>
        {collapsible && !loading && (
          open
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--brand-green-dark)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--brand-green-dark)' }} />
        )}
      </button>

      {/* Content */}
      {open && (
        <div className="px-4 pb-3">
          {loading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--brand-green-dark)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>מנתח נתונים...</span>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed" style={{ color: insight?.isError ? 'var(--warning)' : 'var(--text-primary)' }}>
                <span className="font-semibold" style={{ color: insight?.isError ? 'var(--warning)' : 'var(--brand-green-dark)' }}>
                  {insight?.isError ? '⚠ ' : '⬤ '}
                </span>
                {insightText}
              </p>
              {actionText && (
                <p className="text-xs font-semibold mt-2 pt-2" style={{ color: 'var(--brand-green-dark)', borderTop: '1px solid rgba(22,163,74,0.15)' }}>
                  ➜ {actionText}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}