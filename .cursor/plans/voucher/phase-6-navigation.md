# Phase 6: Navigation Integration

## Summary

Add the "שובר נסיעה" (Travel Voucher) link to both the Flights and Tickets navigation sections in `js/nav.js`, and add `voucher.html` to the service worker cache in `sw.js`.

## Prerequisites

- Phase 1 complete (`voucher.html` exists and loads correctly)
- Can be done in parallel with Phases 2-5

## Files

| File | Action |
|------|--------|
| `js/nav.js` | MODIFY |
| `sw.js` | MODIFY |

## Mini-Steps

---

### 6A -- Flights Nav Link

In `js/nav.js`, inside the `getNavHTML()` function, add the voucher link to the **Flights** navigation section.

**Location**: After the quote.html link (line ~73), before the admin-only links block.

**Add:**
```javascript
<a href="voucher.html" class="nav-link ${currentPage === 'voucher' ? 'active' : ''}">
    <span class="material-icons">description</span>
    שובר נסיעה
</a>
```

**No role gate** -- this link is visible to all logged-in users (admin, manager, agent), same as the quote link.

**Current Flights nav structure (before):**
```
inventory.html  (מלאי טיסות)
calendar.html   (לוח שנה)        -- hidden for guests
quote.html      (מחולל הצעות)
                                  <-- INSERT HERE
analytics.html  (לוח בקרה)       -- admin/manager only
reports.html    (דוחות)           -- admin/manager only
users.html      (ניהול משתמשים)  -- admin/manager only
```

**After:**
```
inventory.html  (מלאי טיסות)
calendar.html   (לוח שנה)
quote.html      (מחולל הצעות)
voucher.html    (שובר נסיעה)     <-- NEW
analytics.html  (לוח בקרה)
reports.html    (דוחות)
users.html      (ניהול משתמשים)
```

---

### 6B -- Tickets Nav Link

In the same `getNavHTML()` function, add the voucher link to the **Tickets** navigation section.

**Location**: After the tickets-sales.html link (line ~103), before the admin-only links block.

**Add the same link:**
```javascript
<a href="voucher.html" class="nav-link ${currentPage === 'voucher' ? 'active' : ''}">
    <span class="material-icons">description</span>
    שובר נסיעה
</a>
```

**Current Tickets nav structure (before):**
```
tickets-inventory.html  (מלאי כרטיסים)
tickets-calendar.html   (לוח אירועים)    -- hidden for guests
tickets-sales.html      (מכירות)
                                           <-- INSERT HERE
tickets-analytics.html  (לוח בקרה)        -- admin/manager only
tickets-reports.html    (דוחות)            -- admin/manager only
users.html              (ניהול משתמשים)   -- admin/manager only
```

---

### 6C -- Service Worker Cache

In `sw.js`, add `'voucher.html'` to the list of files cached by the service worker.

**Find** the array of cached files (typically named `CACHE_FILES` or similar) and add `'voucher.html'` to it.

This ensures the voucher page is available offline (consistent with the existing PWA pattern for other pages like `inventory.html`, `calendar.html`, etc.).

---

## Acceptance Criteria

- [ ] "שובר נסיעה" link appears in the Flights navigation (after "מחולל הצעות")
- [ ] "שובר נסיעה" link appears in the Tickets navigation (after "מכירות")
- [ ] Link uses `description` Material Icon
- [ ] Link is visible to all roles (admin, manager, agent) -- not just admin/manager
- [ ] Link is hidden for guest users (same as calendar link behavior)
- [ ] Link gets `active` class when on `voucher.html`
- [ ] Clicking the link navigates to `voucher.html`
- [ ] `voucher.html` is in the service worker cache list
- [ ] Navigation still works correctly on all other pages (no regressions)
- [ ] App switcher dropdown still works (Flights / Tickets toggle)
