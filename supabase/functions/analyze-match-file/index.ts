import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_PROMPT = `אתה מנתח כדורגל מקצועי. אתה מקבל קובץ נתוני משחק ומנתח אותו.

כללי ברזל:
1. אל תמציא מספרים. אם הנתון לא מופיע בקובץ – כתוב "לא צוין בקובץ".
2. אל תנחש תוצאות, שמות שחקנים, או סטטיסטיקות שלא מופיעים מפורשות בקובץ.
3. כל מספר שאתה מציג חייב להגיע ישירות מהנתונים שהתקבלו.
4. אם אין מספיק מידע לניתוח מסוים – ציין זאת בפירוש.
5. תמיד ענה בעברית.
6. תמיד החזר JSON תקין בלבד, בלי טקסט נוסף לפני או אחרי.`;

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
  return `נתח את קובץ נתוני המשחק הבא של ${ourTeam} מול ${opponent}.

החזר JSON בפורמט הבא (בעברית):
{
  "analysis_type": "full",
  "match_details": { "date": "YYYY-MM-DD או לא צוין", "our_score": number|null, "opponent_score": number|null, "location": "בית/חוץ/לא צוין" },
  "full_report": {
    "tactical_overview": "סקירה טקטית כללית",
    "possession_passing_summary": "סיכום החזקה ומסירות",
    "possession_passing_stats": [{ "label": "שם מדד", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our_team|opponent|none" }],
    "defense_pressure_summary": "סיכום הגנה",
    "defense_pressure_stats": [{ "label": "שם מדד", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our_team|opponent|none" }],
    "duels_transitions_summary": "סיכום דו-קרבות",
    "duels_transitions_stats": [{ "label": "שם מדד", "our_value": "ערך", "opponent_value": "ערך", "our_pct": number|null, "opponent_pct": number|null, "advantage": "our_team|opponent|none" }],
    "key_issues": ["בעיה 1", "בעיה 2"],
    "training_topics": [{ "topic": "נושא", "urgency": "גבוהה|בינונית|רגיל", "rationale": "הסבר" }],
    "standout_players": [{ "name": "שם", "positive": true, "note": "הערה" }],
    "executive_summary": "סיכום מנהלים קצר"
  },
  "summary_report": {
    "what_happened": "מה קרה במשחק",
    "what_went_well": ["דבר טוב 1"],
    "what_went_poorly": ["דבר רע 1"],
    "training_topics": ["נושא לאימון 1"]
  }
}

זכור: רק נתונים שמופיעים בקובץ! אל תמציא מספרים.

תוכן הקובץ:
${fileContent}`;
}

function buildDeepDivePrompt(fileContent: string, question: string, ourTeam: string, opponent: string) {
  return `בהתבסס אך ורק על הנתונים מקובץ המשחק של ${ourTeam} מול ${opponent}, ענה על השאלה הבאה:

"${question}"

החזר JSON בפורמט:
{
  "title": "כותרת התשובה",
  "blocks": [{ "subtitle": "כותרת משנה", "content": "תוכן", "highlights": ["נקודה חשובה"] }],
  "no_data": false
}

אם אין בקובץ מידע רלוונטי לשאלה, החזר: {"title": "אין מידע", "blocks": [], "no_data": true}

תוכן הקובץ:
${fileContent}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { mode, file_content, our_team_name, opponent_name, question } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let userPrompt: string;
    if (mode === "identify_teams") {
      userPrompt = buildIdentifyTeamsPrompt(file_content, { our_team_name, opponent_name });
    } else if (mode === "deep_dive") {
      userPrompt = buildDeepDivePrompt(file_content, question, our_team_name || "", opponent_name || "");
    } else {
      userPrompt = buildFullAnalysisPrompt(file_content, our_team_name || "הקבוצה שלנו", opponent_name || "היריבה");
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}`, details: err }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Failed to parse Gemini response", raw: text }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify({ data: parsed }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
