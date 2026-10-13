# Lord Tickets — User Guide

How to actually use the platform day to day. (For architecture, see `README.md`.)

**Open it:** https://shakedlisha.github.io/lord-tickets-app/ (or https://www.supatours.com/lord-tickets-app/)

Nothing to install — it's static HTML on GitHub Pages. The Supabase connection is built in (`js/config.js`), so you never type a URL or key.

---

## 0. If it stops working after a long break

Supabase pauses free projects after ~1 week of no activity. Symptom: login fails / pages load empty.

1. https://supabase.com/dashboard → project **`asqdpgxizhyazoblpzin`** → **Restore project**.
2. The travel-itinerary sub-app uses a second project, **`yestitkcxqjtkaddzyvn`** — restore that too if you use it.
3. If a page still looks old, open `clear-cache.html` once.

---

## 1. Logging in & users

Login page = `index.html`. Three options: email + password (**התחבר**), **כניסה עם Google**, or **כניסה כאורח** (read-only guest).

After login everyone lands on **מלאי טיסות** (flight inventory).

### Roles
| Role | Hebrew | Can do |
|---|---|---|
| admin | מנהל ראשי | Everything, incl. deleting users |
| manager | מנהל צוות | Everything except deleting users |
| agent | סוכן | Sees inventory read-only, adds/manages **own** passengers & sales, no costs/profit |
| guest | אורח | Read-only inventory, no calendar/voucher/passenger pages |

### Your own admin account
If you log in and see **ממתין לאישור מנהל** (waiting for approval), or you can't see the admin menu:
Supabase dashboard → **Table Editor → `users`** → your row → set `role = admin`, `is_active = true`, and make sure `auth_id` equals your user's UID from **Authentication → Users**.

Forgot password? Supabase → **Authentication → Users** → your user → send password recovery. Or just use the Google button.

### Adding staff
- **Easiest:** the person signs in with Google (or signs up). They get a "waiting for approval" screen. You go to **ניהול משתמשים** → their row is at the top marked **ממתין לאישור** → click ✓ **אשר משתמש**. Edit their role/commission first if needed.
- **Or:** **ניהול משתמשים → הוסף משתמש** (name, email, role, commission %). They get an invite email. *(Known issue: the invite link points to `login.html`, which doesn't exist — tell them to go to the main URL instead.)*
- **Disable** someone: **השבת משתמש** on their row.

---

## 2. Switching apps

Click the logo at top-left to switch between:
- **✈️ טיסות** — group flights, passengers, quotes, vouchers
- **🎫 אירועים וכרטיסים** — event tickets (Viagogo/StubHub-style resale)

---

## 3. ✈️ Flights app

### מלאי טיסות — Flight inventory (`inventory.html`)
Your master list of seat blocks.
- **Add a flight:** **הוסף טיסה** → manual tab, or **פענוח AI** tab (paste supplier text → **פענח עם AI**, or upload image → **פענח תמונה עם AI**) → **שמור** / **הוסף את כל N הטיסות**.
- **Fastest:** take a screenshot of a supplier's offer and **Ctrl+V anywhere on the page** → pick rows → **ייבא נבחרים**.
- **Import a file:** **יבוא Excel/CSV**.
- Edit seats/prices directly in the table cells (admin/manager).
- Filter by airline / availability; **ייצוא** for Excel/PDF/CSV.
- **Double-click a flight row** → opens its passenger page.

### Flight page (`flight-detail.html`) — passengers & money for one flight
- **הוסף נוסע** — add a passenger (name, outbound/return, phone, hotel, room group, price, agent, booking #). **שמור והוסף עוד** to add many quickly.
- **ייבוא מאקסל** — bulk-import passengers from Excel, or paste a screenshot (AI reads it).
- **חבילות מחיר** — define price packages for the flight.
- **לוח תשלומים לספק** — supplier deposit schedule: **הוסף אבן דרך** or **החל תבנית**; mark payments as paid. (admin/manager only)
- **מסמכים לספקים** — one-click printable/Excel: full passenger list, airline manifests (outbound/return), hotel list, transfer list, group invoice.
- Tabs: all passengers / waitlist (**רשימת המתנה**) / cancelled (**בוטלו**).
- **Cancellations:** an agent clicks **בקש ביטול** (with a reason) → manager clicks **אשר ביטול** or **דחה ביטול**.

### לוח שנה — Calendar (`calendar.html`)
Month/list view of departures. Tick **תשלומים** to also see supplier payment due dates. Share a flight on WhatsApp / Google Calendar, or **ייצוא ליומן** for an iCal file.

### מחולל הצעות — Quote generator (`quote.html`)
Build a price offer for a customer.
1. **First time:** paste your Gemini API key in the header **Gemini API Key** field (this key is also used by the flight page and ticket inventory).
2. Add flights: **📦 מהמלאי** (from your inventory), **+ הוסף ידנית**, or **📷 מתמונה** / drag-drop / Ctrl+V a screenshot.
3. Add hotels & services the same way (quick chips: transfers, event, cruise, ski…).
4. **💰 טבלת מחירים:** set commission (% or ₪), customer price, rounding (**🎯 עיגול חכם**), customer name, currency.
5. **🎯 צור הצעת מחיר** (or **📱 צור הצעת טיסות** for a WhatsApp-style flights-only offer).
6. Then: **📱 שתף בוואטסאפ**, **🖨️ הדפס / PDF**, **📋 העתק הצעה**, or **🔗 פרסם לינק זמני** (24/48/72h public link the customer opens — `view.html`).

Notes: **💾 שמור הצעה** saves only in *this browser*. The temporary link needs a `proposals` table in Supabase (not in the repo migrations — if publishing fails, that's why). **📥 ייבא תמונות** pulls images you labeled `LordTickets` in Gmail (see `SETUP_GMAIL_IMPORT.md`).

### שובר נסיעה — Travel voucher (`voucher.html`)
Printable voucher for a customer's trip.
1. **חילוץ מקובץ** → upload booking confirmations (PDF/images/TXT) → **חלץ נתונים עם AI**. Or **הזנה ידנית**.
2. Fix fields: passengers, flights, hotels, transfers, payment, voucher language (HE/EN).
3. **צור שובר** — builds the preview and saves automatically.
4. **הדפס** / HTML / PDF / **העתק**.
5. **שוברים קודמים** — search, reopen, duplicate (**שכפל**) old vouchers.

If AI asks for a key here, enter it in the key row on this page (it's stored separately from the quote page's key).

### Admin/manager only
- **לוח בקרה** (`analytics.html`) — revenue, passengers, occupancy, agent performance, cash-flow exposure, upcoming payments & flights. Pick a period at the top.
- **דוחות** (`reports.html`) — daily/weekly/monthly/flight/agent/custom reports → **צור דו"ח** → print. Quick buttons: today, yesterday, this week, this month. (The "email" button isn't implemented; "PDF" downloads an HTML file — use print → Save as PDF.)
- **ניהול משתמשים** (`users.html`) — see section 1.

---

## 4. 🎫 Events & tickets app

### מלאי כרטיסים — Ticket inventory (`tickets-inventory.html`)
1. **אירוע חדש** — create the event (name, type, date, venue, city).
2. **כרטיס חדש** — add tickets bought (event, supplier, block/row/seats, qty, buy price, sell price, currency).
3. Or bulk: **יבוא** (file / paste from Google Sheets), **AI טקסט**, or Ctrl+V a screenshot → **ייבא נבחרים**. (Uses the Gemini key you saved on the quote page.)
4. Filter by event/supplier/status/date; bulk **שנה סטטוס**; **ייצוא**.
5. To open an event's page, use the **calendar**, **sales** page, or dashboard (opening it from this table currently bounces back — known bug).

### Event page (`ticket-detail.html`)
Stats for the event (investment, revenue, profit), its tickets, and buyers.
**מכירה חדשה** → pick a ticket, buyer name/phone, qty, price, payment method, delivery method → **שמור מכירה**. Export the buyers list.

### לוח אירועים — Events calendar (`tickets-calendar.html`)
Colour = sales status (fully sold / partly sold / unsold / no tickets). Click an event to open it.

### מכירות — Sales (`tickets-sales.html`)
All sales across events. **מכירה חדשה**, filter by status (pending/confirmed/delivered/cancelled) or event, export. Double-click a row to open the event.

### Admin/manager: לוח בקרה & דוחות
Profit by event, unsold exposure, supplier breakdown. Reports: inventory, financial, sales, suppliers, exposure, buyers → **הפק דוח** → CSV/Excel/print.

---

## 5. AI (Gemini) setup — what needs a key where

| Feature | Key comes from |
|---|---|
| Flight inventory AI / paste | Server secret on Supabase (`gemini-proxy` function) |
| Voucher AI | Server secret first, falls back to the key typed on the voucher page |
| Quote generator, flight-page passenger import, ticket inventory AI | Key typed in the quote page header (saved in your browser) |

Get a key at https://aistudio.google.com/apikey.
Server secret: `supabase secrets set GEMINI_API_KEY=...` (Supabase CLI), or Supabase dashboard → **Edge Functions → Secrets**.

The code uses older Gemini model names (`gemini-2.0-flash`, `gemini-1.5-*`). If AI features return errors, the model may have been retired by Google and the name needs updating in the code.

---

## 6. Side tools (optional)

- **Travel itinerary builder** — `/travel-itinerary/` (not linked from the menu). Separate login (users created in its own Supabase project). Build day-by-day trips, AI day suggestions, attractions library, and share a public link with the client (**העתק קישור**).
- **Gmail image import** — `gmail-to-drive-script.js` + `SETUP_GMAIL_IMPORT.md`. Label an email `LordTickets`, wait ~5 min, then **📥 ייבא תמונות** in the quote page.
- **`flight-inventory/`** — old local Streamlit prototype (`START_APP.bat` or `streamlit run app.py`). Not connected to the database; you don't need it.
