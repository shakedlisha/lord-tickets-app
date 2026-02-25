# Travel Voucher Generator -- Master Index

## Overview

Build a "Travel Voucher Generator" page integrated into the Lord Tickets main navigation. Uses Gemini AI (via the existing `gemini-proxy` edge function) to extract booking details from uploaded files (ODYSSEA PNR docs, hotel confirmations, etc.) and generates professional Hebrew RTL travel vouchers. Includes manual entry, editable review form, Supabase storage, PDF/HTML download, QR codes, and destination travel tips.

## Phase Assignments

| # | File | Steps | Summary |
|---|------|-------|---------|
| 1 | [phase-1-upload.md](phase-1-upload.md) | 1A -- 1E | Page skeleton, layout, drag-drop upload zone, file list, loading UI |
| 2 | [phase-2-ai-extraction.md](phase-2-ai-extraction.md) | 2A -- 2D | Gemini prompt, file-to-base64, API call, response parsing |
| 3 | [phase-3-review-form.md](phase-3-review-form.md) | 3A -- 3H | Editable review form (guests, flights, hotels, transfers, notes) |
| 4 | [phase-4-voucher-output.md](phase-4-voucher-output.md) | 4A -- 4Q | Voucher template, preview, export actions, QR, print CSS, responsive |
| 5 | [phase-5-supabase.md](phase-5-supabase.md) | 5A -- 5E | Database migration, save/load, past vouchers panel, edit-resave |
| 6 | [phase-6-navigation.md](phase-6-navigation.md) | 6A -- 6C | Nav links in both contexts, service worker cache |

## Dependency Graph

```
Phase 1 (skeleton + upload)
   |
   v
Phase 2 (AI extraction)  -- depends on Phase 1
   |
   v
Phase 3 (review form)    -- depends on Phase 1
   |
   v
Phase 4 (voucher output) -- depends on Phase 3
   |
   v
Phase 5 (Supabase)       -- depends on Phase 4
   |
   v
Phase 6 (navigation)     -- independent, can run after Phase 1
```

## All Decisions

- **File types**: PDF, Images (JPG/PNG), Text -- all supported
- **Multi-upload**: Yes, combine multiple files into one voucher
- **Manual entry**: Yes, allow manual data entry without file upload
- **Review step**: Editable form with all extracted fields before generating
- **Output actions**: Print, Download HTML, Download PDF, Copy to clipboard
- **Banner image**: CSS gradient fallback (travel-themed)
- **Storage**: Save vouchers to Supabase for future reference
- **Nav placement**: Show link in both Flights and Tickets nav menus
- **Access**: All logged-in users (admin, manager, agent)
- **Transfers**: Yes, with pickup/dropoff times
- **Chronological ordering**: All sections sorted by date
- **Hebrew dates**: Full Hebrew format (יום חמישי, 08 אוקטובר 2026)
- **Print CSS**: Professional print layout with page breaks
- **Hotel extras**: Confirmation number, check-in/out times, rooms count
- **Flight extras**: Remarks, via/connections
- **Voucher number**: Auto-generated (VCH-YYYYMMDD-NNN)
- **Agent name**: Logged-in agent appears on voucher
- **Travel tips**: Optional destination-specific visa/currency/emergency info
- **QR code**: Embedded on voucher with reservation reference
- **Partial recovery**: If AI fails on some sections, keep what worked
- **Duplicate warning**: Alert before overwriting existing reservation
- **Edit-resave**: Full load-edit-save loop for past vouchers
- **Responsive**: Mobile/tablet friendly
- **PDF page breaks**: Proper page-break rules for multi-page vouchers

## Data Schema (Gemini JSON Output)

```json
{
  "reservationNumber": "1889759",
  "voucherNumber": "VCH-20260225-001",
  "agentName": "Agent Name",
  "tripDates": { "from": "2026-05-10", "to": "2026-05-14" },
  "guests": [
    { "title": "MS", "firstName": "YAFIT RINA", "lastName": "COHEN", "dob": "1980-01-01" }
  ],
  "flights": [
    {
      "direction": "outbound",
      "airline": "EL AL",
      "flightNumber": "LY5113",
      "aircraft": "Boeing 737-900",
      "from": { "city": "Tel Aviv", "airport": "TLV", "terminal": "3" },
      "to": { "city": "Batumi", "airport": "BUS", "terminal": "" },
      "departure": "2026-05-10T06:00",
      "arrival": "2026-05-10T09:15",
      "baggage": { "checked": "23Kg", "hand": "5Kg", "trolley": "7Kg" },
      "meal": "No meal",
      "via": "",
      "remarks": "הטיסה אושרה על ידי מנהל התעופה האזרחית",
      "status": "CONFIRMED"
    }
  ],
  "hotels": [
    {
      "name": "Sheraton Batumi",
      "address": "28 Rustaveli Street 6000 Batumi",
      "city": "Batumi",
      "phone": "(995)(422) 229000",
      "fax": "(995)(422) 229029",
      "confirmationNumber": "CONF-12345",
      "checkIn": "2026-05-10",
      "checkInTime": "15:00",
      "checkOut": "2026-05-14",
      "checkOutTime": "11:00",
      "nights": 4,
      "rooms": 1,
      "roomType": "Standard Double Room",
      "boardBasis": "Bed and Breakfast",
      "status": "CONFIRMED",
      "remarks": "Construction scaffolding on exterior..."
    }
  ],
  "transfers": [
    {
      "type": "Airport Transfer R/T",
      "location": "Batumi",
      "from": "2026-05-10",
      "to": "2026-05-14",
      "pickupTime": "09:30",
      "status": "CONFIRMED"
    }
  ],
  "travelTips": {
    "visa": "",
    "currency": "",
    "emergencyNumbers": "",
    "custom": ""
  },
  "notes": []
}
```

## Key Files

| File | Action | Purpose |
|------|--------|---------|
| `voucher.html` | NEW | All UI, JS logic, inline styles |
| `js/nav.js` | MODIFY | Add nav link in both contexts |
| `sw.js` | MODIFY | Add to cache list |
| `supabase/migrations/013_vouchers_table.sql` | NEW | Database table + RLS |
| `supabase/functions/gemini-proxy/index.ts` | no change | AI proxy |
| `js/config.js` | no change | Supabase config |

## External CDN Dependencies

- **html2pdf.js** -- HTML to PDF conversion
- **qrcode.js** (qrcodejs) -- QR code generation
- Both loaded from CDN in `voucher.html` head
