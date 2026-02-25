# Phase 1: Page Skeleton & Upload Zone

## Summary

Create `voucher.html` with the full page skeleton, responsive layout, drag-and-drop file upload zone, uploaded file list, and loading/status UI. This is the foundation that all other phases build on.

## Prerequisites

None -- this is the first phase.

## Files

| File | Action |
|------|--------|
| `voucher.html` | CREATE |

## Mini-Steps

---

### 1A -- HTML Skeleton

Create `voucher.html` with:

- HTML5 boilerplate with `lang="he"` and `dir="rtl"`
- `<meta charset="UTF-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- `<title>שובר נסיעה - Lord Tickets</title>`
- CDN includes in `<head>`:
  - Supabase JS SDK: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js`
  - Material Icons: `https://fonts.googleapis.com/icon?family=Material+Icons`
  - Google Fonts: Heebo (300-800) + Rubik (400-700)
  - html2pdf.js: `https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js`
  - qrcode.js: `https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js`
- Script includes at end of `<body>`:
  - `js/config.js`
  - `js/nav.js`
- On DOMContentLoaded: call `LordNav.init('voucher')`
- Inline `<style>` block for all page CSS (matching existing app pattern -- no external CSS file)

---

### 1B -- Page Layout (responsive)

Build the page structure inside `<body>`:

- **Page header area** (below nav bar):
  - Title: "מחולל שוברי נסיעה" with `description` Material Icon
  - Reservation number input field (text, placeholder: "מספר הזמנה")
  - Auto-generated voucher number display (read-only, format: VCH-YYYYMMDD-NNN, generated on page load)
- **Mode toggle**: Two styled buttons side by side
  - "חילוץ מקובץ" (AI Extract) -- default active, shows upload zone
  - "הזנה ידנית" (Manual Entry) -- shows empty form directly
  - Active button: gold background (#D4AF37), white text
  - Inactive button: white background, navy text
- **Main content area**: `<div id="mainContent">` placeholder that will hold either the upload zone or the form
- **Styling**:
  - Navy/gold color scheme matching existing app (#1B365D, #D4AF37, #F5F5F5 background)
  - Heebo font throughout
  - Max-width container (1200px, centered)
  - Responsive: single column on mobile (`max-width: 768px`), side-by-side on desktop when preview is shown later

---

### 1C -- Drag-and-Drop Upload Zone

Build the upload zone (shown when AI Extract mode is active):

- Large drop area:
  - Dashed border (2px dashed #ccc), rounded corners (12px)
  - `cloud_upload` Material Icon (large, 64px, navy color)
  - Primary text: "גרור קבצים לכאן" (Drag files here)
  - Secondary text: "או לחץ לבחירת קבצים" (or click to browse)
  - Supported types note: "PDF, תמונות (JPG/PNG), טקסט"
  - Min-height: 200px, centered content, cursor: pointer
- Hidden file input: `<input type="file" id="fileInput" multiple accept=".pdf,.jpg,.jpeg,.png,.txt" hidden>`
- Click on drop area triggers file input click
- Drag events:
  - `dragover` / `dragenter`: prevent default, add gold border (#D4AF37), light gold background (rgba(212,175,55,0.05))
  - `dragleave` / `drop`: remove highlight
  - `drop`: prevent default, read `e.dataTransfer.files`, add to file list
- File input `change` event: add selected files to file list
- Store files in a JS array: `let uploadedFiles = []`

---

### 1D -- Uploaded File List

Below the drop zone, show uploaded files:

- Container: `<div id="fileList">` -- hidden when empty
- Each file rendered as a mini card:
  - File type icon (Material Icons): `picture_as_pdf` for PDF, `image` for images, `description` for text
  - Filename (truncated if > 30 chars)
  - File size (formatted: KB or MB)
  - Remove button: `close` Material Icon, red on hover
  - Card styling: white background, subtle border, 8px border-radius, flex row
- Remove button click: removes file from `uploadedFiles` array, re-renders list
- **"Extract with AI" button**: `<button id="extractBtn">`
  - Text: "חלץ נתונים עם AI"
  - Icon: `auto_awesome` Material Icon
  - Styling: gold background, white text, full width, 48px height, rounded
  - Only visible when `uploadedFiles.length > 0`
  - Click handler: placeholder for Phase 2 (calls `extractWithAI()`)

---

### 1E -- Loading & Partial Recovery UI

- **Loading overlay**: `<div id="loadingOverlay">`
  - Semi-transparent navy background (rgba(27,54,93,0.85))
  - Centered spinner (CSS animation, gold color)
  - Status text below spinner: "...מחלץ נתונים מהקבצים" (Extracting data from files...)
  - Hidden by default, shown during AI extraction
- **Status toast system**: `showToast(message, type)` function
  - Types: `success` (green), `error` (red), `warning` (orange), `info` (blue)
  - Fixed position bottom-right, auto-dismiss after 4 seconds
  - Slide-in animation
- **Partial recovery banner**: `<div id="partialBanner">`
  - Yellow/orange warning background
  - Text: "חלק מהנתונים חולצו בהצלחה -- השלם את השאר ידנית"
  - Shows which sections succeeded (green checkmarks) and which failed (red X)
  - Hidden by default, shown when AI extraction partially succeeds
- **Error state**: If extraction fully fails
  - Error toast with message
  - "נסה שוב" (Retry) button
  - "עבור להזנה ידנית" (Switch to manual) link

---

## Acceptance Criteria

- [ ] `voucher.html` loads without errors in the browser
- [ ] Navigation bar appears at top (via `LordNav.init('voucher')`)
- [ ] Page title and reservation number input are visible
- [ ] Voucher number auto-generates on page load (VCH-YYYYMMDD-NNN format)
- [ ] Mode toggle switches between AI Extract and Manual Entry views
- [ ] Drag-and-drop zone accepts PDF, JPG, PNG, and TXT files
- [ ] Clicking the zone opens the file browser
- [ ] Dragging files over the zone shows gold highlight
- [ ] Uploaded files appear as cards with icon, name, size, and remove button
- [ ] Removing a file updates the list
- [ ] "Extract with AI" button appears only when files are present
- [ ] Loading overlay shows/hides correctly (test with `setTimeout` placeholder)
- [ ] Toast notifications work for success, error, warning, info
- [ ] Page is responsive -- stacks to single column on mobile
- [ ] All text is Hebrew RTL
- [ ] Styling matches existing app (navy/gold, Heebo font)
