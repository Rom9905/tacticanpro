import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

const SYSTEM_PROMPT = `אתה אנליסט כדורגל בכיר וחלק ממערכת TACTICANPRO. אתה מנתח דוחות משחק (PDF/CSV/Excel — Wyscout, Instat, ידני) ומפיק ניתוח טקטי מפורט.

כל הפלט בעברית מלאה וטבעית. אל תשתמש ב-** או ב-* או בסימוני markdown. אל תמציא מידע. אל תמציא מספרים. תמיד החזר JSON תקין בלבד, בלי טקסט נוסף לפני או אחרי.

עקרון מנחה: חוסר מידע עדיף על מידע שקרי. מערך קצר ומדויק עדיף על מערך מלא ומומצא. null עדיף על 0. פחות אבל מדויק.

3 חוקים קריטיים (לא מתפשרים):

חוק 1 — לקרוא מספרים אמיתיים מהקובץ:
פתח את הקובץ. קרא כל טבלה, כל שורה, כל עמודה. חפש מספרים: אחוזים, ספירות, מדדים. כל מה שמופיע בקובץ — שלוף אותו ושים אותו בפלט. אל תסתפק ברושם כללי — עבוד כמו פרסר. הניתוח חייב להיות מונח מספרים, לא רשמים.

חוק 2 — אף פעם לא 0 בתור ברירת מחדל:
0 מותר רק אם בקובץ באמת כתוב 0. 0 נראה כמו נתון אמיתי (קבוצה שלא בעטה כלל) אבל אם הנתון לא היה בקובץ — 0 הוא שקר.
אם לא מצאת ערך — אל תכניס אותו לסטטיסטיקות בכלל. הסר את השורה מהמערך.
our_pct/opponent_pct: null = לא זמין (אף פעם לא 0 כ"לא יודע").

חוק 3 — אל תמציא, אל תשער, אל תחשב בראש:
כל מספר שמופיע בפלט חייב להיות מופיע בקובץ, מילה במילה. "36%" בקובץ = "36%" בפלט. לא 35%, לא 40%, לא 0. "14 בעיטות" בקובץ = "14" בפלט. העתקה מדויקת, לא עיבוד ולא עיגול.

הסינרגיה: חוק 1 מכריח קריאה יסודית. חוק 2 מונע מילוי שקרי. חוק 3 מונע עיבוד שקרי. הניתוח הוא שקוף נתוני הקובץ, לא פרשנות חופשית.

קביעת עומק הנתונים (analysis_type) — ההחלטה המרכזית:
קרא את הקובץ והעריך כמה נתונים יש בו. ההחלטה קובעת את מבנה הניתוח כולו:
- "summary" = קובץ קצר (תוצאה, סטטיסטיקות בודדות, סיכום קצר). אי אפשר להכריח full על קובץ דל — יקבלו שדות ריקים ומומצאים.
- "full" = קובץ ארוך ומפורט (נתוני שחקנים, מסירות, דו-קרבות, לחץ, נתונים טקטיים מלאים). אי אפשר להכריח summary על קובץ עשיר — יאבדו נתונים חשובים.

הרכבת ניתוח full — פירוק לפרקים:
כל פרק = שלב במשחק (התקפה מאורגנת / הגנה מאורגנת / מעברים). המאמן יכול לקפוץ לפרק הרלוונטי. השוואה מקבילה: בכל פרק, our_value מול opponent_value באותו מדד — המאמן רואה מיד מי עדיף. המספרים נשארים צמודים לטקסט המסביר.

שחקנים בולטים: שם באנגלית (מזהה חד-משמעי), position בעברית, summary מסביר תרומה, stats מוכיחים במספרים.
נושאי אימון: לא מספיק להגיד מה לתקן — צריך urgency (כמה דחוף) ו-rationale (למה, מחובר לנתוני המשחק).
בעיות מרכזיות: קצר וממוקד = קל להפוך לפעולה. אלו יהפכו לנושאי עבודה במערכת.
סיכום מנהלים: תכל'ס — מה לוקחים מהמשחק הזה.

שמות קבוצות: תמיד our_team_name ו-opponent_name שסופקו לך — לעולם אל תשתמש בשמות המקוריים מהקובץ. שם הקובץ הוחלף בשם הרשום במערכת.
שמות שחקנים: באנגלית כמו בקובץ (מזהים חד-משמעיים, תרגום יפגע בדיוק).

מיפוי מונחים לעברית (חובה):
Possession = "החזקת כדור", xG = "שערים צפויים", PPDA = "מדד לחץ הגנתי",
Recoveries = "השבת כדור", Sliding tackles = "החלקות", Clearances = "חיסולים",
Interceptions = "חסימות", Passes to final third = "מסירות לשליש האחרון",
Pass accuracy = "דיוק מסירות", Shots on target = "בעיטות למסגרת",
Ground duels = "דו-קרבות קרקע", Aerial duels = "דו-קרבות אוויר",
Key passes = "מסירות מפתח", Turnovers/losses = "איבודי כדור", Fouls = "עבירות".

ערכים: "63%" לא "63/37". "14" לא "14 מתוך 24".
advantage: "our" / "opponent" / "none". אם הפרש באחוזים 3% או פחות — "none" (שוויון סטטיסטי). אם ערכים שווים — "none".
טון: אנליסט בכיר, ספציפי, מונח מספרים, לא רשמים כלליים.`;

function buildIdentifyTeamsPrompt(fileContent: string, hints: { our_team_name?: string; opponent_name?: string }) {
  return `מהקובץ הבא, זהה את שתי הקבוצות המשתתפות במשחק.
${hints.our_team_name ? `רמז: הקבוצה שלנו היא "${hints.our_team_name}"` : ""}
${hints.opponent_name ? `רמז: היריבה היא "${hints.opponent_name}"` : ""}

החזר JSON בפורמט הבא בלבד:
{"team_a": "שם קבוצה א", "team_b": "שם קבוצה ב"}

תוכן הקובץ:
${fileContent}`;
}

function buildFullAnalysisPrompt(fileContent: string, ourTeam: string, opponent: string) {
  return `נתח את קובץ נתוני המשחק הבא. הקבוצה שלנו: "${ourTeam}". היריבה: "${opponent}".
תמיד השתמש בשמות "${ourTeam}" ו-"${opponent}" — אף פעם לא השמות מהקובץ.

קביעת עומק הנתונים (analysis_type):
- "summary" = קובץ קצר (תוצאה, סטטיסטיקות בודדות, סיכום קצר)
- "full" = קובץ ארוך ומפורט (נתוני שחקנים, מסירות, דו-קרבות, לחץ, נתונים טקטיים מלאים)

החזר JSON בפורמט:
{
  "analysis_type": "summary" | "full",
  "match_details": {
    "date": "YYYY-MM-DD" | null,
    "our_score": number | null,
    "opponent_score": number | null,
    "location": "בית" | "חוץ"
  },
  "summary_report": {
    "what_happened": "פסקה — מה קרה, עם מספרים אמיתיים מהקובץ",
    "what_went_well": ["דבר חיובי עם מספרים"],
    "what_went_poorly": ["בעיה ספציפית עם מספרים"],
    "training_topics": ["נושא לאימון"]
  },
  "full_report": {
    "tactical_overview": "מערך, קו הגנה, מאיפה הגיעו הגולים",
    "possession_passing_summary": "סיכום החזקה ומסירות",
    "possession_passing_stats": [{"label": "שם מדד בעברית", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our"|"opponent"|"none"}],
    "defense_pressure_summary": "סיכום הגנה ולחץ",
    "defense_pressure_stats": [{"label": "שם מדד", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our"|"opponent"|"none"}],
    "duels_transitions_summary": "סיכום דו-קרבות ומעברים",
    "duels_transitions_stats": [{"label": "שם מדד", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our"|"opponent"|"none"}],
    "standout_players": [{"name": "שם באנגלית", "position": "עמדה בעברית", "summary": "תיאור תרומתו", "stats": [{"label": "מדד", "value": "ערך"}]}],
    "training_topics": [{"topic": "נושא", "urgency": "דחוף"|"חשוב", "rationale": "הסבר"}],
    "key_issues": ["בעיה מרכזית 1", "בעיה מרכזית 2"],
    "executive_summary": "3-4 משפטים — המסקנה הכי חשובה"
  }
}

חוקי תוכן:
- possession_passing_stats: 4-6 מדדים (רק מה שקיים בקובץ)
- defense_pressure_stats: 4-6 מדדים
- duels_transitions_stats: 3-5 מדדים
- standout_players: 4-5 שחקנים
- training_topics: 3-6 נושאים
- key_issues: 3-6 בעיות
- summary_report: תמיד יהיה קיים (גם ב-full)
- full_report: רק אם analysis_type="full", אחרת null

תוכן הקובץ:
${fileContent}`;
}

function buildDeepDivePrompt(fileContent: string, question: string, ourTeam: string, opponent: string) {
  return `בהתבסס אך ורק על הנתונים מקובץ המשחק של ${ourTeam} מול ${opponent}, ענה על השאלה הבאה:

"${question}"

פלט אך ורק על סמך מה שיש בקובץ — אל תמציא, אל תשער.
תמיד השתמש בשמות "${ourTeam}" ו-"${opponent}" — אף פעם לא השמות מהקובץ.
שמות שחקנים: באנגלית כמו בקובץ.
אל תשתמש ב-markdown.

החזר JSON בפורמט:
{
  "title": "כותרת קצרה בעברית (עד 6 מילים), כהצהרה. דוגמאות: פריסת המערכים במשחק, שליטה במרכז המגרש",
  "blocks": [
    {
      "subtitle": "כותרת משנה (3-5 מילים)",
      "content": "1-3 משפטים בעברית",
      "highlights": [{"label": "שם מדד", "value": "ערך עם יחידות כמו 54%"}]
    }
  ],
  "no_data": false
}

no_data: true אך ורק אם המידע לא קיים בקובץ — במקרה כזה blocks=[], title="אין מידע בקובץ".
מידע חלקי — no_data=false, תן מה שיש, ציין מה חסר.
highlights: 0-4 נקודות מספריות בכל block.

אם אין בקובץ מידע רלוונטי לשאלה, החזר: {"title": "אין מידע בקובץ", "blocks": [], "no_data": true}

תוכן הקובץ:
${fileContent}`;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { mode, file_url, file_content, our_team_name, opponent_name, question } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500, headers: CORS_HEADERS,
      });
    }

    // Resolve file content: use provided text, or fetch from URL
    let resolvedContent = file_content || "";
    if (!resolvedContent && file_url) {
      try {
        const fileResp = await fetch(file_url);
        if (fileResp.ok) {
          const contentType = fileResp.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            resolvedContent = await fileResp.text();
          } else if (contentType.includes("text") || contentType.includes("csv")) {
            resolvedContent = await fileResp.text();
          } else {
            // Binary file (PDF/Excel) — send as base64 inline data to Gemini
            const arrayBuf = await fileResp.arrayBuffer();
            const bytes = new Uint8Array(arrayBuf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            // Use Gemini inline_data for binary files
            let userPrompt: string;
            if (mode === "identify_teams") {
              userPrompt = buildIdentifyTeamsPrompt("(הקובץ מצורף כקובץ בינארי)", { our_team_name, opponent_name });
            } else if (mode === "deep_dive") {
              userPrompt = buildDeepDivePrompt("(הקובץ מצורף כקובץ בינארי)", question, our_team_name || "", opponent_name || "");
            } else {
              userPrompt = buildFullAnalysisPrompt("(הקובץ מצורף כקובץ בינארי)", our_team_name || "הקבוצה שלנו", opponent_name || "היריבה");
            }

            const mimeType = contentType.split(";")[0].trim() || "application/pdf";
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ parts: [
                  { inline_data: { mime_type: mimeType, data: base64 } },
                  { text: userPrompt }
                ] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 8192,
                  responseMimeType: "application/json",
                },
              }),
            });

            if (!response.ok) {
              const err = await response.text();
              return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}`, details: err }), {
                status: 502, headers: CORS_HEADERS,
              });
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              return new Response(JSON.stringify({ error: "Failed to parse Gemini response", raw: text }), {
                status: 500, headers: CORS_HEADERS,
              });
            }
            return new Response(JSON.stringify({ data: JSON.parse(jsonMatch[0]) }), { headers: CORS_HEADERS });
          }
        }
      } catch (fetchErr) {
        resolvedContent = `(שגיאה בקריאת הקובץ: ${fetchErr.message})`;
      }
    }

    let userPrompt: string;
    if (mode === "identify_teams") {
      userPrompt = buildIdentifyTeamsPrompt(resolvedContent, { our_team_name, opponent_name });
    } else if (mode === "deep_dive") {
      userPrompt = buildDeepDivePrompt(resolvedContent, question, our_team_name || "", opponent_name || "");
    } else {
      userPrompt = buildFullAnalysisPrompt(resolvedContent, our_team_name || "הקבוצה שלנו", opponent_name || "היריבה");
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}`, details: err }), {
        status: 502, headers: CORS_HEADERS,
      });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Failed to parse Gemini response", raw: text }), {
        status: 500, headers: CORS_HEADERS,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify({ data: parsed }), {
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: CORS_HEADERS,
    });
  }
});
