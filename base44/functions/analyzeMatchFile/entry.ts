import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_url, mode, our_team_name, opponent_name, question } = body;
    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    // ═══════════════════════════════════════════
    // MODE: Quick team identification (before analysis)
    // ═══════════════════════════════════════════
    if (mode === 'identify_teams') {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `קובץ נתונים ממשחק כדורגל. זהה אך ורק את שמות שתי הקבוצות המופיעות בקובץ. החזר את השמות בדיוק כמו שהם כתובים בקובץ.`,
        response_json_schema: {
          type: "object",
          properties: {
            team_a: { type: "string", description: "שם הקבוצה הראשונה בקובץ" },
            team_b: { type: "string", description: "שם הקבוצה השנייה בקובץ" }
          }
        },
        file_urls: [file_url]
      });
      return Response.json(result);
    }

    // ═══════════════════════════════════════════
    // MODE: Deep dive — answer a specific follow-up question based only on file data
    // ═══════════════════════════════════════════
    if (mode === 'deep_dive') {
      if (!question) return Response.json({ error: 'Missing question' }, { status: 400 });

      const ourName = our_team_name || 'הקבוצה שלנו';
      const oppName = opponent_name || 'היריבה';

      const answer = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `קיבלת קובץ נתונים ממשחק כדורגל בין "${ourName}" לבין "${oppName}".

שאלת המאמן: "${question}"

משימתך: לענות על השאלה אך ורק לפי המידע שקיים בקובץ.

חוקים מחייבים:
- פלט אך ורק על סמך מה שיש בקובץ — אל תמציא, אל תשער.
- title: כותרת קצרה בעברית שמייצגת את מה שנשאל (עד 6 מילים), מנוסחת כהצהרה. דוגמאות: "פריסת המערכים במשחק", "שליטה במרכז המגרש", "השפעת החילופים על הקצב".
- blocks: חלק את התשובה לתתי-נושאים. כל תת-נושא — subtitle (כותרת, 3-5 מילים) + content (1-3 משפטים, עברית) + highlights (0-4 נקודות מספריות). ב-highlights: label + value (עם יחידות, כמו "54%" או "23 מסירות"). אל תשים highlight על משהו שלא מגובה במספרים.
- no_data: true אך ורק אם המידע לא קיים בקובץ. במקרה זה, blocks = ריק ו-title = "אין מידע בקובץ".
- באם המידע קיים חלקית — no_data = false, תן את מה שיש, וציין ב-content של block רלוונטי מה חסר.
- השתמש בשמות: "${ourName}" לקבוצה שלנו, "${oppName}" ליריבה. לעולם אל תשתמש בשמות מהקובץ.
- שמות שחקנים — באנגלית כמו בקובץ. מונחים מקצועיים — בעברית.
- אל תשתמש ב-** או ב-* או בסימוני markdown.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "כותרת תשובה קצרה (עד 6 מילים)" },
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  subtitle: { type: "string", description: "כותרת תת-נושא (3-5 מילים)" },
                  content: { type: "string", description: "תוכן התשובה — 1-3 משפטים" },
                  highlights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        value: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            no_data: { type: "boolean", description: "true = המידע לא קיים בקובץ" }
          },
          required: ["title", "blocks", "no_data"]
        },
        file_urls: [file_url]
      });
      return Response.json(answer);
    }

    // ═══════════════════════════════════════════
    // FULL ANALYSIS MODE
    // ═══════════════════════════════════════════

    const ourName = our_team_name || 'הקבוצה שלנו';
    const oppName = opponent_name || 'היריבה';

    const responseSchema = {
      type: "object",
      properties: {
        analysis_type: {
          type: "string",
          enum: ["summary", "full"],
          description: "summary = קובץ קצר, full = קובץ מפורט"
        },
        match_details: {
          type: "object",
          properties: {
            date: { type: ["string", "null"], description: "תאריך משחק YYYY-MM-DD — null אם לא מופיע בקובץ" },
            competition: { type: ["string", "null"], description: "שם התחרות/ליגה — null אם לא מופיע בקובץ" },
            our_score: { type: ["number", "null"], description: "null אם התוצאה לא מופיעה בקובץ" },
            opponent_score: { type: ["number", "null"], description: "null אם התוצאה לא מופיעה בקובץ" },
            location: { type: "string", description: "בית או חוץ" },
            scorers: {
              type: "array",
              description: "רשימת הכובשים אם מופיעה בקובץ — אחרת מערך ריק",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "שם הכובש (באנגלית כמו בקובץ)" },
                  minute: { type: ["number", "null"], description: "דקת השער" },
                  team: { type: "string", description: "our = הקבוצה שלנו, opponent = היריבה" }
                }
              }
            }
          }
        },
        summary_report: {
          type: ["object", "null"],
          properties: {
            what_happened: { type: "string" },
            what_went_well: { type: "array", items: { type: "string" } },
            what_went_poorly: { type: "array", items: { type: "string" } },
            training_topics: { type: "array", items: { type: "string" } }
          }
        },
        full_report: {
          type: ["object", "null"],
          properties: {
            tactical_overview: { type: "string" },
            possession_passing_summary: { type: "string" },
            possession_passing_stats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  our_value: { type: "string" },
                  opponent_value: { type: "string" },
                  our_pct: { type: ["number", "null"] },
                  opponent_pct: { type: ["number", "null"] },
                  advantage: { type: "string", description: "אחת מ: our, opponent, none" }
                }
              }
            },
            defense_pressure_summary: { type: "string" },
            defense_pressure_stats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  our_value: { type: "string" },
                  opponent_value: { type: "string" },
                  our_pct: { type: ["number", "null"] },
                  opponent_pct: { type: ["number", "null"] },
                  advantage: { type: "string", description: "אחת מ: our, opponent, none" }
                }
              }
            },
            duels_transitions_summary: { type: "string" },
            duels_transitions_stats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  our_value: { type: "string" },
                  opponent_value: { type: "string" },
                  our_pct: { type: ["number", "null"] },
                  opponent_pct: { type: ["number", "null"] },
                  advantage: { type: "string", description: "אחת מ: our, opponent, none" }
                }
              }
            },
            headline_insights: {
              type: "array",
              description: "בדיוק 3 תובנות-כותרת ל-TL;DR: type אחד מ good/bad/watch, text משפט קצר עם מספרים מהקובץ",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["good", "bad", "watch"], description: "good = מה עבד, bad = מה לתקן, watch = לשים לב" },
                  text: { type: "string", description: "משפט אחד ממוקד עם מספרים אמיתיים מהקובץ" }
                }
              }
            },
            key_metrics: {
              type: "array",
              description: "3-6 מדדים מספריים מרכזיים לתצוגת טבעות/ברים. רק מדדים שקיימים בקובץ",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "שם המדד בעברית (למשל החזקת כדור)" },
                  our_value: { type: "string", description: "הערך שלנו עם יחידות (למשל 36% או 0.75)" },
                  opponent_value: { type: "string", description: "הערך של היריבה עם יחידות" },
                  our_pct: { type: ["number", "null"], description: "המספר 0-100 להצגת הטבעת/בר, או null" },
                  opponent_pct: { type: ["number", "null"] },
                  better_when: { type: "string", enum: ["high", "low"], description: "high = ערך גבוה טוב יותר, low = ערך נמוך טוב יותר (עבירות, PPDA)" }
                }
              }
            },
            halves: {
              type: ["object", "null"],
              description: "פילוח למחצית ראשונה ושנייה — רק אם הקובץ מכיל חלוקה כזו, אחרת null",
              properties: {
                first: {
                  type: "object",
                  properties: {
                    score: { type: ["string", "null"], description: "תוצאת המחצית, למשל 1–0" },
                    summary: { type: "string", description: "סיפור המחצית עם מספרים" },
                    pass_accuracy: { type: ["string", "null"] },
                    ppda: { type: ["string", "null"] }
                  }
                },
                second: {
                  type: "object",
                  properties: {
                    score: { type: ["string", "null"] },
                    summary: { type: "string" },
                    pass_accuracy: { type: ["string", "null"] },
                    ppda: { type: ["string", "null"] }
                  }
                }
              }
            },
            possession_by_interval: {
              type: "array",
              description: "אחוזי החזקה שלנו לפי רבעי-שעה — רק אם קיים בקובץ. עד 6 נקודות",
              items: {
                type: "object",
                properties: {
                  interval: { type: "string", description: "טווח הדקות, למשל 1-15" },
                  our_pct: { type: ["number", "null"], description: "אחוז ההחזקה שלנו באותו טווח" }
                }
              }
            },
            standout_players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  shirt_number: { type: ["string", "null"], description: "מספר חולצה אם מופיע בקובץ" },
                  position: { type: "string" },
                  moment: { type: ["string", "null"], description: "רגע בולט, למשל שער בדקה 55'" },
                  summary: { type: "string" },
                  stats: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } } } }
                }
              }
            },
            training_topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  urgency: { type: "string", enum: ["דחוף", "חשוב"] },
                  rationale: { type: "string" },
                  rationale_with_numbers: { type: ["string", "null"], description: "נימוק קצר עם מספרים מהקובץ (למשל 69% דיוק במחצית ב' · 107 איבודים)" }
                }
              }
            },
            key_issues: {
              type: "array",
              items: { type: "string" },
              description: "3-6 בעיות מרכזיות שזוהו במשחק, בניסוח קצר וממוקד בעברית"
            },
            executive_summary: { type: "string" }
          }
        }
      },
      required: ["analysis_type"]
    };

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `אתה אנליסט כדורגל מקצועי. קיבלת קובץ נתונים ממשחק כדורגל.

⛔ חוק מספר 1 — הקריטי ביותר: אתה חייב לקרוא את המספרים האמיתיים מהקובץ.

פתח את הקובץ. קרא כל טבלה, כל שורה, כל עמודה. חפש מספרים: אחוזים, ספירות, מדדים. כל מה שמופיע בקובץ — שלוף אותו ושים אותו בפלט.

⛔ חוק מספר 2: לעולם, בשום מצב, אל תחזיר 0 בתור ערך ברירת מחדל.
- 0 מותר אך ורק אם בקובץ באמת כתוב 0.
- אם לא מצאת ערך מסוים בקובץ — אל תכניס אותו לרשימת הסטטיסטיקות בכלל. עדיף מערך stats קצר יותר אבל מדויק, מאשר מערך מלא במספרים מומצאים.
- our_pct ו-opponent_pct: null = הנתון לא זמין. אף פעם לא 0 בתור "לא יודע".

⛔ חוק מספר 3: אל תמציא. אל תשער. אל תחשב בראש.
- כל מספר שמופיע בפלט שלך חייב להיות מופיע בקובץ, מילה במילה.
- "36%" בקובץ = "36%" בפלט. לא "35%", לא "40%", לא 0.
- "14 בעיטות" בקובץ = "14" בפלט. לא "15", לא "12", לא 0.

המשחק הוא בין "${ourName}" לבין "${oppName}".
כתוב את כל הניתוח תוך שימוש בשמות האלה: "${ourName}" = הקבוצה שלנו, "${oppName}" = היריבה.
לעולם אל תשתמש בשמות המקוריים מהקובץ — רק בשמות שסופקו לך כאן.
שמות שחקנים בשמות המקוריים מהקובץ.

צעדים:

1. קרא את הקובץ בשלמותו. זהה אילו נתונים קיימים.
2. קבע את עומק הנתונים:
   - "summary" = קובץ קצר (תוצאה, סטטיסטיקות בודדות, סיכום קצר)
   - "full" = קובץ ארוך ומפורט (נתוני שחקנים, מסירות, דו-קרבות, לחץ, נתונים טקטיים מלאים)

3. חלץ פרטי משחק: תאריך, תוצאה, מיקום — רק מה שקיים בקובץ.

4. לסוג "summary":
   - what_happened: פסקה — מה קרה במשחק, לפי הנתונים. אזכר מספרים אמיתיים מהקובץ.
   - what_went_well: דברים חיוביים — עם מספרים אמיתיים מהקובץ.
   - what_went_poorly: בעיות — ניסוח ספציפי עם מספרים אמיתיים מהקובץ.
   - training_topics: נושאים לעבודה באימון

5. לסוג "full":
   - tactical_overview: סקירה טקטית — מערך, קו הגנה, מאיפה הגיעו הגולים
   - possession_passing_summary: ניתוח טקסטואלי — עם מספרים אמיתיים
   - possession_passing_stats: 4-6 מדדי השוואה — רק מדדים שקיימים בפועל בקובץ. כל מדד — our_value + opponent_value (עם יחידות, כמו "54%") + our_pct + opponent_pct (המספר האמיתי 0-100, או null)
   - defense_pressure_summary: ניתוח טקסטואלי — עם מספרים אמיתיים
   - defense_pressure_stats: 4-6 מדדי השוואה — רק מדדים שקיימים בפועל בקובץ. אותו מבנה.
   - duels_transitions_summary: ניתוח טקסטואלי — עם מספרים אמיתיים
   - duels_transitions_stats: 3-5 מדדי השוואה — רק מדדים שקיימים בפועל בקובץ. אותו מבנה.
   - headline_insights: בדיוק 3 תובנות ל-TL;DR. אחת type="good" (מה עבד), אחת type="bad" (מה לתקן), אחת type="watch" (לשים לב). כל אחת משפט קצר עם מספרים אמיתיים מהקובץ.
   - key_metrics: 3-6 מדדים מספריים מרכזיים (למשל החזקת כדור, דיוק מסירות, דו-קרבות, שערים צפויים). לכל מדד our_value + opponent_value (עם יחידות), our_pct + opponent_pct (מספר 0-100 או null), ו-better_when ("high" או "low"). רק מדדים שקיימים בקובץ.
   - halves: אם הקובץ מפרק למחצית ראשונה/שנייה — first ו-second, כל אחד עם score, summary, ו-pass_accuracy/ppda אם קיימים. אם אין חלוקה — null.
   - possession_by_interval: אחוזי החזקה שלנו לפי רבעי-שעה (עד 6 נקודות: 1-15, 16-30, ...). רק אם קיים בקובץ, אחרת מערך ריק.
   - standout_players: 4-5 שחקנים בולטים. name, shirt_number (אם קיים), position, moment (רגע בולט אם קיים), summary, stats
   - training_topics: 3-6 נושאי עבודה. topic, urgency (דחוף/חשוב), rationale, ו-rationale_with_numbers (נימוק תמציתי עם מספרים מהקובץ)
   - key_issues: 3-6 בעיות מרכזיות שזוהו במשחק (משפט קצר וממוקד לכל בעיה, בעברית)
   - match_details: כלול גם competition (שם התחרות) ו-scorers (רשימת כובשים עם name, minute, team="our"/"opponent") אם מופיעים בקובץ
   - executive_summary: 3-4 משפטים — המסקנה הכי חשובה

חוקים מחייבים:
- את כל הניתוח — טקסט, מספרים, תוויות — כותבים בעברית מלאה. אפס מילים באנגלית.
- שמות שחקנים: באנגלית (כמו בקובץ).
- שמות קבוצות: תמיד "${ourName}" ו-"${oppName}" — אף פעם לא השמות מהקובץ.
- מונחים בעברית טבעית:
  * "החזקת כדור" (לא Possession)
  * "שערים צפויים" (לא xG)
  * "מדד לחץ הגנתי" (לא PPDA)
  * "השבת כדור" (לא Recoveries)
  * "החלקות" (לא Sliding tackles)
  * "חיסולים" (לא Clearances)
  * "חסימות" (לא Interceptions)
  * "מסירות לשליש האחרון" (לא passes to final third)
  * "דיוק מסירות" (לא Pass accuracy)
  * "בעיטות למסגרת" (לא Shots on target)
  * "דו-קרבות קרקע" (לא Ground duels)
  * "דו-קרבות אוויר" (לא Aerial duels)
  * "מסירות מפתח" (לא Key passes)
  * "איבודי כדור" (לא Turnovers/losses)
  * "עבירות" (לא Fouls)
- ערכים: "63%" לא "63/37". "14" לא "14 מתוך 24".
- our_pct/opponent_pct: המספר האמיתי 0-100. null = לא קיים בקובץ. לחשב אחוז רק מתוך ספירות שקיימות בקובץ.
- advantage: "our" = אנחנו טובים יותר, "opponent" = יריבה טובה יותר, "none" = שוויון.
- טון: אנליסט בכיר. ספציפי, לא כללי.`,
      response_json_schema: responseSchema,
      file_urls: [file_url]
    });

    return Response.json(analysis);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});