import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { match_analysis_id } = body;
    if (!match_analysis_id) return Response.json({ error: 'Missing match_analysis_id' }, { status: 400 });

    // Load match analysis
    const analysis = await base44.entities.MatchAnalysis.get(match_analysis_id);
    if (!analysis) return Response.json({ error: 'Match analysis not found' }, { status: 404 });

    // Load professional summary if linked
    let summary = null;
    if (analysis.summary_id) {
      try {
        const summaries = await base44.entities.ProfessionalSummary.filter({ id: analysis.summary_id });
        summary = summaries[0] || null;
      } catch (e) {}
    }

    // Load team + game style
    let team = null;
    if (analysis.team_id) {
      try {
        const teams = await base44.entities.Team.filter({ id: analysis.team_id });
        team = teams[0] || null;
      } catch (e) {}
    }

    const hasStats = analysis.stats && Object.keys(analysis.stats).length > 0;
    const hasPhaseAnalysis = analysis.phase_analysis &&
      (analysis.phase_analysis.buildup || analysis.phase_analysis.transitions ||
       analysis.phase_analysis.organized_defense || analysis.phase_analysis.set_pieces);

    // ── Collect issues (same logic as frontend) ──
    const allIssues = [
      ...(analysis.report?.issues || []),
      ...(analysis.phase_analysis?.buildup?.issues || []),
      ...(analysis.phase_analysis?.transitions?.attack?.issues || []),
      ...(analysis.phase_analysis?.transitions?.defense?.issues || []),
      ...(analysis.phase_analysis?.organized_defense?.issues || []),
    ].filter((v, i, a) => a.indexOf(v) === i);

    // ── Collect training topics ──
    const trainingTopics = (analysis.training_actions?.length > 0)
      ? analysis.training_actions.map(a => a.focus)
      : (analysis.report?.recommendations?.length > 0
          ? analysis.report.recommendations.slice(0, 4)
          : allIssues.slice(0, 4));

    // ═══════════════════════════════════════════
    // BUILD CONTEXT
    // ═══════════════════════════════════════════
    let context = '';

    context += `קבוצה: ${team?.name || 'הקבוצה שלנו'}\n`;
    context += `יריבה: ${analysis.opponent}\n`;
    context += `תוצאה: ${analysis.result?.our_score ?? '?'} - ${analysis.result?.opponent_score ?? '?'}\n`;
    context += `תאריך: ${analysis.date || 'לא ידוע'}\n\n`;

    if (hasStats) {
      context += `=== נתונים סטטיסטיים מקובץ ===\n`;
      const s = analysis.stats;
      const statLines = [];
      if (s.possession != null) statLines.push(`החזקת כדור: ${s.possession}%`);
      if (s.passes != null) statLines.push(`מסירות: ${s.passes}`);
      if (s.pass_accuracy != null) statLines.push(`דיוק מסירות: ${s.pass_accuracy}%`);
      if (s.shots != null) statLines.push(`בעיטות: ${s.shots}`);
      if (s.shots_on_target != null) statLines.push(`בעיטות למסגרת: ${s.shots_on_target}`);
      if (s.xg != null) statLines.push(`שערים צפויים: ${s.xg}`);
      if (s.tackles != null) statLines.push(`תיקולים: ${s.tackles}`);
      if (s.interceptions != null) statLines.push(`חסימות: ${s.interceptions}`);
      if (s.turnovers != null) statLines.push(`איבודי כדור: ${s.turnovers}`);
      if (s.critical_errors != null) statLines.push(`טעויות קריטיות: ${s.critical_errors}`);
      context += statLines.join('\n') + '\n\n';
    }

    if (analysis.free_notes) {
      context += `=== דוח / הערות המאמן ===\n${analysis.free_notes}\n\n`;
    }

    if (analysis.report) {
      context += `=== דוח ניתוח ===\n`;
      if (analysis.report.summary) context += `סיכום: ${analysis.report.summary}\n`;
      if (analysis.report.positives?.length) context += `נקודות חיוביות:\n${analysis.report.positives.map(p => '  - ' + p).join('\n')}\n`;
      if (analysis.report.issues?.length) context += `בעיות:\n${analysis.report.issues.map(p => '  - ' + p).join('\n')}\n`;
      if (analysis.report.recommendations?.length) context += `המלצות:\n${analysis.report.recommendations.map(p => '  - ' + p).join('\n')}\n`;
      context += '\n';
    }

    if (analysis.game_plan) {
      const gp = analysis.game_plan;
      context += `=== תוכנית משחק ===\n`;
      if (gp.intended_strategy) context += `התכנון לפני המשחק: ${gp.intended_strategy}\n`;
      if (gp.what_happened) context += `מה קרה בפועל: ${gp.what_happened}\n`;
      if (gp.where_it_broke) context += `איפה זה השתבש: ${gp.where_it_broke}\n`;
      if (gp.why_it_broke) context += `למה זה השתבש: ${gp.why_it_broke}\n`;
      if (gp.next_steps) context += `מה עושים עכשיו: ${gp.next_steps}\n`;
      context += '\n';
    }

    if (hasPhaseAnalysis) {
      const pa = analysis.phase_analysis;
      context += `=== ניתוח לפי שלבים ===\n`;
      if (pa.buildup) {
        context += `בנייה:\n`;
        if (pa.buildup.strengths?.length) context += `  חוזקות: ${pa.buildup.strengths.join('; ')}\n`;
        if (pa.buildup.issues?.length) context += `  בעיות: ${pa.buildup.issues.join('; ')}\n`;
        if (pa.buildup.recommendations?.length) context += `  המלצות: ${pa.buildup.recommendations.join('; ')}\n`;
      }
      if (pa.transitions) {
        if (pa.transitions.attack) {
          context += `מעבר התקפי:\n`;
          if (pa.transitions.attack.strengths?.length) context += `  חוזקות: ${pa.transitions.attack.strengths.join('; ')}\n`;
          if (pa.transitions.attack.issues?.length) context += `  בעיות: ${pa.transitions.attack.issues.join('; ')}\n`;
        }
        if (pa.transitions.defense) {
          context += `מעבר הגנתי:\n`;
          if (pa.transitions.defense.strengths?.length) context += `  חוזקות: ${pa.transitions.defense.strengths.join('; ')}\n`;
          if (pa.transitions.defense.issues?.length) context += `  בעיות: ${pa.transitions.defense.issues.join('; ')}\n`;
        }
      }
      if (pa.organized_defense) {
        context += `הגנה מאורגנת:\n`;
        if (pa.organized_defense.strengths?.length) context += `  חוזקות: ${pa.organized_defense.strengths.join('; ')}\n`;
        if (pa.organized_defense.issues?.length) context += `  בעיות: ${pa.organized_defense.issues.join('; ')}\n`;
      }
      context += '\n';
    }

    if (analysis.key_phrases?.length) {
      context += `=== משפטי מפתח של המאמן ===\n${analysis.key_phrases.map(p => '  - ' + p).join('\n')}\n\n`;
    }

    if (analysis.training_actions?.length) {
      context += `=== נושאי עבודה לאימון ===\n`;
      analysis.training_actions.forEach((a, i) => {
        context += `${i + 1}. ${a.focus}${a.drill_suggestion ? ' — ' + a.drill_suggestion : ''}${a.priority ? ' (' + a.priority + ')' : ''}\n`;
      });
      context += '\n';
    }

    if (analysis.player_ratings?.length) {
      const played = analysis.player_ratings.filter(r => !r.did_not_play && r.rating != null);
      const top = [...played].sort((a, b) => b.rating - a.rating).slice(0, 3);
      const bottom = [...played].sort((a, b) => a.rating - b.rating).slice(0, 3);
      context += `=== שחקנים ===\n`;
      if (top.length) context += `מצטיינים: ${top.map(p => `${p.player_name || p.player_id} (${p.rating}/10)`).join(', ')}\n`;
      if (bottom.length) context += `התקשו: ${bottom.map(p => `${p.player_name || p.player_id} (${p.rating}/10)`).join(', ')}\n`;
      context += '\n';
    }

    if (summary) {
      if (summary.what_worked) context += `=== מה עבד (מסיכום מקצועי) ===\n${summary.what_worked}\n\n`;
      if (summary.issues_found) context += `=== בעיות שזוהו (מסיכום מקצועי) ===\n${summary.issues_found}\n\n`;
      if (summary.tactical_insights) context += `=== תובנות טקטיות ===\n${summary.tactical_insights}\n\n`;
      if (summary.decisions_next) context += `=== החלטות להמשך ===\n${summary.decisions_next}\n\n`;
    }

    if (team?.game_style) {
      context += `=== שיטת משחק מוגדרת ===\n${JSON.stringify(team.game_style, null, 2)}\n`;
      if (team.game_style_notes) context += `הערות שיטה: ${team.game_style_notes}\n`;
      context += '\n';
    }

    // Explicit lists for the LLM to expand
    context += `=== בעיות שזוהו (להרחבה) ===\n`;
    if (allIssues.length > 0) {
      allIssues.forEach((iss, i) => { context += `${i + 1}. ${iss}\n`; });
    } else {
      context += '(לא זוהו בעיות ספציפיות — הסתמך על ההערות הכלליות)\n';
    }
    context += '\n';

    context += `=== נושאי אימון (לקישור לסיפור) ===\n`;
    if (trainingTopics.length > 0) {
      trainingTopics.forEach((t, i) => { context += `${i + 1}. ${t}\n`; });
    } else {
      context += '(לא צוינו נושאי אימון ספציפיים)\n';
    }

    // ═══════════════════════════════════════════
    // DETERMINE DATA RICHNESS
    // ═══════════════════════════════════════════
    const isSparse = !hasStats && !hasPhaseAnalysis && !analysis.game_plan?.what_happened;

    const prompt = `אתה אנליסט כדורגל בכיר ושותף לחשיבה של המאמן. תפקידך ליצור "ניתוח מעמיק" שמסביר את האיך והלמה מאחורי המסקנות של ניתוח המשחק — לא רק את המסקנות עצמן.

⛔ חוק יסוד — הכי חשוב: המערכת אף פעם לא ממציאה מידע שלא קיים. אתה מפרש ומרחיב את מה שכבר יש — בין אם זה נתונים סטטיסטיים מקובץ, ובין אם זה תיאור חופשי שהמאמן הקליד בעצמו.

נתוני המשחק:
${context}

${isSparse
  ? '⚠ המידע דליל — מבוסס על תיאור חופשי בלבד, ללא נתונים סטטיסטיים. הרחב את ההקשר הטקטי הכללי-מקצועי על בסיס מה שהמאמן כתב. אל תמציא פרטים ספציפיים (דקות, מספרים, שחקנים) שלא נמסרו. כשחסר מידע — הצג שאלות הבהרה.'
  : 'המידע עשיר — חבר בין הנתונים המספריים להקשר הטקטי. ציין אילו מספרים תומכים בכל מסקנה.'}

משימותיך:

1. story — כתוב פסקה (5-8 משפטים) שמספרת את הרצף של המשחק: מה קרה, מתי משהו השתנה (אם יש מידע על זמן/דקה/חצי), ואיך זה מוביל למסקנות שכבר מוצגות. זה החיבור בין המסקנות — לא חזרה עליהן. אם אין מידע על דקות או זמנים — אל תמציא. תאר את הרצף הטקטי הכללי.

2. issue_expansions — לכל בעיה מרשימת "בעיות שזוהו" למעלה, צור הרחבה:
   - issue: הבעיה כפי שזוהתה (העתק את הטקסט המקורי)
   - explanation: למה זה קרה ומה הרקע הטקטי. הסבר מקצועי שמרחיב את המשפט הקצר. לדוגמה, אם המאמן כתב "הלחץ הגבוה לא עבד בחצי השני" — הסבר מה זה אומר טקטית: בדרך כלל קורה כשהיריב מצליח לעקוף את קו הלחץ הראשון, או כשהשחקנים מתעייפים והמרחקים ביניהם גדלים, וכו'. אם יש נתונים מספריים שמסבירים — שלב אותם.
   - supporting_data: אם יש מספרים מהנתונים שמסבירים את הבעיה — ציין אותם (למשל "דיוק מסירות 59% מעיד על קושי בבנייה"). אם אין — כתוב "אין מספרים — הבעיה זוהתה מתיאור המאמן".

3. clarifying_questions — רק אם המידע דליל. שאל 1-2 שאלות ממוקדות שיעזרו להעמיק בפעם הבאה. כל שאלה — question + reason (למה זה יעזור). דוגמה: "האם זה קרה בגלל עייפות, או שהיריב שינה את דרך הבנייה שלו?" / סיבה: "ההבדלה בין עייפות לשינוי טקטי של היריב תאפשר ניתוח מדויק יותר במשחק הבא". אם המידע עשיר — מערך ריק.

4. training_topic_context — לכל נושא אימון מהרשימה למעלה:
   - topic: שם הנושא
   - story_link: שורת הסבר שמקשרת אותו למה שקרה במשחק — הקו הישיר בין מה שקרה לבין מה שצריך לתרגל. לדוגמה: "הלחץ שהתפרק בחצי השני מחייב עבודה על דחיסת מרחקים תחת עייפות".

5. data_richness — "rich" אם יש נתונים סטטיסטיים או ניתוח מפורט של שלבי המשחק. "sparse" אם יש רק הערות חופשיות של המאמן.

כללים מחייבים:
- כל הטקסט בעברית מלאה וטבעית.
- אל תמציא מספרים, דקות, או פרטים שלא הוזכרו בנתוני המשחק.
- ההרחבה מסבירה ומפרשת — לא טוענת "ידעה" פרטים שלא נמסרו.
- טון: אנליסט בכיר, שותף לחשיבה. לא רובוטי, לא דוח יבש.
- אל תשתמש ב-** או ב-* או בסימוני markdown.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          story: { type: "string", description: "סיפור המשחק — פסקה מקשרת (5-8 משפטים)" },
          issue_expansions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issue: { type: "string", description: "הבעיה כפי שזוהתה" },
                explanation: { type: "string", description: "הסבר מעמיק — למה קרה, הקשר טקטי" },
                supporting_data: { type: "string", description: "נתונים מספריים תומכים או הערה על היעדרם" }
              },
              required: ["issue", "explanation", "supporting_data"]
            }
          },
          clarifying_questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string", description: "שאלת הבהרה ממוקדת למאמן" },
                reason: { type: "string", description: "למה שאלה זו תעזור לניתוח הבא" }
              },
              required: ["question", "reason"]
            }
          },
          training_topic_context: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string", description: "נושא אימון" },
                story_link: { type: "string", description: "קישור מפורש לסיפור המשחק" }
              },
              required: ["topic", "story_link"]
            }
          },
          data_richness: { type: "string", enum: ["rich", "sparse"], description: "עושר הנתונים" }
        },
        required: ["story", "issue_expansions", "clarifying_questions", "training_topic_context", "data_richness"]
      }
    });

    const deepAnalysis = { ...result, generated_date: new Date().toISOString() };

    // Save to MatchAnalysis
    await base44.entities.MatchAnalysis.update(match_analysis_id, {
      deep_analysis: deepAnalysis
    });

    return Response.json(deepAnalysis);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});