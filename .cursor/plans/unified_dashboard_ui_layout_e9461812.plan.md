---
name: Unified Dashboard UI Layout
overview: "Design for the new main Dashboard layout that transforms it into a connected 4-step workflow: Scan, Train AI, Passenger/Docket Setup, and Final Review."
todos: []
isProject: false
---

# Unified Dashboard UI Layout

## Goal

Redesign the main Dashboard (`dashboard.html`) to present a clear, linear, 4-step workflow. Instead of scattered charts and stats, the top of the dashboard will guide the user through the exact pipeline they need to complete after hitting "Run Now".

## The Workflow Strip

We will add a horizontal "Workflow Strip" right below the Top Bar (and below the active scan progress bar). It contains four cards representing the steps.

```html
<div class="workflow-strip">
    <!-- Step 1 -->
    <div class="workflow-step-card active">
        <div class="step-number">1</div>
        <div class="step-content">
            <h4>Scan & Extract</h4>
            <p class="text-muted">Fetch emails and extract data.</p>
            <!-- When idle: shows Last Run info -->
            <!-- When running: shows active progress -->
        </div>
    </div>

    <!-- Step 2 -->
    <div class="workflow-step-card requires-action">
        <div class="step-number">2</div>
        <div class="step-content">
            <h4>Train AI</h4>
            <p class="text-muted"><span id="queue-count">3</span> emails need classification.</p>
            <button class="btn btn-sm btn-accent" onclick="startClassificationReview()">Review Now</button>
        </div>
    </div>

    <!-- Step 3 -->
    <div class="workflow-step-card">
        <div class="step-number">3</div>
        <div class="step-content">
            <h4>Passengers & Dockets</h4>
            <p class="text-muted">Map names and match dockets.</p>
            <button class="btn btn-sm btn-outline" onclick="openDocketSetup()">Configure</button>
        </div>
    </div>

    <!-- Step 4 -->
    <div class="workflow-step-card">
        <div class="step-number">4</div>
        <div class="step-content">
            <h4>Final Review</h4>
            <p class="text-muted"><span id="review-count">5</span> receipts need approval.</p>
            <a href="/review" class="btn btn-sm btn-outline">Go to Review</a>
        </div>
    </div>
</div>
```

## How It Replaces the Old Layout

1. **Active Scan Progress**: The current `run-progress` bar and `email-log-section` will be visually integrated into or placed immediately above Step 1.
2. **AI Classification Queue**: Replaces the need for the scan to pause abruptly. The dashboard polls `/api/classification-queue`. If count > 0, Step 2 highlights yellow/red and shows "Review Now". Clicking it opens the Classification Modal to cycle through them.
3. **Passenger/Docket Setup**: Step 3 replaces the separate "Dockets" navigation. It will open a slide-out panel or modal showing newly discovered passenger names (from the scan) and the docket upload UI.
4. **Final Review**: Step 4 replaces the "Pending Review" stat card.
5. **Old Stat Cards & Charts**: The existing grid of stat cards and the charts row will be moved *below* the Workflow Strip, serving as historical analytics rather than primary actions.

## State Management

The dashboard will poll a new endpoint `/api/workflow/summary` every 5 seconds to keep the strip updated:

- `is_running`: updates Step 1
- `queued_for_review`: updates Step 2
- `passenger_names_found`: updates Step 3
- `needs_review_count`: updates Step 4

## Implementation Plan

1. **HTML Structure**: Modify `dashboard.html` to insert the `.workflow-strip` above `.cards-grid`.
2. **CSS Styling**: Add styles for `.workflow-strip`, `.workflow-step-card`, and the `.requires-action` highlight state in `style.css`.
3. **JS Logic**: Add polling in `dashboard.html` to update the step cards dynamically.
4. **AI Review Flow**: Wire the "Review Now" button in Step 2 to fetch the first queued item and show the existing classification modal, cycling through until the queue is empty.
5. **Move Dockets UI**: Begin migrating the docket upload and passenger name mapping into Step 3's UI (to be fully built out in the next phase).

