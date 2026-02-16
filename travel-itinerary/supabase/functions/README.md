# Supabase Edge Functions - Setup Guide

## Prerequisites
- Supabase CLI installed (download from GitHub releases or `npm i -g supabase`)
- Project ref: `yestitkcxqjtkaddzyvn`

## 1. Set Secrets

```bash
# Via CLI
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here --project-ref yestitkcxqjtkaddzyvn

# Or via API
curl -X POST "https://api.supabase.com/v1/projects/yestitkcxqjtkaddzyvn/secrets" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name": "GEMINI_API_KEY", "value": "your_key"}]'
```

## 2. Run Migrations

Go to Supabase Dashboard > SQL Editor and run in order:
1. `supabase/001_create_tables.sql` (base schema)
2. `supabase/002_ai_schema.sql` (AI features: attractions table, ai_preferences column)

## 3. Deploy Function

```bash
# Set access token
export SUPABASE_ACCESS_TOKEN=your_token

# Deploy
supabase functions deploy itinerary-ai --no-verify-jwt --project-ref yestitkcxqjtkaddzyvn
```

Note: `--no-verify-jwt` is used because the function handles auth internally via the Authorization header.

## 4. Test

```bash
# Should return 401 (no auth)
curl -X POST https://yestitkcxqjtkaddzyvn.supabase.co/functions/v1/itinerary-ai \
  -H "Content-Type: application/json" \
  -d '{"action": "test"}'

# With auth (use a valid user session token)
curl -X POST https://yestitkcxqjtkaddzyvn.supabase.co/functions/v1/itinerary-ai \
  -H "Authorization: Bearer USER_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "cityOptions", "city": "טוקיו", "city_en": "Tokyo", "preferences": {"pace": "balanced"}}'
```

## Available Actions

| Action | Description | Required Fields |
|--------|-------------|-----------------|
| `cityOptions` | Generate 3-5 day-trip concept options for a city | `city` or `city_en` |
| `dayPlan` | Generate detailed day plan from selected option | `selectedOption` |
| `ingestAttraction` | Add candidate attraction to pending queue | `name`, `city` |

## Architecture

```
Frontend (admin-form.js)
  → AiPanel (ai-panel.js) - 3-step wizard UI
    → invokeAiFunction() (supabase-config.js)
      → Edge Function (itinerary-ai/index.ts)
        → Gemini API (Pro with Flash fallback)
      ← Structured JSON response
    ← Render preview
  → mergeAiItems() - append/replace with snapshot safety
```

## Key Files

| File | Purpose |
|------|---------|
| `js/ai-config.js` | Centralized AI configuration (frozen constants) |
| `js/ai-panel.js` | AI suggestions wizard (preferences → options → preview) |
| `js/admin-form.js` | Form builder with AI button and merge logic |
| `js/admin-attractions.js` | Attractions management (approve/reject/add) |
| `supabase/functions/itinerary-ai/index.ts` | Edge function (Gemini calls) |
| `supabase/002_ai_schema.sql` | DB schema for attractions + ai_preferences |

## Model Configuration

- Default: `gemini-2.5-pro-preview-05-06`
- Fallback: `gemini-2.0-flash` (auto-fallback on Pro failure)
- Config: `js/ai-config.js` (client) and `itinerary-ai/index.ts` (server)

## Merge Safety

- Snapshot saved before every merge (`_snapshotBeforeMerge`)
- Undo button appears on day cards after AI merge
- Conflict prompt when day already has items (append/replace choice)
- No physical data deletion (soft delete only via `status` field)
