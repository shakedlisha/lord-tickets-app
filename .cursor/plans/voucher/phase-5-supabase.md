# Phase 5: Supabase Storage

## Summary

Create the database table for storing vouchers, implement save/load functionality with duplicate reservation warnings, build a "Past Vouchers" panel with search, and add edit-resave, duplicate, and delete flows.

## Prerequisites

- Phase 4 complete (voucher generation works, `currentVoucherHTML` and form data are available)

## Files

| File | Action |
|------|--------|
| `supabase/migrations/013_vouchers_table.sql` | CREATE |
| `voucher.html` | MODIFY (add Supabase CRUD functions + Past Vouchers UI) |

## Mini-Steps

---

### 5A -- Database Migration

Create `supabase/migrations/013_vouchers_table.sql`:

```sql
-- Vouchers table for storing generated travel vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reservation_number TEXT,
    voucher_number TEXT UNIQUE NOT NULL,
    agent_name TEXT,
    guest_names TEXT,
    trip_dates_from DATE,
    trip_dates_to DATE,
    data_json JSONB NOT NULL DEFAULT '{}',
    voucher_html TEXT,
    language TEXT DEFAULT 'he',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search
CREATE INDEX idx_vouchers_reservation ON vouchers(reservation_number);
CREATE INDEX idx_vouchers_guest_names ON vouchers USING gin(to_tsvector('simple', guest_names));
CREATE INDEX idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX idx_vouchers_created_at ON vouchers(created_at DESC);

-- RLS policies
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Users can read their own vouchers
CREATE POLICY "Users can view own vouchers"
    ON vouchers FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own vouchers
CREATE POLICY "Users can create vouchers"
    ON vouchers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own vouchers
CREATE POLICY "Users can update own vouchers"
    ON vouchers FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own vouchers
CREATE POLICY "Users can delete own vouchers"
    ON vouchers FOR DELETE
    USING (auth.uid() = user_id);

-- Admins and managers can view all vouchers
CREATE POLICY "Admins can view all vouchers"
    ON vouchers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'manager')
        )
    );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_voucher_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vouchers_updated_at
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_voucher_timestamp();
```

**Columns explained:**
- `id`: UUID primary key
- `user_id`: FK to auth.users (who created it)
- `reservation_number`: from the booking (searchable)
- `voucher_number`: auto-generated unique (VCH-YYYYMMDD-NNN)
- `agent_name`: who issued the voucher
- `guest_names`: comma-separated for text search
- `trip_dates_from/to`: date range for filtering
- `data_json`: full form data as JSONB (the complete schema)
- `voucher_html`: the generated HTML output
- `language`: 'he' or 'en'
- `created_at/updated_at`: timestamps

---

### 5B -- Save on Generate (with duplicate warning)

Implement `saveVoucher(data, html)`:

```javascript
async function saveVoucher(data, html) {
    const supabase = window.supabase.createClient(
        LordConfig.SUPABASE_URL,
        LordConfig.SUPABASE_ANON_KEY
    );

    // Check for existing voucher with same reservation number
    if (data.reservationNumber) {
        const { data: existing } = await supabase
            .from('vouchers')
            .select('id, voucher_number')
            .eq('reservation_number', data.reservationNumber)
            .eq('user_id', getUserId())
            .maybeSingle();

        if (existing) {
            const overwrite = confirm(
                `שובר למספר הזמנה ${data.reservationNumber} כבר קיים (${existing.voucher_number}).\nלעדכן את השובר הקיים?`
            );
            if (overwrite) {
                return await updateVoucher(existing.id, data, html);
            } else {
                return; // Don't save, but voucher is still in preview
            }
        }
    }

    // Insert new voucher
    const guestNames = (data.guests || [])
        .map(g => `${g.title} ${g.firstName} ${g.lastName}`.trim())
        .join(', ');

    const { error } = await supabase.from('vouchers').insert({
        user_id: getUserId(),
        reservation_number: data.reservationNumber || '',
        voucher_number: data.voucherNumber,
        agent_name: data.agentName || '',
        guest_names: guestNames,
        trip_dates_from: data.tripDates?.from || null,
        trip_dates_to: data.tripDates?.to || null,
        data_json: data,
        voucher_html: html,
        language: data.language || 'he'
    });

    if (error) {
        showToast(`שגיאה בשמירה: ${error.message}`, 'error');
    } else {
        showToast(`שובר ${data.voucherNumber} נשמר בהצלחה`, 'success');
        refreshPastVouchers(); // Refresh the list
    }
}

async function updateVoucher(id, data, html) {
    const supabase = window.supabase.createClient(
        LordConfig.SUPABASE_URL,
        LordConfig.SUPABASE_ANON_KEY
    );

    const guestNames = (data.guests || [])
        .map(g => `${g.title} ${g.firstName} ${g.lastName}`.trim())
        .join(', ');

    const { error } = await supabase.from('vouchers').update({
        reservation_number: data.reservationNumber || '',
        agent_name: data.agentName || '',
        guest_names: guestNames,
        trip_dates_from: data.tripDates?.from || null,
        trip_dates_to: data.tripDates?.to || null,
        data_json: data,
        voucher_html: html,
        language: data.language || 'he'
    }).eq('id', id);

    if (error) {
        showToast(`שגיאה בעדכון: ${error.message}`, 'error');
    } else {
        showToast('השובר עודכן בהצלחה', 'success');
        refreshPastVouchers();
    }
}
```

- `getUserId()`: reads from `localStorage.getItem('userId')` or from Supabase session
- Save is called automatically after `generateVoucher()` succeeds
- Duplicate check uses `reservation_number` + `user_id` combo

---

### 5C -- Past Vouchers Panel

Add a collapsible panel at the top of the page (below the mode toggle):

```html
<div id="pastVouchersPanel" class="collapsible-panel">
    <div class="panel-header" onclick="togglePastVouchers()">
        <span class="material-icons">history</span>
        <span>שוברים קודמים</span>
        <span class="material-icons expand-icon">expand_more</span>
    </div>
    <div class="panel-body" style="display: none;">
        <input type="text" id="voucherSearch" placeholder="חפש לפי שם נוסע או מספר הזמנה..."
               oninput="filterVouchers(this.value)">
        <div id="vouchersList"></div>
    </div>
</div>
```

Implement `loadPastVouchers()`:

```javascript
async function loadPastVouchers() {
    const supabase = window.supabase.createClient(
        LordConfig.SUPABASE_URL,
        LordConfig.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
        .from('vouchers')
        .select('id, voucher_number, reservation_number, guest_names, trip_dates_from, trip_dates_to, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        showToast('שגיאה בטעינת שוברים', 'error');
        return;
    }

    renderVouchersList(data);
}
```

**Each voucher in the list:**
```html
<div class="voucher-list-item" onclick="loadVoucher('{id}')">
    <div class="voucher-list-main">
        <strong>{voucher_number}</strong>
        <span class="small-text">הזמנה: {reservation_number}</span>
    </div>
    <div class="voucher-list-details">
        <span>{guest_names}</span>
        <span>{trip_dates_from} - {trip_dates_to}</span>
    </div>
    <div class="voucher-list-actions">
        <button onclick="event.stopPropagation(); duplicateVoucher('{id}')" title="שכפל">
            <span class="material-icons">content_copy</span>
        </button>
        <button onclick="event.stopPropagation(); deleteVoucher('{id}')" title="מחק">
            <span class="material-icons">delete</span>
        </button>
    </div>
</div>
```

**Search/filter:**
- `filterVouchers(query)` filters the already-loaded list client-side
- Matches against `guest_names` and `reservation_number` (case-insensitive)
- Sorted by `created_at` descending (most recent first)

**Lazy loading:**
- Vouchers are fetched when the panel is first opened (not on page load)
- `refreshPastVouchers()` re-fetches after save/delete

---

### 5D -- Load and Edit-Resave

Implement `loadVoucher(id)`:

```javascript
async function loadVoucher(id) {
    const supabase = window.supabase.createClient(
        LordConfig.SUPABASE_URL,
        LordConfig.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        showToast('שגיאה בטעינת שובר', 'error');
        return;
    }

    // Enter edit mode
    currentEditId = data.id;
    currentEditVoucherNumber = data.voucher_number;

    // Populate form from saved data
    populateFormFromJSON(data.data_json);

    // Update UI to show edit mode
    document.getElementById('editModeBanner').style.display = 'block';
    document.getElementById('editModeBanner').textContent = `עריכת שובר: ${data.voucher_number}`;

    // Change "Generate" button text
    document.getElementById('generateBtn').textContent = 'עדכן שובר';

    // Show "Save as New" button
    document.getElementById('saveAsNewBtn').style.display = 'inline-flex';

    // Switch to manual mode (form view)
    setMode('manual');

    // Scroll to form
    scrollToForm();
}
```

**Edit mode state:**
- `let currentEditId = null` -- if set, we're editing an existing voucher
- `let currentEditVoucherNumber = null`
- "Generate" button text changes to "עדכן שובר" in edit mode
- "Save as New" button appears (creates a copy with new voucher number)
- Edit mode banner shows at top of form

**Save as New:**
```javascript
function saveAsNew() {
    currentEditId = null;
    currentEditVoucherNumber = null;
    document.getElementById('voucherNumber').value = generateVoucherNumber(); // new number
    document.getElementById('editModeBanner').style.display = 'none';
    document.getElementById('generateBtn').textContent = 'צור שובר';
    document.getElementById('saveAsNewBtn').style.display = 'none';
    // Now "Generate" will insert a new row instead of updating
}
```

---

### 5E -- Duplicate & Delete

**Duplicate:**
```javascript
async function duplicateVoucher(id) {
    const supabase = window.supabase.createClient(
        LordConfig.SUPABASE_URL,
        LordConfig.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
        .from('vouchers')
        .select('data_json')
        .eq('id', id)
        .single();

    if (error) {
        showToast('שגיאה', 'error');
        return;
    }

    // Load data into form but clear identifiers
    const clonedData = { ...data.data_json };
    clonedData.reservationNumber = '';
    clonedData.voucherNumber = generateVoucherNumber();

    currentEditId = null; // Not editing, creating new
    populateFormFromJSON(clonedData);
    setMode('manual');
    showToast('הנתונים שוכפלו -- ערוך ושמור כשובר חדש', 'info');
}
```

**Delete:**
```javascript
async function deleteVoucher(id) {
    if (!confirm('האם למחוק את השובר? פעולה זו אינה הפיכה.')) return;

    const supabase = window.supabase.createClient(
        LordConfig.SUPABASE_URL,
        LordConfig.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

    if (error) {
        showToast(`שגיאה במחיקה: ${error.message}`, 'error');
    } else {
        showToast('השובר נמחק', 'success');
        refreshPastVouchers();

        // If we were editing this voucher, exit edit mode
        if (currentEditId === id) {
            currentEditId = null;
            document.getElementById('editModeBanner').style.display = 'none';
            document.getElementById('generateBtn').textContent = 'צור שובר';
        }
    }
}
```

---

## Acceptance Criteria

- [ ] SQL migration creates `vouchers` table with all columns
- [ ] RLS policies allow users to CRUD own vouchers
- [ ] Admin/manager can read all vouchers
- [ ] `updated_at` auto-updates on row change
- [ ] Indexes exist for reservation_number, guest_names, user_id, created_at
- [ ] Generating a voucher auto-saves to Supabase
- [ ] Duplicate reservation number shows confirm dialog before overwriting
- [ ] Declining overwrite keeps voucher in preview without saving
- [ ] Past Vouchers panel opens/closes on click
- [ ] Panel lazy-loads vouchers on first open
- [ ] Search filters by guest name or reservation number
- [ ] List shows voucher number, reservation, guests, dates, created date
- [ ] Clicking a voucher loads its data into the form
- [ ] Edit mode shows banner with voucher number
- [ ] "Generate" button changes to "Update" in edit mode
- [ ] "Save as New" button creates a copy with new voucher number
- [ ] Duplicate loads data with cleared identifiers
- [ ] Delete shows confirm dialog and removes from database
- [ ] List refreshes after save, delete, or duplicate
- [ ] Exiting edit mode resets UI to creation mode
