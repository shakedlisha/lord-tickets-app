# Phase 2: AI Extraction

## Summary

Implement the AI extraction pipeline: read uploaded files as base64, send them to the Gemini API via the existing `gemini-proxy` Supabase edge function, parse the structured JSON response, and handle partial failures gracefully.

## Prerequisites

- Phase 1 complete (`voucher.html` exists with upload zone and loading UI)

## Files

| File | Action |
|------|--------|
| `voucher.html` | MODIFY (add JS functions) |

## Existing Infrastructure

- **Gemini proxy**: `supabase/functions/gemini-proxy/index.ts` -- accepts `{ contents }` body, forwards to Gemini 2.0 Flash, requires `Authorization` header
- **Supabase config**: `js/config.js` -- provides `LordConfig.SUPABASE_URL` and `LordConfig.SUPABASE_ANON_KEY`
- **Auth tokens**: stored in `localStorage` as `access_token`

## Mini-Steps

---

### 2A -- Gemini Prompt

Define the system prompt as a JS constant inside `voucher.html`:

```javascript
const EXTRACTION_PROMPT = `You are a Travel Documentation Specialist working for "Lord Tickets" agency.

Analyze the uploaded travel documents and extract ALL booking details into the following JSON structure.

CRITICAL RULES:
1. REMOVE all prices, costs, VAT, taxes, commissions, and payment details. The output must contain ZERO monetary values.
2. REMOVE all supplier/platform branding: Booking.com, Agoda, Expedia, Hotelbeds, ODYSSEA, pelegisr.com, "ELAL SUNDOR", "Powered by..." etc. Only "Lord Tickets" branding should remain.
3. Translate room types and board basis to Hebrew (e.g., "Standard Double Room" -> "חדר זוגי סטנדרטי", "Bed and Breakfast" -> "לינה וארוחת בוקר").
4. Format all dates as ISO strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm).
5. If a field is not found in the document, return an empty string "" (never null or undefined).
6. If multiple documents are provided, merge them into a single booking.
7. Arrange flights chronologically (outbound first, then return).

Return ONLY valid JSON matching this exact schema (no markdown, no explanation, just the JSON):

{
  "reservationNumber": "",
  "tripDates": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "guests": [
    { "title": "MR/MS/MRS/CHILD/INFANT", "firstName": "", "lastName": "", "dob": "YYYY-MM-DD" }
  ],
  "flights": [
    {
      "direction": "outbound or return",
      "airline": "",
      "flightNumber": "",
      "aircraft": "",
      "from": { "city": "", "airport": "IATA", "terminal": "" },
      "to": { "city": "", "airport": "IATA", "terminal": "" },
      "departure": "YYYY-MM-DDTHH:mm",
      "arrival": "YYYY-MM-DDTHH:mm",
      "baggage": { "checked": "", "hand": "", "trolley": "" },
      "meal": "",
      "via": "",
      "remarks": "",
      "status": "CONFIRMED/PENDING/CANCELLED"
    }
  ],
  "hotels": [
    {
      "name": "",
      "address": "",
      "city": "",
      "phone": "",
      "fax": "",
      "confirmationNumber": "",
      "checkIn": "YYYY-MM-DD",
      "checkInTime": "HH:mm",
      "checkOut": "YYYY-MM-DD",
      "checkOutTime": "HH:mm",
      "nights": 0,
      "rooms": 1,
      "roomType": "",
      "boardBasis": "",
      "status": "CONFIRMED/PENDING/CANCELLED",
      "remarks": ""
    }
  ],
  "transfers": [
    {
      "type": "",
      "location": "",
      "from": "YYYY-MM-DD",
      "to": "YYYY-MM-DD",
      "pickupTime": "HH:mm",
      "status": "CONFIRMED/PENDING/CANCELLED"
    }
  ],
  "notes": []
}`;
```

---

### 2B -- File-to-Base64 Reader

Implement `readFileAsBase64(file)`:

```javascript
async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1]; // strip data:...;base64, prefix
            resolve({
                mimeType: file.type || detectMimeType(file.name),
                base64Data: base64
            });
        };
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsDataURL(file);
    });
}
```

- `detectMimeType(filename)` fallback: check extension for `.pdf` -> `application/pdf`, `.jpg/.jpeg` -> `image/jpeg`, `.png` -> `image/png`, `.txt` -> `text/plain`
- For `.txt` files: read as text instead (`reader.readAsText(file)`) and return `{ text: content }` instead of base64 (Gemini handles text parts differently)

---

### 2C -- Gemini API Call

Implement `extractWithAI()`:

```javascript
async function extractWithAI() {
    showLoading(true);
    try {
        // 1. Read all files
        const parts = [];
        parts.push({ text: EXTRACTION_PROMPT });

        for (const file of uploadedFiles) {
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                const text = await readFileAsText(file);
                parts.push({ text: `[File: ${file.name}]\n${text}` });
            } else {
                const { mimeType, base64Data } = await readFileAsBase64(file);
                parts.push({ inlineData: { mimeType, data: base64Data } });
            }
        }

        // 2. Get auth token
        const token = localStorage.getItem('access_token');
        const anonKey = LordConfig.SUPABASE_ANON_KEY;

        // 3. Call Gemini proxy
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(
            `${LordConfig.SUPABASE_URL}/functions/v1/gemini-proxy`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey
                },
                body: JSON.stringify({
                    contents: [{ parts }]
                }),
                signal: controller.signal
            }
        );

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        parseGeminiResponse(data);

    } catch (error) {
        showLoading(false);
        if (error.name === 'AbortError') {
            showToast('הזמן הקצוב עבר. נסה שוב.', 'error');
        } else {
            showToast(`שגיאה: ${error.message}`, 'error');
        }
        showRetryUI();
    }
}
```

- Auth: `Authorization: Bearer ${access_token}` + `apikey: ${SUPABASE_ANON_KEY}`
- Timeout: 60 seconds (PDFs are large)
- AbortController for clean timeout handling
- On network error: show error toast + retry button

---

### 2D -- Parse Response (with partial recovery)

Implement `parseGeminiResponse(data)`:

```javascript
function parseGeminiResponse(data) {
    try {
        let text = data.candidates[0].content.parts[0].text;

        // Strip markdown code fences if present
        text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
        text = text.trim();

        const parsed = JSON.parse(text);

        // Validate each section independently
        const results = { guests: false, flights: false, hotels: false, transfers: false };
        const extractedData = {};

        if (Array.isArray(parsed.guests) && parsed.guests.length > 0) {
            extractedData.guests = parsed.guests;
            results.guests = true;
        }
        if (Array.isArray(parsed.flights) && parsed.flights.length > 0) {
            extractedData.flights = parsed.flights;
            results.flights = true;
        }
        if (Array.isArray(parsed.hotels) && parsed.hotels.length > 0) {
            extractedData.hotels = parsed.hotels;
            results.hotels = true;
        }
        if (Array.isArray(parsed.transfers) && parsed.transfers.length > 0) {
            extractedData.transfers = parsed.transfers;
            results.transfers = true;
        }

        // Copy scalar fields
        extractedData.reservationNumber = parsed.reservationNumber || '';
        extractedData.tripDates = parsed.tripDates || { from: '', to: '' };
        extractedData.notes = parsed.notes || [];

        showLoading(false);

        const allSuccess = Object.values(results).every(v => v);
        const anySuccess = Object.values(results).some(v => v);

        if (allSuccess) {
            showToast('כל הנתונים חולצו בהצלחה!', 'success');
        } else if (anySuccess) {
            showPartialRecovery(results);
        } else {
            showToast('לא נמצאו נתונים בקבצים. נסה קבצים אחרים.', 'warning');
        }

        populateFormFromJSON(extractedData); // Phase 3 function

    } catch (e) {
        showLoading(false);
        showToast('שגיאה בפענוח התשובה. נסה שוב.', 'error');
        showRetryUI();
    }
}
```

- Strip markdown code fences (```json ... ```) that Gemini sometimes wraps around JSON
- Validate each section independently -- if flights parse but hotels don't, keep the flights
- `showPartialRecovery(results)` shows the yellow banner from Phase 1E with per-section status
- `populateFormFromJSON(data)` is implemented in Phase 3 -- for now, store data in a global variable

---

## Acceptance Criteria

- [ ] Uploading a PDF/image triggers the extraction flow
- [ ] Loading overlay appears during extraction
- [ ] Files are correctly converted to base64 with proper mimeType
- [ ] Text files are sent as text parts (not base64)
- [ ] API call includes proper auth headers
- [ ] 60-second timeout works (shows timeout toast)
- [ ] Network errors show error toast + retry button
- [ ] Successful response is parsed as JSON
- [ ] Markdown code fences are stripped from response
- [ ] Each section (guests, flights, hotels, transfers) is validated independently
- [ ] Full success shows green success toast
- [ ] Partial success shows yellow warning banner with per-section status
- [ ] Total failure shows warning toast + retry + manual entry option
- [ ] Extracted data is stored and ready for Phase 3 form population
- [ ] Retry button re-runs extraction with same files
- [ ] "Switch to manual" option changes mode toggle
