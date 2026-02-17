import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-pro-preview-05-06";
const GEMINI_FALLBACK = "gemini-2.0-flash";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ================================================
   HELPERS
   ================================================ */

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 400) {
  return jsonResponse({ error: { code, message } }, status);
}

async function callGemini(prompt: string, model = GEMINI_MODEL): Promise<string> {
  const url = `${GEMINI_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Gemini ${model} error:`, errText);

    // Fallback to Flash if Pro fails
    if (model === GEMINI_MODEL && model !== GEMINI_FALLBACK) {
      console.log("Falling back to", GEMINI_FALLBACK);
      return callGemini(prompt, GEMINI_FALLBACK);
    }
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

function parseJsonSafe(text: string): unknown {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned);
}

/* ================================================
   ACTION: extractPdf
   ================================================ */

async function handleExtractPdf(body: any, supabase: any, userId: string) {
  const { text, fileName } = body;

  if (!text || text.length < 50) {
    return errorResponse("validation_failed", "Text content is too short");
  }

  const prompt = `You are a travel data extraction expert. Extract ALL attractions, restaurants, activities, temples, shrines, markets, and points of interest from the following travel document text.

For EACH attraction found, provide:
- "name": Hebrew name (or original name if Hebrew not available)
- "name_en": English name
- "city": Hebrew city name
- "city_en": English city name
- "area": neighborhood/district name in English (e.g., "Shibuya", "Gion", "Dotonbori")
- "category": one of "temple", "shrine", "museum", "park", "nature", "shopping", "market", "restaurant", "cafe", "food", "nightlife", "entertainment", "onsen", "viewpoint", "activity"
- "description": 1-2 sentence Hebrew description of what this place is
- "emoji": relevant emoji
- "why_visit": Hebrew explanation of why to visit (1-2 sentences)
- "estimated_duration": estimated visit time in Hebrew (e.g., "שעה", "שעתיים", "חצי שעה")
- "estimated_cost": estimated cost in Japanese Yen (number, 0 if free)
- "best_time": best time to visit in Hebrew (e.g., "בוקר מוקדם", "אחר הצהריים")
- "booking_url": URL if mentioned, null otherwise

IMPORTANT RULES:
- Extract EVERY distinct place/attraction mentioned, even briefly
- Hebrew text for description, why_visit, estimated_duration, best_time
- English for name_en, city_en, area
- If a place appears multiple times, include it only once
- Be thorough - extract restaurants, cafes, shops, not just tourist attractions
- Return ONLY a JSON object with an "attractions" array

Document text:
${text.substring(0, 25000)}`;

  try {
    const raw = await callGemini(prompt);
    const parsed = parseJsonSafe(raw) as any;

    if (!parsed || !Array.isArray(parsed.attractions)) {
      return errorResponse("validation_failed", "Failed to parse extracted attractions");
    }

    return jsonResponse({
      attractions: parsed.attractions,
      count: parsed.attractions.length,
      source: fileName || "uploaded document",
    });
  } catch (e) {
    console.error("extractPdf error:", e);
    return errorResponse("generation_failed", (e as Error).message, 500);
  }
}

/* ================================================
   ACTION: suggestAttractions
   ================================================ */

async function handleSuggestAttractions(body: any, supabase: any, userId: string) {
  const { city, city_en } = body;

  const cityName = city_en || city;
  if (!cityName) {
    return errorResponse("validation_failed", "city or city_en is required");
  }

  const prompt = `You are a Japan travel expert. Generate a comprehensive list of 20-25 popular attractions, restaurants, and points of interest in ${cityName}, Japan.

For EACH place, provide ALL of these fields:
- "name": Hebrew name
- "name_en": English name (official/common name)
- "city": "${city || cityName}" (Hebrew city name)
- "city_en": "${city_en || cityName}" (English city name)
- "area": neighborhood/district in English (e.g., "Shibuya", "Gion", "Dotonbori")
- "category": one of "temple", "shrine", "museum", "park", "nature", "shopping", "market", "restaurant", "cafe", "food", "nightlife", "entertainment", "onsen", "viewpoint", "activity"
- "description": 1-2 sentence Hebrew description
- "emoji": relevant emoji
- "why_visit": Hebrew explanation of why to visit (1-2 sentences)
- "estimated_duration": visit time in Hebrew (e.g., "שעה", "שעתיים", "חצי שעה")
- "estimated_cost": cost in Japanese Yen (number, 0 if free)
- "best_time": best time to visit in Hebrew (e.g., "בוקר מוקדם", "אחר הצהריים")
- "booking_url": null (unless well-known booking page)

IMPORTANT RULES:
- Include a MIX of categories: temples/shrines, viewpoints, parks, shopping areas, restaurants, cafes, markets, entertainment
- Include both famous tourist spots AND local favorites
- Group nearby attractions by area/neighborhood
- Hebrew for description, why_visit, estimated_duration, best_time
- English for name_en, city_en, area
- Return ONLY a JSON object with an "attractions" array

Return the JSON object.`;

  try {
    const raw = await callGemini(prompt);
    const parsed = parseJsonSafe(raw) as any;

    if (!parsed || !Array.isArray(parsed.attractions) || parsed.attractions.length < 5) {
      return errorResponse("validation_failed", "Failed to generate attractions list");
    }

    return jsonResponse({
      attractions: parsed.attractions,
      count: parsed.attractions.length,
      city: cityName,
    });
  } catch (e) {
    console.error("suggestAttractions error:", e);
    return errorResponse("generation_failed", (e as Error).message, 500);
  }
}

/* ================================================
   ACTION: ingestAttraction
   ================================================ */

async function handleIngestAttraction(body: any, supabase: any, userId: string) {
  const { name, name_en, city, city_en, place_id, lat, lng, category, source_type, source_url, source_note, description, emoji, estimated_cost, cost_currency, booking_required, booking_url, opening_hours, best_time, why_visit, estimated_duration } = body;

  if (!name || !city) {
    return errorResponse("validation_failed", "name and city are required");
  }

  // Check for duplicate by place_id
  if (place_id) {
    const { data: existing } = await supabase
      .from("attractions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("place_id", place_id)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ duplicate: true, existing_id: existing.id, status: existing.status });
    }
  }

  // Check for duplicate by name + city
  const { data: nameMatch } = await supabase
    .from("attractions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("city_en", city_en || city)
    .ilike("name", name)
    .maybeSingle();

  if (nameMatch) {
    return jsonResponse({ duplicate: true, existing_id: nameMatch.id, status: nameMatch.status });
  }

  const { data, error } = await supabase
    .from("attractions")
    .insert({
      user_id: userId,
      name, name_en, city, city_en, place_id, lat, lng,
      category: category || "activity",
      source_type: source_type || "manual",
      source_url, source_note, description, emoji,
      estimated_cost, cost_currency, booking_required, booking_url,
      opening_hours, best_time, why_visit, estimated_duration,
      status: "pending",
    })
    .select()
    .single();

  if (error) return errorResponse("db_error", error.message, 500);
  return jsonResponse({ success: true, attraction: data });
}

/* ================================================
   ACTION: cityOptions
   ================================================ */

async function handleCityOptions(body: any, supabase: any, userId: string) {
  const { city, city_en, date, dayOfWeek, preferences, approvedAttractions } = body;

  const cityName = city_en || city || "Japan";
  const prefText = preferences ? JSON.stringify(preferences) : "balanced pace, mixed interests";

  // Get approved must-do attractions for this city
  let mustDoList = "";
  if (approvedAttractions && approvedAttractions.length > 0) {
    mustDoList = `\n\nIMPORTANT - The user has these MUST-DO approved attractions for ${cityName} that MUST be included in at least one option:\n${approvedAttractions.map((a: any) => `- ${a.name} (${a.name_en || ""})`).join("\n")}`;
  }

  const prompt = `You are a travel planning expert for ${cityName}.
Generate 3-5 different day-trip concept options for a tourist visiting ${cityName}${date ? ` on ${date} (${dayOfWeek || ""})` : ""}.

User preferences: ${prefText}
${mustDoList}

Each option should be a themed concept grouping nearby attractions that make geographic sense together.

Return a JSON array where each element has:
- "id": unique string identifier (e.g. "option_1")
- "title": short Hebrew title for the concept (e.g. "אקיהברה ואוונו - אנימה וטבע")
- "title_en": English version
- "description": 2-3 sentence Hebrew description of what this day includes
- "areas": array of neighborhood/area names in English
- "highlight_count": number of main attractions (4-6)
- "food_count": number of food stops (2-3)
- "estimated_walking_km": rough estimate
- "vibe": one of "cultural", "nature", "urban", "food", "shopping", "mixed"

Return ONLY the JSON array, no other text.`;

  try {
    const raw = await callGemini(prompt);
    const options = parseJsonSafe(raw);

    if (!Array.isArray(options) || options.length < 2) {
      return errorResponse("validation_failed", "Invalid options format from AI");
    }

    return jsonResponse({ options });
  } catch (e) {
    console.error("cityOptions error:", e);
    return errorResponse("generation_failed", (e as Error).message, 500);
  }
}

/* ================================================
   ACTION: dayPlan
   ================================================ */

async function handleDayPlan(body: any, supabase: any, userId: string) {
  const { city, city_en, date, dayOfWeek, selectedOption, preferences, approvedAttractions, hotel } = body;

  if (!selectedOption) {
    return errorResponse("validation_failed", "selectedOption is required");
  }

  const cityName = city_en || city || "the city";
  const prefText = preferences ? JSON.stringify(preferences) : "balanced pace, mixed interests";
  const optionDesc = typeof selectedOption === "string" ? selectedOption : JSON.stringify(selectedOption);

  let mustDoInstructions = "";
  if (approvedAttractions && approvedAttractions.length > 0) {
    mustDoInstructions = `\n\nMUST-DO attractions that MUST appear in the plan:\n${approvedAttractions.map((a: any) => `- ${a.name} (${a.name_en || ""}) - ${a.why_visit || ""}`).join("\n")}`;
  }

  let hotelContext = "";
  if (hotel?.name) {
    hotelContext = `\nHotel: ${hotel.name}${hotel.mapsQuery ? ` (${hotel.mapsQuery})` : ""}. Start and end the day near the hotel.`;
  }

  const prompt = `You are an expert travel planner creating a detailed day plan for ${cityName}${date ? ` on ${date} (${dayOfWeek || ""})` : ""}.

Selected concept: ${optionDesc}
User preferences: ${prefText}${hotelContext}${mustDoInstructions}

Create a detailed day itinerary with 4-6 attractions + 2-3 food stops, ordered chronologically from morning to evening.

For EACH item, provide ALL of these fields in Hebrew (with English names in parentheses where helpful):

Return a JSON object with:
{
  "items": [
    {
      "type": "activity" | "restaurant" | "transport",
      "time": "HH:MM",
      "emoji": "relevant emoji",
      "title": "Hebrew name",
      "titleEn": "English name",
      "mapsQuery": "Google Maps search query in English",
      "description": "Hebrew description (2-3 sentences)",
      "why_visit": "Hebrew - why this place is recommended (2-3 sentences)",
      "best_time": "Hebrew - best time to visit",
      "estimated_duration": "e.g. שעה וחצי",
      "fee": { "amount": number_in_yen_or_0, "currency": "yen", "perPerson": true },
      "bookInAdvance": boolean,
      "booking_url": "URL or null",
      "route_note": "Hebrew - how to get here from the previous stop (walking/train/bus with details)"
    }
  ],
  "tips": ["Hebrew tip 1", "Hebrew tip 2", ...],
  "transport_between": [
    {
      "from": "Previous location name",
      "to": "Next location name",
      "mode": "walk" | "train" | "bus" | "taxi",
      "line": "train/bus line name or null",
      "duration": "e.g. 15 דקות הליכה",
      "note": "Hebrew explanation of how to get there"
    }
  ]
}

IMPORTANT RULES:
- All text content MUST be in Hebrew (except English names, mapsQuery, and URLs)
- route_note for the FIRST item should describe how to get there from the hotel
- Include realistic costs in Japanese Yen
- mapsQuery should be specific enough for Google Maps (e.g. "Senso-ji Temple Asakusa Tokyo")
- Order items chronologically
- Include transport items between distant locations
- Return ONLY the JSON object, no other text.`;

  try {
    const raw = await callGemini(prompt);
    const plan = parseJsonSafe(raw) as any;

    // Validate required structure
    if (!plan || !Array.isArray(plan.items) || plan.items.length < 3) {
      return errorResponse("validation_failed", "Invalid day plan format from AI");
    }

    // Validate each item has required fields
    for (const item of plan.items) {
      if (!item.title || !item.type) {
        return errorResponse("validation_failed", "Missing required fields in generated items");
      }
      // Ensure IDs for merge safety
      if (!item.id) {
        item.id = "ai_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      }
    }

    return jsonResponse(plan);
  } catch (e) {
    console.error("dayPlan error:", e);
    return errorResponse("generation_failed", (e as Error).message, 500);
  }
}

/* ================================================
   MAIN HANDLER
   ================================================ */

function structuredLog(level: string, action: string, userId: string, data: Record<string, unknown> = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    action,
    userId: userId.substring(0, 8) + "...",
    ...data,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("auth_required", "Missing authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("auth_required", "Invalid or expired session", 401);
    }

    if (!GEMINI_API_KEY) {
      return errorResponse("config_error", "GEMINI_API_KEY not configured", 500);
    }

    const body = await req.json();
    const { action } = body;

    structuredLog("info", action || "unknown", user.id, {
      city: body.city_en || body.city,
      hasPreferences: !!body.preferences,
      approvedCount: body.approvedAttractions?.length || 0,
    });

    let result: Response;

    switch (action) {
      case "extractPdf":
        result = await handleExtractPdf(body, supabase, user.id);
        break;

      case "suggestAttractions":
        result = await handleSuggestAttractions(body, supabase, user.id);
        break;

      case "ingestAttraction":
        result = await handleIngestAttraction(body, supabase, user.id);
        break;

      case "cityOptions":
        result = await handleCityOptions(body, supabase, user.id);
        break;

      case "dayPlan":
        result = await handleDayPlan(body, supabase, user.id);
        break;

      default:
        result = errorResponse("validation_failed", `Unknown action: ${action}`);
    }

    const elapsed = Date.now() - startTime;
    structuredLog("info", `${action}_complete`, user.id, {
      elapsedMs: elapsed,
      status: result.status,
    });

    return result;
  } catch (e) {
    const elapsed = Date.now() - startTime;
    console.error("Unhandled error:", e);
    structuredLog("error", "unhandled_error", "unknown", {
      error: (e as Error).message,
      elapsedMs: elapsed,
    });
    return errorResponse("generation_failed", "Internal server error", 500);
  }
});
