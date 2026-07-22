import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

// Daily quotas (server-enforced). See migration 20260719000000_file_analysis_usage.
const LIMITS = { uploads: 2, analyses: 2, questions: 3 };

// Stable short key for a file within a day's usage row.
function fileKey(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  return "f" + (h >>> 0).toString(36);
}

function nextUtcMidnight(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

// Returns { blocked?: {...}, commit: () => Promise<usage> }. If the DB isn't
// reachable, enforcement is skipped (analysis still runs) rather than failing.
async function enforceQuota(req: Request, mode: string, url: string) {
  const noop = { commit: async () => null as unknown };
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) return noop;

    const authHeader = req.headers.get("Authorization") || "";
    const authed = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return noop; // unauthenticated calls aren't metered here

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Admins are exempt from all quotas. Canonical check is profiles.role;
    // the founding admin email is kept as a fallback.
    const ADMIN_EMAIL = "romfranko99@gmail.com";
    let isAdmin = user.email === ADMIN_EMAIL;
    if (!isAdmin) {
      const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).limit(1);
      isAdmin = prof?.[0]?.role === "admin";
    }
    if (isAdmin) return noop;

    const day = new Date().toISOString().slice(0, 10);
    const { data: rows } = await admin
      .from("file_analysis_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("day", day)
      .limit(1);
    const row = rows?.[0] || { user_id: user.id, day, uploads: 0, analyses: {}, questions: {} };
    const key = url ? fileKey(url) : "_";

    const mkBlocked = (code: string, limit: number, used: number) => ({
      blocked: { code, limit, used, reset_at: nextUtcMidnight() },
      commit: async () => null as unknown,
    });

    if (mode === "identify_teams") {
      if ((row.uploads || 0) >= LIMITS.uploads) return mkBlocked("LIMIT_UPLOADS", LIMITS.uploads, row.uploads);
    } else if (mode === "deep_dive") {
      const used = row.questions?.[key] || 0;
      if (used >= LIMITS.questions) return mkBlocked("LIMIT_QUESTIONS", LIMITS.questions, used);
    } else {
      const used = row.analyses?.[key] || 0;
      if (used >= LIMITS.analyses) return mkBlocked("LIMIT_ANALYSES", LIMITS.analyses, used);
    }

    // Not blocked — commit() bumps the counter once the analysis succeeds.
    const commit = async () => {
      const next = { ...row };
      if (mode === "identify_teams") next.uploads = (row.uploads || 0) + 1;
      else if (mode === "deep_dive") next.questions = { ...(row.questions || {}), [key]: (row.questions?.[key] || 0) + 1 };
      else next.analyses = { ...(row.analyses || {}), [key]: (row.analyses?.[key] || 0) + 1 };
      await admin.from("file_analysis_usage").upsert({
        user_id: user.id, day, uploads: next.uploads || 0,
        analyses: next.analyses || {}, questions: next.questions || {}, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,day" });
      return {
        uploads_used: next.uploads || 0, uploads_remaining: Math.max(0, LIMITS.uploads - (next.uploads || 0)),
        analyses_used_for_file: next.analyses?.[key] || 0, analyses_remaining_for_file: Math.max(0, LIMITS.analyses - (next.analyses?.[key] || 0)),
        questions_used_for_file: next.questions?.[key] || 0, questions_remaining: Math.max(0, LIMITS.questions - (next.questions?.[key] || 0)),
      };
    };
    return { commit };
  } catch (_e) {
    return noop; // never let quota bookkeeping break analysis
  }
}

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
    "competition": "שם התחרות/ליגה" | null,
    "our_score": number | null,
    "opponent_score": number | null,
    "location": "בית" | "חוץ",
    "scorers": [{"name": "שם הכובש באנגלית", "minute": number|null, "team": "our"|"opponent"}]
  },
  "summary_report": {
    "what_happened": "פסקה — מה קרה, עם מספרים אמיתיים מהקובץ",
    "what_went_well": ["דבר חיובי עם מספרים"],
    "what_went_poorly": ["בעיה ספציפית עם מספרים"],
    "training_topics": ["נושא לאימון"]
  },
  "full_report": {
    "tactical_overview": "מערך, קו הגנה, מאיפה הגיעו הגולים",
    "headline_insights": [{"type": "good"|"bad"|"watch", "text": "משפט קצר עם מספרים מהקובץ"}],
    "key_metrics": [{"label": "שם מדד בעברית", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "better_when": "high"|"low"}],
    "possession_passing_summary": "סיכום החזקה ומסירות",
    "possession_passing_stats": [{"label": "שם מדד בעברית", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our"|"opponent"|"none"}],
    "defense_pressure_summary": "סיכום הגנה ולחץ",
    "defense_pressure_stats": [{"label": "שם מדד", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our"|"opponent"|"none"}],
    "duels_transitions_summary": "סיכום דו-קרבות ומעברים",
    "duels_transitions_stats": [{"label": "שם מדד", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our"|"opponent"|"none"}],
    "halves": {"first": {"score": "1–0"|null, "summary": "סיפור המחצית עם מספרים", "pass_accuracy": "81%"|null, "ppda": "7.9"|null}, "second": {"score": "1–1"|null, "summary": "...", "pass_accuracy": null, "ppda": null}} | null,
    "possession_by_interval": [{"interval": "1-15", "our_pct": number|null}],
    "standout_players": [{"name": "שם באנגלית", "shirt_number": "13"|null, "position": "עמדה בעברית", "moment": "שער בדקה 55'"|null, "summary": "תיאור תרומתו", "stats": [{"label": "מדד", "value": "ערך"}]}],
    "training_topics": [{"topic": "נושא", "urgency": "דחוף"|"חשוב", "rationale": "הסבר", "rationale_with_numbers": "נימוק תמציתי עם מספרים מהקובץ"}],
    "key_issues": ["בעיה מרכזית 1", "בעיה מרכזית 2"],
    "executive_summary": "3-4 משפטים — המסקנה הכי חשובה"
  }
}

חוקי תוכן:
- headline_insights: בדיוק 3 — אחת type="good" (מה עבד), אחת "bad" (מה לתקן), אחת "watch" (לשים לב). כל אחת משפט אחד עם מספרים אמיתיים
- key_metrics: 3-6 מדדים מספריים מרכזיים (החזקה, דיוק מסירות, דו-קרבות, שערים צפויים...) עם better_when ("high"=גבוה טוב, "low"=נמוך טוב כמו עבירות/PPDA). רק מה שקיים בקובץ
- possession_passing_stats: 4-6 מדדים (רק מה שקיים בקובץ)
- defense_pressure_stats: 4-6 מדדים
- duels_transitions_stats: 3-5 מדדים
- halves: רק אם הקובץ מפרק למחצית א'/ב', אחרת null
- possession_by_interval: אחוזי החזקה שלנו לפי רבעי-שעה (עד 6: 1-15, 16-30...). רק אם קיים בקובץ, אחרת []
- standout_players: 4-5 שחקנים (shirt_number ו-moment אם קיימים)
- training_topics: 3-6 נושאים (rationale_with_numbers = נימוק עם מספרים)
- match_details: כלול competition ו-scorers אם מופיעים בקובץ
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
    // ── Require an authenticated user. Without this the LLM + file fetch
    //    are open to anyone (budget drain + SSRF).
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!SUPABASE_URL || !ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: CORS_HEADERS });
    }
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }
    const authedClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: authUser } } = await authedClient.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }

    const { mode, file_url, file_content, our_team_name, opponent_name, question } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500, headers: CORS_HEADERS,
      });
    }

    // ── SSRF guard: only fetch files from our own Supabase storage host.
    if (file_url) {
      let host = "";
      try { host = new URL(file_url).host; } catch { /* invalid */ }
      if (host !== new URL(SUPABASE_URL).host) {
        return new Response(JSON.stringify({ error: "Invalid file_url" }), { status: 400, headers: CORS_HEADERS });
      }
    }

    // Server-side daily quota. Blocked → 200 with a limit_error the UI can read.
    const quota = await enforceQuota(req, mode || "full", file_url || "");
    if (quota.blocked) {
      return new Response(JSON.stringify({ limit_error: quota.blocked }), { headers: CORS_HEADERS });
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
            const usage = await quota.commit();
            return new Response(JSON.stringify({ data: JSON.parse(jsonMatch[0]), usage }), { headers: CORS_HEADERS });
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
    const usage = await quota.commit();
    return new Response(JSON.stringify({ data: parsed, usage }), {
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: CORS_HEADERS,
    });
  }
});
