import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const FIELD_ATTRIBUTES = ["passing", "dribbling", "finishing", "tackling", "defensive_positioning", "speed", "strength", "heading", "vision", "decision_making"];
const GK_ATTRIBUTES = ["reflexes", "shot_stopping", "one_on_one", "high_balls", "positioning", "timing", "box_control", "short_passing", "long_passing", "decision_under_pressure", "agility", "jumping", "physical_strength"];

const SYSTEM_PROMPT = `אתה מנטור כדורגל בכיר עם 20+ שנות ניסיון. אתה מנתח מגמות ביצוע של שחקנים לאורך זמן ומחליט אם לעדכן את דירוגי היכולות שלהם.

כללי ברזל:
1. אל תמציא נתונים. אם אין מספיק מידע (פחות מ-5 משחקים) — אל תשנה כלום.
2. שינוי רק על בסיס מגמה עקבית. משחק טוב או רע אחד = אין שינוי.
3. שינויים קטנים בלבד: מקסימום 1 נקודה למאפיין (סולם 1-5).
4. היה שמרני. ברירת המחדל היא "אין שינוי".
5. הנמקה קצרה וענייני, בטון של מנטור בכיר.
6. תמיד ענה בעברית.
7. תמיד החזר JSON תקין בלבד.`;

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
    const { player_id } = await req.json();
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header for RLS context
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    // 1. Fetch the player
    const { data: player, error: playerErr } = await supabase
      .from("players")
      .select("*")
      .eq("id", player_id)
      .eq("user_id", user.id)
      .single();

    if (playerErr || !player) {
      return jsonResponse({ error: "Player not found" }, 404);
    }

    const matchHistory = player.match_history || [];
    if (matchHistory.length < 5) {
      return jsonResponse({
        adjusted: false,
        reason: "אין מספיק נתוני משחקים (נדרשים לפחות 5)",
        match_count: matchHistory.length,
      });
    }

    // 2. Gather all available data about this player
    const [
      { data: trainingEvals },
      { data: matchAnalyses },
      { data: attributeHistory },
    ] = await Promise.all([
      supabase
        .from("training_session_evaluations")
        .select("training_date, rating, coach_note, focus_areas, improvement_observed")
        .eq("player_id", player_id)
        .order("training_date", { ascending: false })
        .limit(20),
      supabase
        .from("match_analyses")
        .select("opponent, date, player_ratings, free_notes")
        .eq("team_id", player.team_id)
        .order("date", { ascending: false })
        .limit(20),
      supabase
        .from("player_attribute_history")
        .select("attribute_name, rating, recorded_at")
        .eq("player_id", player_id)
        .order("recorded_at", { ascending: false })
        .limit(50),
    ]);

    // Extract this player's ratings from match analyses
    const playerMatchRatings = (matchAnalyses || [])
      .filter(a => a.player_ratings?.some((r: any) => r.player_id === player_id))
      .map(a => {
        const pr = a.player_ratings.find((r: any) => r.player_id === player_id);
        return { opponent: a.opponent, date: a.date, rating: pr?.rating, note: pr?.note };
      });

    const isGK = player.position === "שוער";
    const attributeNames = isGK ? GK_ATTRIBUTES : FIELD_ATTRIBUTES;

    // 3. Build the prompt
    const playerContext = {
      name: player.name,
      position: player.position,
      current_ratings: player.skill_ratings || {},
      strengths: player.strengths || [],
      improvements: player.improvements || [],
      coach_notes: player.coach_professional_notes || "",
      match_history: matchHistory.slice(-10),
      season_stats: {
        goals: player.season_goals,
        assists: player.season_assists,
        games: player.games_played,
        minutes: player.minutes_played,
      },
      match_ratings: playerMatchRatings.slice(0, 10),
      training_evaluations: (trainingEvals || []).slice(0, 10),
      attribute_history: (attributeHistory || []).slice(0, 30),
    };

    const userPrompt = `להלן כל הנתונים הזמינים על השחקן ${player.name} (${player.position}):

${JSON.stringify(playerContext, null, 2)}

המאפיינים הנוכחיים (סולם 1-5):
${attributeNames.map(a => `${a}: ${playerContext.current_ratings[a] ?? "לא מוגדר"}`).join("\n")}

בהתבסס על כל הנתונים, האם יש מגמה עקבית (5+ משחקים) שמצדיקה שינוי במאפיינים?

החזר JSON בפורמט הבא בלבד:
{
  "adjustments": [
    {"attribute_name": "שם_מאפיין", "change": 1, "reasoning": "הסבר קצר"}
  ],
  "summary": "סיכום כללי קצר של ההערכה",
  "has_changes": true/false
}

כללים:
- change יכול להיות 1 או -1 בלבד
- אין לשנות מאפיין מעבר לטווח 1-5
- אם אין מגמה ברורה, החזר adjustments ריק ו-has_changes: false
- מאפיינים חוקיים: ${attributeNames.join(", ")}`;

    // 4. Call Gemini
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return jsonResponse({ error: `Gemini API error: ${geminiRes.status}`, details: err }, 502);
    }

    const geminiResult = await geminiRes.json();
    const text = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return jsonResponse({ error: "Failed to parse Gemini response", raw: text }, 500);
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    if (!evaluation.has_changes || !evaluation.adjustments?.length) {
      return jsonResponse({
        adjusted: false,
        reason: evaluation.summary || "אין שינויים נדרשים",
        match_count: matchHistory.length,
      });
    }

    // 5. Apply changes
    const currentRatings = { ...(player.skill_ratings || {}) };
    const historyRows: any[] = [];
    const appliedAdjustments: any[] = [];

    for (const adj of evaluation.adjustments) {
      const attr = adj.attribute_name;
      if (!attributeNames.includes(attr)) continue;

      const oldVal = currentRatings[attr];
      if (oldVal == null) continue;

      const change = Math.max(-1, Math.min(1, adj.change));
      const newVal = Math.max(1, Math.min(5, oldVal + change));
      if (newVal === oldVal) continue;

      // Record old value to history
      historyRows.push({
        player_id,
        user_id: user.id,
        attribute_name: attr,
        rating: oldVal,
        source: "ai",
        note: adj.reasoning || null,
      });

      currentRatings[attr] = newVal;
      appliedAdjustments.push({
        attribute_name: attr,
        old_value: oldVal,
        new_value: newVal,
        change,
        reasoning: adj.reasoning,
      });
    }

    if (appliedAdjustments.length === 0) {
      return jsonResponse({
        adjusted: false,
        reason: evaluation.summary || "אין שינויים תקפים",
        match_count: matchHistory.length,
      });
    }

    // Save history
    if (historyRows.length > 0) {
      await supabase.from("player_attribute_history").insert(historyRows);
    }

    // Build AI note
    const aiNote = `[הערכת AI — ${new Date().toLocaleDateString("he-IL")}]\n${evaluation.summary}\n\n` +
      appliedAdjustments.map(a =>
        `• ${a.attribute_name}: ${a.old_value} → ${a.new_value} (${a.change > 0 ? "שיפור" : "ירידה"}) — ${a.reasoning}`
      ).join("\n");

    const existingNotes = player.coach_professional_notes || "";
    const updatedNotes = aiNote + (existingNotes ? "\n\n---\n\n" + existingNotes : "");

    // Update player
    await supabase
      .from("players")
      .update({
        skill_ratings: currentRatings,
        coach_professional_notes: updatedNotes,
      })
      .eq("id", player_id);

    return jsonResponse({
      adjusted: true,
      adjustments: appliedAdjustments,
      summary: evaluation.summary,
      match_count: matchHistory.length,
    });

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
