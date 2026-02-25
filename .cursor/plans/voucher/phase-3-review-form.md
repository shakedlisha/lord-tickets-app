# Phase 3: Editable Review Form

## Summary

Build the dynamic, editable review form with collapsible sections for general info, guests, flights, hotels, transfers, and notes/travel tips. Supports both AI-populated and manual entry modes. Includes validation and the wiring function that maps AI-extracted JSON to form fields.

## Prerequisites

- Phase 1 complete (page skeleton exists)
- Phase 2 complete (AI extraction produces JSON data)

## Files

| File | Action |
|------|--------|
| `voucher.html` | MODIFY (add form HTML + JS) |

## Mini-Steps

---

### 3A -- General Info Section

Collapsible card with header "פרטים כלליים":

**Fields:**
- **Reservation number**: `<input type="text" id="resNumber">`, placeholder "מספר הזמנה"
- **Voucher number**: `<input type="text" id="voucherNumber" readonly>`, auto-generated on page load, format `VCH-YYYYMMDD-NNN` where NNN is a random 3-digit number
- **Agent name**: `<input type="text" id="agentName">`, auto-filled from `localStorage.getItem('userName')`, editable
- **Trip date from**: `<input type="date" id="tripDateFrom">`
- **Trip date to**: `<input type="date" id="tripDateTo">`
- **Language toggle**: Two radio buttons -- "עברית" (default, value `he`) / "English" (value `en`)

**Collapsible behavior:**
- Card header is clickable, toggles body visibility
- `expand_more` / `expand_less` icon in header
- Default: expanded

**Layout:**
- 2-column grid on desktop (reservation + voucher on one row, dates on another)
- Single column on mobile

---

### 3B -- Guests Section

Collapsible card with header "נוסעים (X)" where X is the guest count:

**Each guest row (flex row):**
- Title: `<select>` with options: Mr, Mrs, Ms, Child, Infant
- First name: `<input type="text">`, placeholder "שם פרטי"
- Last name: `<input type="text">`, placeholder "שם משפחה"
- DOB: `<input type="date">`, label "תאריך לידה"
- Remove button: `<button>` with `close` icon, red on hover

**Actions:**
- "הוסף נוסע" (Add Guest) button at bottom with `person_add` icon
- Clicking adds a new empty row
- Pax count in card header updates automatically
- Minimum 1 guest row (cannot remove the last one)

**Data structure:**
```javascript
function getGuestsData() {
    // Reads all guest rows and returns array of { title, firstName, lastName, dob }
}
```

---

### 3C -- Flights Section

Collapsible card with header "טיסות (X)" where X is flight count:

**Each flight as a sub-card with border:**

Row 1 (basic info):
- Direction: `<select>` -- הלוך (outbound) / חזור (return)
- Airline: `<input type="text">`, placeholder "חברת תעופה"
- Flight number: `<input type="text">`, placeholder "מספר טיסה"
- Aircraft: `<input type="text">`, placeholder "סוג מטוס"

Row 2 (departure):
- From city: `<input type="text">`, placeholder "עיר מוצא"
- From airport: `<input type="text" maxlength="3">`, placeholder "IATA" (3-letter code)
- From terminal: `<input type="text">`, placeholder "טרמינל"
- Departure: `<input type="datetime-local">`

Row 3 (arrival):
- To city: `<input type="text">`, placeholder "עיר יעד"
- To airport: `<input type="text" maxlength="3">`, placeholder "IATA"
- To terminal: `<input type="text">`, placeholder "טרמינל"
- Arrival: `<input type="datetime-local">`

Row 4 (extras):
- Baggage checked: `<input type="text">`, placeholder "כבודה רשומה"
- Baggage hand: `<input type="text">`, placeholder "יד"
- Baggage trolley: `<input type="text">`, placeholder "טרולי"
- Meal: `<input type="text">`, placeholder "ארוחה"

Row 5 (more):
- Via/connection: `<input type="text">`, placeholder "עצירת ביניים"
- Status: `<select>` -- CONFIRMED / PENDING / CANCELLED
- Remarks: `<textarea rows="2">`, placeholder "הערות טיסה"

**Actions:**
- "הוסף טיסה" button with `flight` icon
- Remove button per flight card

---

### 3D -- Hotels Section

Collapsible card with header "מלונות (X)":

**Each hotel as a sub-card:**

Row 1:
- Hotel name: `<input type="text">`, placeholder "שם המלון"
- Confirmation number: `<input type="text">`, placeholder "מספר אישור"

Row 2:
- Address: `<input type="text">`, placeholder "כתובת"
- City: `<input type="text">`, placeholder "עיר"

Row 3:
- Phone: `<input type="text">`, placeholder "טלפון"
- Fax: `<input type="text">`, placeholder "פקס"

Row 4:
- Check-in date: `<input type="date">`
- Check-in time: `<input type="time">`, default "15:00"
- Check-out date: `<input type="date">`
- Check-out time: `<input type="time">`, default "11:00"

Row 5:
- Nights: `<input type="number" readonly>` -- auto-calculated from check-in/out dates
- Rooms: `<input type="number" min="1" value="1">`
- Room type: `<input type="text">`, placeholder "סוג חדר"
- Board basis: `<input type="text">`, placeholder "בסיס אירוח"

Row 6:
- Status: `<select>` -- CONFIRMED / PENDING / CANCELLED
- Remarks: `<textarea rows="2">`, placeholder "הערות מלון (אזהרות, שיפוצים...)"

**Auto-calc nights:**
```javascript
function calcNights(checkIn, checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}
```
- Recalculate on check-in or check-out date change

**Actions:**
- "הוסף מלון" button with `hotel` icon
- Remove button per hotel card

---

### 3E -- Transfers Section

Collapsible card with header "העברות (X)":

**Each transfer row:**
- Type: `<input type="text">`, placeholder "סוג (העברה משדה תעופה, רכב פרטי...)"
- Location: `<input type="text">`, placeholder "מיקום"
- From date: `<input type="date">`
- To date: `<input type="date">`
- Pickup time: `<input type="time">`, placeholder "שעת איסוף"
- Status: `<select>` -- CONFIRMED / PENDING / CANCELLED

**Actions:**
- "הוסף העברה" button with `directions_car` icon
- Remove button per row

---

### 3F -- Notes + Travel Tips Section

Collapsible card with header "הערות ומידע נוסף":

**Notes:**
- `<textarea id="notesField" rows="3">`, placeholder "הערות נוספות..."

**Travel tips sub-section** (collapsible within the card):
- Header: "טיפים ליעד" with `tips_and_updates` icon
- Visa: `<textarea rows="2">`, placeholder "דרישות ויזה"
- Currency: `<input type="text">`, placeholder "מטבע מקומי"
- Emergency numbers: `<input type="text">`, placeholder "מספרי חירום"
- Custom tips: `<textarea rows="2">`, placeholder "מידע נוסף ליעד"

---

### 3G -- Validation

Implement `validateForm()`:

**Required fields:**
- At least 1 guest with first name and last name
- Trip date from and to (from must be before to)

**Date logic checks:**
- Hotel check-out must be after check-in
- Return flight departure must be after outbound flight departure
- Trip date range should encompass all flights and hotels

**Visual indicators:**
- Invalid fields get red border (`border-color: #DC3545`) and red helper text below
- Valid fields return to normal border
- Validation runs on "Generate Voucher" button click
- Also runs on individual field blur for immediate feedback

**Validation summary:**
- If validation fails: `showToast('יש לתקן שדות חובה', 'error')` and scroll to first invalid field
- "Generate Voucher" button: `<button id="generateBtn">` with `auto_awesome` icon
  - Styled: large, gold background, white text, full width
  - Disabled state (grayed out) until minimum fields are filled
  - Click: runs `validateForm()`, if valid calls `generateVoucher()` (Phase 4)

---

### 3H -- Wire AI to Form (with partial handling)

Implement `populateFormFromJSON(data)`:

```javascript
function populateFormFromJSON(data) {
    // General info
    if (data.reservationNumber) document.getElementById('resNumber').value = data.reservationNumber;
    if (data.tripDates?.from) document.getElementById('tripDateFrom').value = data.tripDates.from;
    if (data.tripDates?.to) document.getElementById('tripDateTo').value = data.tripDates.to;

    // Guests -- clear existing rows, add one per guest
    clearSection('guests');
    if (data.guests?.length) {
        data.guests.forEach(guest => addGuestRow(guest));
        markSectionExtracted('guests');
    }

    // Flights
    clearSection('flights');
    if (data.flights?.length) {
        data.flights.forEach(flight => addFlightCard(flight));
        markSectionExtracted('flights');
    }

    // Hotels
    clearSection('hotels');
    if (data.hotels?.length) {
        data.hotels.forEach(hotel => addHotelCard(hotel));
        markSectionExtracted('hotels');
    }

    // Transfers
    clearSection('transfers');
    if (data.transfers?.length) {
        data.transfers.forEach(transfer => addTransferRow(transfer));
        markSectionExtracted('transfers');
    }

    // Notes
    if (data.notes?.length) {
        document.getElementById('notesField').value = data.notes.join('\n');
    }

    // Switch to form view, scroll to top of form
    showFormView();
    scrollToForm();
}
```

**Per-section status badges:**
- `markSectionExtracted(sectionName)` adds a small green badge "AI" next to the section header
- Sections not populated from AI show gray badge "ידני" (Manual)

**Partial handling:**
- If `data.flights` is empty/missing: flights section stays blank but visible
- User can manually add flights even if AI didn't extract them
- After population: focus the first empty required field

---

## Acceptance Criteria

- [ ] All 6 form sections render correctly with Hebrew labels
- [ ] Collapsible cards expand/collapse on header click
- [ ] Guest rows can be added and removed (minimum 1)
- [ ] Pax count updates in guest section header
- [ ] Flight cards have all fields (direction, airline, number, aircraft, from/to, times, baggage, meal, via, remarks, status)
- [ ] Hotel cards have all fields including confirmation number, check-in/out times, rooms count
- [ ] Hotel nights auto-calculate from dates
- [ ] Transfer rows have pickup time field
- [ ] Notes and travel tips sections work
- [ ] Form validation catches missing required fields
- [ ] Invalid fields show red border and error text
- [ ] Validation toast appears on failed generate attempt
- [ ] `populateFormFromJSON()` correctly fills all form fields from AI data
- [ ] AI-extracted sections show green "AI" badge
- [ ] Manual sections show gray "ידני" badge
- [ ] Partial AI data populates only the sections that succeeded
- [ ] "Generate Voucher" button is wired (calls Phase 4 function)
- [ ] Form is responsive on mobile (single column, full-width inputs)
