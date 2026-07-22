import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SYSTEM_PROMPT } from "./systemPrompt.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

// Per-user daily cap on LLM calls. Admins are exempt.
const DAILY_LLM_CAP = 200;
const ADMIN_EMAIL = "romfranko99@gmail.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── Require a valid authenticated user. Without this the endpoint is an
    //    open proxy to the shared Gemini key — anyone could drain the budget.
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { prompt, response_json_schema } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return jsonResponse({ error: "prompt is required" }, 400);
    }

    // ── Enforce a per-user daily cap (service role; the table denies all
    //    client access via RLS). Admins are exempt. Fail CLOSED on error.
    const isAdmin = user.email === ADMIN_EMAIL;
    if (!isAdmin) {
      const service = createClient(supabaseUrl, serviceKey);
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage, error: usageErr } = await service
        .from("llm_usage_daily")
        .select("count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();
      if (usageErr) {
        return jsonResponse({ error: "Usage check failed", error_code: "usage_unavailable" }, 503);
      }
      const used = usage?.count ?? 0;
      if (used >= DAILY_LLM_CAP) {
        return jsonResponse({ error: "Daily limit reached", error_code: "quota_exceeded" }, 429);
      }
      const { error: upErr } = await service
        .from("llm_usage_daily")
        .upsert(
          { user_id: user.id, usage_date: today, count: used + 1, updated_at: new Date().toISOString() },
          { onConflict: "user_id,usage_date" },
        );
      if (upErr) {
        return jsonResponse({ error: "Usage update failed", error_code: "usage_unavailable" }, 503);
      }
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY not configured" }, 500);
    }

    const generationConfig: Record<string, unknown> = {
      temperature: 0.3,
      maxOutputTokens: 4096,
    };

    let finalPrompt = prompt;
    if (response_json_schema) {
      finalPrompt = `${prompt}

החזר JSON תקין בלבד התואם בדיוק לסכמה הבאה (ללא טקסט נוסף, ללא markdown, רק JSON):
${JSON.stringify(response_json_schema)}`;
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return jsonResponse({
        error: `Gemini API error: ${response.status}`,
        error_code: response.status === 429 ? "quota_exceeded" : "llm_unavailable",
        details: err,
      });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (response_json_schema) {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        return jsonResponse({ error: "Failed to parse LLM JSON response", raw: text }, 500);
      }
      try {
        return jsonResponse({ data: JSON.parse(jsonMatch[0]) });
      } catch {
        return jsonResponse({ error: "Invalid JSON from LLM", raw: text }, 500);
      }
    }

    return jsonResponse({ data: text });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
