/**
 * Real implementation of generateDeepAnalysis: builds the deep-analysis
 * payload (story, issue expansions, clarifying questions, training topic
 * context) via the LLM and saves it on the MatchAnalysis record.
 */
import { base44 } from '@/api/base44Client';

function collectIssues(analysis) {
  const issues = [];
  const add = (arr) => (arr || []).forEach(i => { if (i && !issues.includes(i)) issues.push(i); });

  add(analysis.report?.issues);
  const pa = analysis.phase_analysis || {};
  add(pa.buildup?.issues);
  add(pa.transitions?.attack?.issues);
  add(pa.transitions?.defense?.issues);
  add(pa.organized_defense?.issues);
  add(pa.set_pieces?.issues);
  if (analysis.game_plan?.where_it_broke) add([analysis.game_plan.where_it_broke]);
  (analysis.tactical_problems || []).forEach(p => { if (p.text && !issues.includes(p.text)) issues.push(p.text); });
  if (analysis._summary?.issues_found) add([analysis._summary.issues_found]);

  return issues.slice(0, 8);
}

function dataRichness(analysis) {
  const hasStats = analysis.stats && Object.keys(analysis.stats).length > 0;
  const hasPhases = analysis.phase_analysis && Object.values(analysis.phase_analysis)
    .some(v => v && typeof v === 'object' && Object.keys(v).length > 0);
  const hasGamePlan = !!analysis.game_plan?.what_happened;
  return (hasStats || hasPhases || hasGamePlan) ? 'rich' : 'sparse';
}

export async function generateDeepAnalysis({ match_analysis_id }) {
  const rows = await base44.entities.MatchAnalysis.filter({ id: match_analysis_id });
  const analysis = rows?.[0];
  if (!analysis) return { success: false, error: 'match analysis not found' };

  const issues = collectIssues(analysis);
  const richness = dataRichness(analysis);
  const trainingTopics = (analysis.training_actions || []).map(a => a.focus).filter(Boolean).length > 0
    ? analysis.training_actions.map(a => a.focus).filter(Boolean)
    : (analysis.report?.recommendations || []).slice(0, 4);

  const context = `
יריב: ${analysis.opponent || '?'}
תוצאה: ${analysis.result?.our_score ?? '?'}-${analysis.result?.opponent_score ?? '?'}
${analysis.stats && Object.keys(analysis.stats).length ? `סטטיסטיקה: ${JSON.stringify(analysis.stats)}` : 'אין נתונים סטטיסטיים.'}
${analysis.free_notes ? `הערות המאמן: ${analysis.free_notes}` : ''}
${analysis.game_plan?.intended_strategy ? `תוכנית מקורית: ${analysis.game_plan.intended_strategy}` : ''}
${analysis.game_plan?.what_happened ? `מה קרה בפועל: ${analysis.game_plan.what_happened}` : ''}
${analysis.game_plan?.why_it_broke ? `למה נשבר: ${analysis.game_plan.why_it_broke}` : ''}
בעיות שזוהו:
${issues.map((i, n) => `${n + 1}. ${i}`).join('\n') || 'לא זוהו בעיות.'}
נושאי אימון: ${trainingTopics.join(', ') || 'אין'}
עושר נתונים: ${richness}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `צור ניתוח מעמיק למשחק לפי חלק 5 של ההנחיות שלך.

נתוני המשחק:${context}

הפק:
- story: פסקה של 5-8 משפטים שמספרת את רצף המשחק ומחברת בין המסקנות. אל תמציא דקות או מספרים שלא נמסרו.
- issue_expansions: לכל בעיה מהרשימה — issue (העתק מקורי), explanation (למה קרה + רקע טקטי), supporting_data (מספרים מהנתונים בלבד, או "אין מספרים — הבעיה זוהתה מתיאור המאמן").
- clarifying_questions: ${richness === 'sparse' ? '1-2 שאלות ממוקדות עם question + reason.' : 'מערך ריק (הנתונים עשירים).'}
- training_topic_context: לכל נושא אימון — topic + story_link שמקשר אותו למה שקרה במשחק.`,
    response_json_schema: {
      type: 'object',
      properties: {
        story: { type: 'string' },
        issue_expansions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              issue: { type: 'string' },
              explanation: { type: 'string' },
              supporting_data: { type: 'string' },
            },
          },
        },
        clarifying_questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
        training_topic_context: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              story_link: { type: 'string' },
            },
          },
        },
      },
    },
  });

  if (result?.__ai_error) return { success: false, error: result.__ai_error };

  const deep = {
    story: result.story || '',
    issue_expansions: result.issue_expansions || [],
    clarifying_questions: richness === 'rich' ? [] : (result.clarifying_questions || []),
    training_topic_context: result.training_topic_context || [],
    data_richness: richness,
  };

  await base44.entities.MatchAnalysis.update(match_analysis_id, { deep_analysis: deep });
  return { success: true, analysis: deep };
}
