import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SYSTEM_PROMPT } from "./systemPrompt.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

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
    const { prompt, response_json_schema } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return jsonResponse({ error: "prompt is required" }, 400);
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
