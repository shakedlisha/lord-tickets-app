# Phase 4: Voucher Generation & Output

## Summary

The largest phase. Build the voucher HTML template function, chronological section ordering, Hebrew date formatting, print CSS, banner image, live preview, and all export actions (print, download HTML, download PDF, copy to clipboard, QR code, language toggle). Also handle responsive layout.

## Prerequisites

- Phase 3 complete (form exists and produces data)

## Files

| File | Action |
|------|--------|
| `voucher.html` | MODIFY (add template function, preview, export actions) |

## Mini-Steps

---

### 4A -- Voucher Template: Header + Guests

Implement `generateVoucherHTML(data, lang)` that returns a complete, self-contained HTML string.

**HTML structure:**
```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מסמך נסיעה - Lord Tickets</title>
    <!-- Inline CSS (see template CSS below) -->
</head>
<body>
    <div class="voucher-box">
        <!-- Banner (4I) -->
        <!-- Header -->
        <!-- Client info -->
        <!-- Content sections (4B-4E) -->
        <!-- Terms -->
        <!-- Footer -->
    </div>
</body>
</html>
```

**Template CSS** -- use the exact CSS from the user's original specification:
- Fonts: `@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700&family=Rubik:wght@400;500;700&display=swap')`
- Colors: navy `#002B5B`, gold `#D4AF37`, background `#f0f2f5`
- `.voucher-box`: max-width 850px, centered, white background, shadow, rounded
- `.header`: navy background, gold text, flex layout
- `.client-info`: light gray background, flex layout
- `.section-title`: navy text, bottom border, flex with icon
- `.card-box`: white, border, rounded, shadow
- `.card-header`: light blue background, navy text, bold
- `.info-box`: yellow warning style
- `.terms-section`: light gray background
- `.footer`: navy background, white text, centered
- Plus print CSS (4H)

**Header section:**
```html
<div class="header">
    <div>
        <div class="agency-name">Lord Tickets</div>
        <div>מסמך נסיעה ושוברים</div>
    </div>
    <div style="text-align: left;">
        <div>תאריך הנפקה: {issueDate}</div>
        <div>מספר שובר: {voucherNumber}</div>
        <div>הונפק ע״י: {agentName}</div>
    </div>
</div>
```

**Client info bar:**
```html
<div class="client-info">
    <div><strong>נוסעים:</strong><br>{guestNamesList}</div>
    <div style="text-align: left;"><strong>הרכב:</strong> {paxCount} נוסעים</div>
</div>
```

- Guest names formatted as: "Mr YIGAL COHEN, Ms YAFIT RINA COHEN"
- Pax count: total number of guests

---

### 4B -- Flight Cards

For each flight in the data, generate a card:

```html
<div class="section-title">
    <span class="icon">✈</span>
    <h2>{direction === 'outbound' ? 'טיסת הלוך' : 'טיסת חזור'}</h2>
</div>
<div class="card-box">
    <div class="card-header">{airline} | {flightNumber} | {aircraft}</div>
    <div class="details-row">
        <div>
            <div class="big-text">{fromCity} ({fromAirport})</div>
            <div class="small-text">טרמינל {fromTerminal}</div>
            <div class="small-text">{formattedDeparture}</div>
        </div>
        <div style="text-align: center;">
            <span class="material-icons">arrow_forward</span>
        </div>
        <div>
            <div class="big-text">{toCity} ({toAirport})</div>
            <div class="small-text">טרמינל {toTerminal}</div>
            <div class="small-text">{formattedArrival}</div>
        </div>
    </div>
    <div class="small-text">
        כבודה: {checked} | יד: {hand} | טרולי: {trolley}
    </div>
    <div class="small-text">ארוחה: {meal}</div>
    <!-- If via is not empty: -->
    <div class="small-text">עצירת ביניים: {via}</div>
    <!-- If remarks is not empty: -->
    <div class="small-text" style="font-style: italic; color: #888;">{remarks}</div>
</div>
```

- Only show via/remarks lines if they have content
- Terminal line only if terminal is not empty
- Material Icons arrow between from/to (use inline SVG or text arrow for self-contained HTML)

---

### 4C -- Hotel Cards

For each hotel:

```html
<div class="section-title">
    <span class="icon">🏨</span>
    <h2>{hotelName}</h2>
</div>
<div class="card-box">
    <div class="card-header">{hotelName} | אישור: {confirmationNumber}</div>
    <div class="small-text">{address}, {city}</div>
    <div class="small-text">טלפון: {phone} {fax ? '| פקס: ' + fax : ''}</div>
    <div class="details-row">
        <div>
            <div class="big-text">כניסה</div>
            <div class="small-text">{formattedCheckIn}</div>
            <div class="small-text">החל מ-{checkInTime}</div>
        </div>
        <div style="text-align: center;">
            <div class="big-text">{nights} לילות</div>
            <div class="small-text">{rooms} חדרים</div>
        </div>
        <div>
            <div class="big-text">יציאה</div>
            <div class="small-text">{formattedCheckOut}</div>
            <div class="small-text">עד {checkOutTime}</div>
        </div>
    </div>
    <div class="small-text">סוג חדר: {roomType} | בסיס: {boardBasis}</div>
    <!-- If remarks not empty: -->
    <div class="info-box">
        <strong>⚠ שימו לב:</strong> {remarks}
    </div>
</div>
```

- Confirmation number in card header badge
- Remarks shown in yellow warning box (`.info-box` style)
- Check-in/out times shown below dates

---

### 4D -- Transfer Cards

For each transfer:

```html
<div class="section-title">
    <span class="icon">🚐</span>
    <h2>העברה</h2>
</div>
<div class="card-box">
    <div class="card-header">{type}</div>
    <div class="small-text">מיקום: {location}</div>
    <div class="small-text">תאריך: {formattedFrom} - {formattedTo}</div>
    <!-- If pickupTime not empty: -->
    <div class="small-text">שעת איסוף: {pickupTime}</div>
</div>
```

---

### 4E -- Travel Tips + Footer

**Important travel info box** (always shown):
```html
<div class="info-box">
    <strong>✈ מידע חשוב:</strong>
    <ul>
        <li>יש להגיע לשדה התעופה כ-3 שעות לפני ההמראה.</li>
        <li>חובה לוודא דרכון בתוקף ל-6 חודשים לפחות.</li>
        <li>מומלץ לבצע צ'ק-אין באתר חברת התעופה.</li>
    </ul>
</div>
```

**Travel tips box** (only if any tips provided):
```html
<div class="info-box" style="background-color: #e8f4fd; border-color: #bee5eb; color: #0c5460;">
    <strong>🌍 מידע על היעד:</strong>
    <ul>
        {visa ? '<li><strong>ויזה:</strong> ' + visa + '</li>' : ''}
        {currency ? '<li><strong>מטבע:</strong> ' + currency + '</li>' : ''}
        {emergencyNumbers ? '<li><strong>חירום:</strong> ' + emergencyNumbers + '</li>' : ''}
        {custom ? '<li>' + custom + '</li>' : ''}
    </ul>
</div>
```

**Terms section:**
```html
<div class="terms-section">
    <strong>📝 תנאים ומידע משפטי:</strong>
    <ul>
        <li><strong>המחיר אינו כולל:</strong> מס עיר/לינה (City Tax) לתשלום במזומן במלון, ביטוח, וטיפים.</li>
        <li><strong>אחריות:</strong> "Lord Tickets" משמשת כמתווך בלבד. אין אנו אחראים לשינויים מצד הספקים.</li>
        <li><strong>שינויים בלו"ז:</strong> חובה להתעדכן בלוח הטיסות באתר חברת התעופה לפני ההגעה לשדה.</li>
    </ul>
</div>
```

**Footer:**
```html
<div class="footer">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <div style="font-size: 16px; font-weight: bold;">Lord Tickets Agency</div>
            <div>מוקד חירום: 052-244-9096 | דוא"ל: support@lordtickets.com</div>
        </div>
        <div id="qrCodeContainer"></div> <!-- QR code goes here (4O) -->
    </div>
</div>
```

---

### 4F -- Chronological Ordering

Implement `sortSectionsChronologically(data)`:

```javascript
function sortSectionsChronologically(data) {
    const items = [];

    (data.flights || []).forEach(f => {
        items.push({ type: 'flight', date: f.departure?.split('T')[0] || '', data: f });
    });
    (data.hotels || []).forEach(h => {
        items.push({ type: 'hotel', date: h.checkIn || '', data: h });
    });
    (data.transfers || []).forEach(t => {
        items.push({ type: 'transfer', date: t.from || '', data: t });
    });

    items.sort((a, b) => a.date.localeCompare(b.date));
    return items;
}
```

- In `generateVoucherHTML()`, use this sorted array to render sections in date order
- Example output order: Outbound Flight (May 10) -> Transfer (May 10) -> Hotel (May 10-14) -> Return Flight (May 14)
- Each item still gets its own section title (flight/hotel/transfer icon + label)

---

### 4G -- Hebrew Date Formatting

Implement `formatHebrewDate(dateStr)` and `formatEnglishDate(dateStr)`:

```javascript
const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function formatHebrewDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const dayName = HEBREW_DAYS[d.getDay()];
    const day = d.getDate().toString().padStart(2, '0');
    const month = HEBREW_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `יום ${dayName}, ${day} ${month} ${year}`;
}

function formatHebrewDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    const d = new Date(dateTimeStr);
    const datePart = formatHebrewDate(dateTimeStr);
    const time = d.toTimeString().slice(0, 5); // HH:mm
    return `${datePart} ${time}`;
}
```

- Used throughout the voucher template for all dates
- English fallback uses `Intl.DateTimeFormat('en-US', ...)` or manual formatting

---

### 4H -- Print CSS

Add `@media print` rules inside the voucher HTML `<style>`:

```css
@media print {
    body {
        padding: 0;
        background: white;
    }
    .voucher-box {
        box-shadow: none;
        max-width: 100%;
        margin: 0;
    }
    .card-box {
        page-break-inside: avoid;
    }
    .section-title {
        page-break-after: avoid;
    }
    .info-box {
        page-break-inside: avoid;
    }
    .terms-section {
        page-break-before: auto;
    }
    @page {
        size: A4;
        margin: 15mm;
    }
}
```

- `-webkit-print-color-adjust: exact` on `body` (already in original template)
- `page-break-inside: avoid` on cards so they don't split across pages
- `page-break-after: avoid` on section titles so they stay with their content
- A4 page size with 15mm margins

---

### 4I -- Banner Image

CSS-only banner (no external image file needed):

```html
<div class="banner" style="
    width: 100%;
    height: 180px;
    background: linear-gradient(135deg, #002B5B 0%, #0F1F3A 60%, #1B365D 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
">
    <div style="
        font-family: 'Rubik', sans-serif;
        font-size: 48px;
        font-weight: 700;
        color: rgba(212, 175, 55, 0.15);
        letter-spacing: 8px;
        text-transform: uppercase;
    ">LORD TICKETS</div>
    <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: #D4AF37;
    "></div>
</div>
```

- Dark navy gradient with large watermark text "LORD TICKETS" in faded gold
- Gold accent line at bottom (4px)
- Looks professional on screen and in print
- No external image dependency

---

### 4J -- Live Preview

Add preview area to `voucher.html`:

```html
<div id="previewSection" style="display: none;">
    <h3>תצוגה מקדימה</h3>
    <div id="actionButtons">
        <!-- Action buttons go here (4K-4N) -->
    </div>
    <iframe id="voucherPreview" style="width: 100%; border: 1px solid #e0e0e0; border-radius: 8px;"></iframe>
</div>
```

Implement `showPreview(html)`:

```javascript
function showPreview(html) {
    const iframe = document.getElementById('voucherPreview');
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Resize iframe to content height
    iframe.onload = () => {
        iframe.style.height = doc.body.scrollHeight + 40 + 'px';
    };

    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
}
```

- Store generated HTML in `let currentVoucherHTML = ''` for export actions
- "Generate" button: collects form data -> `generateVoucherHTML(data)` -> `showPreview(html)`

---

### 4K -- Print Action

```javascript
function printVoucher() {
    const win = window.open('', '_blank');
    win.document.write(currentVoucherHTML);
    win.document.close();
    win.onload = () => {
        setTimeout(() => win.print(), 500); // wait for fonts to load
    };
}
```

Button: `<button onclick="printVoucher()">` with `print` Material Icon, label "הדפס"

---

### 4L -- Download HTML

```javascript
function downloadHTML() {
    const blob = new Blob([currentVoucherHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voucher-${getResNumber()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('הקובץ הורד בהצלחה', 'success');
}
```

Button: `<button onclick="downloadHTML()">` with `download` icon, label "הורד HTML"

---

### 4M -- Download PDF (with page breaks)

```javascript
async function downloadPDF() {
    showToast('...מייצר PDF', 'info');
    const element = document.getElementById('voucherPreview').contentDocument.body;

    const opt = {
        margin: 10,
        filename: `voucher-${getResNumber()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().set(opt).from(element).save();
    showToast('PDF הורד בהצלחה', 'success');
}
```

Button: `<button onclick="downloadPDF()">` with `picture_as_pdf` icon, label "הורד PDF"

---

### 4N -- Copy to Clipboard

```javascript
async function copyToClipboard() {
    try {
        const blob = new Blob([currentVoucherHTML], { type: 'text/html' });
        await navigator.clipboard.write([
            new ClipboardItem({ 'text/html': blob })
        ]);
        showToast('הועתק ללוח!', 'success');
    } catch (e) {
        // Fallback: copy as plain text
        await navigator.clipboard.writeText(currentVoucherHTML);
        showToast('הועתק כטקסט', 'success');
    }
}
```

Button: `<button onclick="copyToClipboard()">` with `content_copy` icon, label "העתק"

---

### 4O -- QR Code

Generate QR code inside the voucher footer:

```javascript
function generateQRCode(container, data) {
    const qrText = `Lord Tickets | ${data.voucherNumber} | Res: ${data.reservationNumber}`;
    new QRCode(container, {
        text: qrText,
        width: 80,
        height: 80,
        colorDark: '#002B5B',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
}
```

- QR is generated after the voucher HTML is written to the iframe
- Positioned in the footer area, next to contact info
- Navy color (#002B5B) on white
- 80x80px size
- Contains: "Lord Tickets | VCH-20260225-001 | Res: 1889759"

**Alternative approach** (for self-contained HTML): Generate QR as a data URL using a canvas, then embed as `<img src="data:image/png;base64,...">` in the voucher HTML. This way the QR is included in downloaded HTML/PDF.

---

### 4P -- Language Toggle

The language toggle in the form (3A) controls the voucher output language.

**Hebrew (default, `lang='he'`):**
- `dir="rtl"`, `lang="he"`
- All section titles, labels, terms in Hebrew
- Dates formatted with `formatHebrewDate()`

**English (`lang='en'`):**
- `dir="ltr"`, `lang="en"`
- Section titles: "Flights", "Hotels", "Transfers", "Important Information", "Terms & Conditions"
- Labels: "Check-in", "Check-out", "Baggage", "Meal", etc.
- Dates formatted with `formatEnglishDate()`
- Terms text in English
- Footer text in English

**Implementation:**
- `generateVoucherHTML(data, lang)` accepts a `lang` parameter
- All labels stored in a `LABELS` object with `he` and `en` keys
- Toggle re-calls `generateVoucherHTML()` and `showPreview()`

---

### 4Q -- Responsive Layout

**Generator page layout:**

Desktop (> 1024px):
```
[Form (60%)] [Preview (40%)]
```

Tablet (768px - 1024px):
```
[Form (100%)]
[Preview (100%)]
```

Mobile (< 768px):
```
[Form (100%, compact)]
[Preview (100%, scrollable)]
```

**CSS media queries:**
```css
@media (min-width: 1024px) {
    .main-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
}
@media (max-width: 768px) {
    .form-row { flex-direction: column; }
    .form-row > * { width: 100% !important; }
    .action-buttons { flex-wrap: wrap; }
    .action-buttons button { flex: 1 1 45%; }
}
```

**Action buttons:**
- Desktop: horizontal row
- Mobile: 2x2 grid (wrap)

---

## Acceptance Criteria

- [ ] `generateVoucherHTML(data, lang)` returns valid self-contained HTML
- [ ] Voucher uses exact CSS from the original template specification
- [ ] Banner is CSS-only gradient with "LORD TICKETS" watermark
- [ ] Header shows voucher number, agent name, issue date
- [ ] Guest names and pax count display correctly
- [ ] Flight cards show all fields (airline, number, aircraft, airports, terminals, times, baggage, meal, via, remarks)
- [ ] Hotel cards show confirmation number, phone, check-in/out with times, rooms, remarks warning box
- [ ] Transfer cards show type, location, dates, pickup time
- [ ] Sections are sorted chronologically by date
- [ ] Dates are formatted in Hebrew (יום חמישי, 08 אוקטובר 2026)
- [ ] Important info box and terms section are always present
- [ ] Travel tips box appears only when tips are provided
- [ ] QR code appears in footer with voucher/reservation info
- [ ] Footer has Lord Tickets contact info
- [ ] Print CSS works (page breaks, A4, margins, color printing)
- [ ] Live preview renders in iframe and auto-resizes
- [ ] Print action opens new window and triggers print dialog
- [ ] Download HTML creates a self-contained .html file
- [ ] Download PDF creates an A4 PDF with proper page breaks
- [ ] Copy to clipboard works (HTML and text fallback)
- [ ] Language toggle switches between Hebrew and English
- [ ] Page layout is responsive (desktop side-by-side, mobile stacked)
- [ ] Action buttons wrap on mobile
