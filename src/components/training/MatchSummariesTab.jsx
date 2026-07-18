import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Swords, Target, TrendingUp } from 'lucide-react';
import WorkTopicModal from './WorkTopicModal';
import TrendsSection from '../analysis/TrendsSection';

const RESULT_MAP = {
  win:  { label: 'נצ', color: '#16A34A', headerEnd: '#16301F', circleBg: 'rgba(74,222,128,.2)', circleBorder: 'rgba(74,222,128,.4)', circleText: '#4ADE80', score: '#4ADE80' },
  draw: { label: 'ת',  color: '#D97706', headerEnd: '#13241A', circleBg: 'rgba(217,119,6,.22)', circleBorder: 'rgba(217,119,6,.4)', circleText: '#FBBF24', score: '#FBBF24' },
  loss: { label: 'ה',  color: '#DC2626', headerEnd: '#13241A', circleBg: 'rgba(220,38,38,.2)',  circleBorder: 'rgba(220,38,38,.4)', circleText: '#F87171', score: '#F87171' },
};
const CARD_SHADOW = '0 1px 2px rgba(13,26,18,.05), 0 4px 12px rgba(13,26,18,.06)';

function resultKey(s) {
  if (s.result_our == null || s.result_opponent == null) return null;
  if (s.result_our > s.result_opponent) return 'win';
  if (s.result_our === s.result_opponent) return 'draw';
  return 'loss';
}

function InsightBlock({ title, titleColor, bg, children }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '9px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: titleColor }}>{title}</div>
      <div style={{ fontSize: 11, color: '#14231A', marginTop: 2 }}>{children}</div>
    </div>
  );
}

export default function MatchSummariesTab({ summaries, topics, onRefresh, teamId, analyses }) {
  const [expanded, setExpanded] = useState(null);
  const [newTopicFromSummary, setNewTopicFromSummary] = useState(null);

  const matchSummaries = summaries
    .filter(s => s.event_type === 'match')
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const findExistingTopic = (summary) => {
    const st = summary.tactical_topics || [];
    return topics.find(t =>
      (t.linked_topics || []).some(lt => st.includes(lt)) ||
      st.some(x => (t.title || '').includes(x) || x.includes(t.title || '')));
  };

  const form = matchSummaries.map(resultKey).filter(Boolean).slice(0, 5);

  const Header = (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 4px' }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#14231A' }}>סיכומי משחקים</div>
        <div style={{ fontSize: 12, color: '#5C6B61', marginTop: 2 }}>מה למדנו מכל משחק — ומאיזה משחק נולד כל נושא עבודה.</div>
      </div>
      {form.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: '#94A39A', fontWeight: 600 }}>כושר אחרון:</span>
          {form.map((k, i) => {
            const r = RESULT_MAP[k];
            return <span key={i} style={{ width: 24, height: 24, borderRadius: 99, background: r.color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.label}</span>;
          })}
        </div>
      )}
    </div>
  );

  if (matchSummaries.length === 0) {
    return (
      <div dir="rtl">
        {Header}
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 16, padding: '48px 20px', textAlign: 'center', boxShadow: CARD_SHADOW }}>
          <Swords className="w-8 h-8 mx-auto mb-2" style={{ color: '#C8BFB3' }} />
          <p style={{ fontSize: 13, color: '#9A8672' }}>עדיין לא הוכנסו סיכומי משחקים</p>
          <p style={{ fontSize: 11, color: '#C8BFB3', marginTop: 4 }}>לאחר מילוי סיכום מקצועי למשחק, הוא יופיע כאן</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl">
      {Header}

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
        {matchSummaries.map(summary => {
          const isOpen = expanded === summary.id;
          const rk = resultKey(summary);
          const r = rk ? RESULT_MAP[rk] : null;
          const opponent = summary.event_label?.replace('מול ', '') || 'יריב';
          const hasIssues = !!(summary.issues_found || '').trim();
          const existingTopic = findExistingTopic(summary);
          const d = summary.event_date ? new Date(summary.event_date).toLocaleDateString('he-IL', { day: '2-digit', month: 'short' }) : '';

          return (
            <div key={summary.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
              {/* Dark header */}
              <div style={{ background: `linear-gradient(135deg,#0D1A12,${r ? r.headerEnd : '#13241A'})`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {r && (
                  <span style={{ width: 34, height: 34, borderRadius: 99, background: r.circleBg, border: `1px solid ${r.circleBorder}`, color: r.circleText, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.label}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#F4EFE6', fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>מול {opponent}</div>
                  {d && <div style={{ color: 'rgba(244,239,230,.5)', fontSize: 10 }}>{d}</div>}
                </div>
                {r && summary.result_our != null && (
                  <div style={{ color: r.score, fontWeight: 900, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{summary.result_our}:{summary.result_opponent}</div>
                )}
              </div>

              {/* Body */}
              <div style={{ padding: '14px 18px' }}>
                {rk === 'loss' && hasIssues ? (
                  <InsightBlock title="⚠ הבעיה המרכזית" titleColor="#DC2626" bg="#FCEBEB">{summary.issues_found}</InsightBlock>
                ) : summary.what_worked ? (
                  <InsightBlock title="✓ מה עבד" titleColor="#16A34A" bg="#E7F6EC">{summary.what_worked}</InsightBlock>
                ) : hasIssues ? (
                  <InsightBlock title="⚠ מה התגלה" titleColor="#DC2626" bg="#FCEBEB">{summary.issues_found}</InsightBlock>
                ) : null}

                {/* Footer linkage + expander */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {existingTopic ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#16A34A' }}>
                      <Target className="w-3 h-3" />◎ נושא עבודה: {existingTopic.title}
                    </span>
                  ) : hasIssues ? (
                    <button onClick={() => setNewTopicFromSummary(summary)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 8, background: 'rgba(220,38,38,.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,.25)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <TrendingUp className="w-3 h-3" />פתח נושא עבודה
                    </button>
                  ) : <span />}
                  <button onClick={() => setExpanded(isOpen ? null : summary.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94A39A', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    פרטים {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8, marginTop: 10 }}>
                    {summary.topic && <div style={{ gridColumn: '1 / -1', fontSize: 12, fontStyle: 'italic', color: '#5C6B61' }}>{summary.topic}</div>}
                    {summary.what_worked && rk === 'loss' && <InsightBlock title="✓ מה עבד" titleColor="#16A34A" bg="#E7F6EC">{summary.what_worked}</InsightBlock>}
                    {summary.tactical_insights && <InsightBlock title="💡 תובנות טקטיות" titleColor="#2563EB" bg="#EAF1FD">{summary.tactical_insights}</InsightBlock>}
                    {summary.decisions_next && <InsightBlock title="→ החלטות להמשך" titleColor="#D97706" bg="#FDF3E3">{summary.decisions_next}</InsightBlock>}
                    {summary.satisfaction && (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: '#94A39A' }}>שביעות רצון:</span>
                        <span style={{ fontSize: 13 }}>{'⭐'.repeat(Math.min(5, summary.satisfaction))}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight banner (trends) */}
      {analyses && analyses.length >= 2 && (
        <div style={{ marginTop: 16 }}>
          <TrendsSection analyses={analyses} />
        </div>
      )}

      {newTopicFromSummary && (
        <WorkTopicModal
          open={true}
          topic={{
            title: newTopicFromSummary.event_label || '',
            description: newTopicFromSummary.issues_found || '',
            source: 'match',
            linked_topics: newTopicFromSummary.tactical_topics || [],
            priority: 'high',
          }}
          teamId={teamId}
          summaries={[newTopicFromSummary]}
          onClose={() => setNewTopicFromSummary(null)}
          onSaved={() => { setNewTopicFromSummary(null); onRefresh && onRefresh(); }}
        />
      )}
    </div>
  );
}
