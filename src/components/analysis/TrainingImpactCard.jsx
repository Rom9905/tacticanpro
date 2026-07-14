import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dumbbell, CheckCircle2, AlertCircle, HelpCircle, Loader2, Sparkles } from 'lucide-react';
import { computeTrainingImpact } from '@/lib/trendsEngine';

// Shows whether issues trained on since the previous match actually improved in this match.
// Self-loading: fetches trainings, goals and match history for the analysis' team.
export default function TrainingImpactCard({ analysis }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiVerdict, setAiVerdict] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!analysis?.team_id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [allAnalyses, summaries, goals] = await Promise.all([
        base44.entities.MatchAnalysis.filter({ team_id: analysis.team_id }, '-date', 50),
        base44.entities.ProfessionalSummary.filter({ team_id: analysis.team_id, event_type: 'training' }, '-event_date', 60),
        base44.entities.TacticalGoal.filter({ team_id: analysis.team_id, status: 'active' }, '-created_date', 100),
      ]);
      if (cancelled) return;
      setImpact(computeTrainingImpact({ analysis, allAnalyses, trainingSummaries: summaries, goals }));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [analysis?.id]);

  const generateAiVerdict = async () => {
    setAiLoading(true);
    const itemLines = impact.items.map(it =>
      `נושא: "${it.goal.title}" (${it.topics.join(', ')}) — עבדתם עליו ב-${it.trainingCount} אימונים. במשחק הזה: ${it.verdict === 'improved' ? 'הבעיה לא הופיעה' : it.verdict === 'still_present' ? `הבעיה עדיין קיימת ("${it.evidence}")` : 'לא ברור'}`
    ).join('\n');

    const prompt = `אתה מנטור בכיר. המאמן עבד באימונים על נושאים ספציפיים בין המשחק הקודם למשחק הזה (מול ${analysis.opponent}).
${impact.prevMatch ? `המשחק הקודם: מול ${impact.prevMatch.opponent}.` : ''}
אימונים בתקופה: ${impact.trainings.length}.

מה שנעבד והתוצאה במשחק:
${itemLines}

צור פסקה קצרה (2-4 משפטים) שסוגרת את הלולאה למאמן: תגיד לו במפורש מה מהעבודה באימונים השתלם במשחק ומה עדיין דורש עבודה. ישיר וחם, כמו מנטור. אם משהו השתפר — תן קרדיט אמיתי. עברית בלבד.
(JSON): {"verdict": "הפסקה"}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: 'object', properties: { verdict: { type: 'string' } } },
    });
    if (!result?.__ai_error && result?.verdict) {
      setAiVerdict(result.verdict);
      // Persist verdict + progress on the goals
      for (const it of impact.items) {
        const note = it.verdict === 'improved'
          ? `שיפור נצפה במשחק מול ${analysis.opponent} (${new Date(analysis.date).toLocaleDateString('he-IL')}) אחרי ${it.trainingCount} אימונים`
          : `עדיין נצפה במשחק מול ${analysis.opponent} (${new Date(analysis.date).toLocaleDateString('he-IL')})`;
        const bump = it.verdict === 'improved' ? 25 : -10;
        const newPct = Math.max(0, Math.min(90, (it.goal.progress_pct || 0) + bump));
        try {
          await base44.entities.TacticalGoal.update(it.goal.id, { progress_note: note, progress_pct: newPct, last_seen_date: analysis.date });
        } catch { /* non-critical */ }
      }
    }
    setAiLoading(false);
  };

  if (loading) {
    return (
      <div style={{ borderRadius: 14, padding: 18, background: '#fff', border: '1px solid rgba(13,26,18,.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#16A34A' }} />
        <p style={{ margin: 0, fontSize: 12, color: '#5C6B61' }}>בודק השפעת אימונים...</p>
      </div>
    );
  }

  if (!impact || !impact.trainings.length) return null; // no trainings in window — nothing to show
  if (!impact.items.length) {
    return (
      <div style={{ borderRadius: 14, padding: 18, background: '#fff', border: '1px solid rgba(13,26,18,.08)' }} dir="rtl">
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#14231A', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dumbbell className="w-4 h-4" style={{ color: '#D97706' }} /> השפעת האימונים
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94A39A' }}>
          היו {impact.trainings.length} אימונים לפני המשחק, אבל הנושאים שנעבדו לא מקושרים לבעיות פתוחות — קשר נושאים טקטיים לסיכומי האימונים כדי לסגור את הלולאה
        </p>
      </div>
    );
  }

  const VERDICT_UI = {
    improved: { icon: CheckCircle2, color: '#16A34A', bg: '#E7F6EC', label: 'השתפר' },
    still_present: { icon: AlertCircle, color: '#DC2626', bg: '#FCEBEB', label: 'עדיין קיים' },
    unknown: { icon: HelpCircle, color: '#D97706', bg: '#FDF3E3', label: 'לא חד-משמעי' },
  };

  return (
    <div style={{ borderRadius: 14, padding: 18, background: '#fff', border: '1px solid rgba(22,163,74,.25)' }} dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#14231A', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dumbbell className="w-4 h-4" style={{ color: '#16A34A' }} />
          השפעת האימונים · {impact.trainings.length} אימונים מאז {impact.prevMatch ? `המשחק מול ${impact.prevMatch.opponent}` : 'המשחק הקודם'}
        </p>
        {!aiVerdict && (
          <button onClick={generateAiVerdict} disabled={aiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: '#0D1A12', color: '#4ADE80', border: 'none', cursor: 'pointer', fontFamily: 'Assistant,sans-serif', opacity: aiLoading ? 0.6 : 1 }}>
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {aiLoading ? 'מנתח...' : 'סיכום מנטור'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {impact.items.map((it, i) => {
          const ui = VERDICT_UI[it.verdict];
          const Icon = ui.icon;
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: ui.bg }}>
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: ui.color }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#14231A' }}>{it.goal.title}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 9999, background: '#fff', color: ui.color }}>{ui.label}</span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#5C6B61' }}>
                  עבדתם על זה ב-{it.trainingCount} אימונים ({it.topics.join(', ')})
                  {it.verdict === 'still_present' && it.evidence && <> · במשחק: "{it.evidence.slice(0, 90)}{it.evidence.length > 90 ? '…' : ''}"</>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {aiVerdict && (
        <div style={{ marginTop: 12, borderRadius: 10, padding: '12px 14px', background: 'linear-gradient(135deg,#0D1A12 0%,#12251A 100%)' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#4ADE80' }}>סיכום המנטור</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'rgba(244,239,230,.9)' }}>{aiVerdict}</p>
        </div>
      )}
    </div>
  );
}
