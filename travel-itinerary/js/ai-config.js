/* ================================================
   AI CONFIGURATION - Source of Truth
   ================================================
   All locked product decisions, defaults, and
   guardrails for the AI itinerary system.
   ================================================ */

const AI_CONFIG = Object.freeze({

    /* ---- Model ---- */
    model: {
        provider: 'gemini',
        defaultModel: 'gemini-2.5-pro-preview-05-06',
        fallbackModel: 'gemini-2.0-flash',
        maxRetries: 2,
        timeoutMs: 30000,
        backoffBaseMs: 1000,
    },

    /* ---- Generation ---- */
    generation: {
        language: 'he',
        optionCount: { min: 3, max: 5 },
        dayDensity: 'medium',
        itemsPerDay: { activities: { min: 4, max: 6 }, food: { min: 2, max: 3 } },
        mergeStrategy: 'append',
        outputFields: [
            'why_visit',
            'best_time',
            'duration',
            'booking',
            'cost',
            'route_note'
        ],
    },

    /* ---- Preferences (trip-level, stored in DB) ---- */
    preferences: {
        storageLocation: 'db',
        dbField: 'ai_preferences',
        defaults: {
            pace: 'balanced',
            interests: [],
            budget: 'medium',
            foodPreferences: [],
            maxWalkingKm: 12,
            startTime: '08:30',
            endTime: '21:00',
            transportPreference: 'public',
        },
        askStyleBeforeEachGeneration: true,
    },

    /* ---- Approval Workflow ---- */
    approval: {
        newAttractionStatus: 'pending',
        validStatuses: ['pending', 'approved', 'rejected'],
        autoPromoteToMustDo: false,
        manualApprovalRequired: true,
    },

    /* ---- Source Ranking ---- */
    ranking: {
        sourceWeights: {
            manual_approved: 100,
            reddit_blog: 60,
            ai_generated: 40,
        },
        signals: [
            'source_authority',
            'preference_fit',
            'opening_hours_fit',
            'distance_chain_fit',
            'budget_fit',
        ],
    },

    /* ---- Routing ---- */
    routing: {
        engine: 'google_routes',
        googleRoutesEnabled: false,
        fallbackMode: 'links_only',
        defaultTransport: 'public',
        walkThresholdMinutes: 25,
        askBeforeTransportSwitch: true,
        balancedOptimization: true,
    },

    /* ---- Merge Safety ---- */
    merge: {
        defaultBehavior: 'append',
        snapshotBeforeInsert: true,
        conflictPolicy: 'prompt_user',
        preserveManualEdits: true,
        preserveExistingIds: true,
    },

    /* ---- API Budget / Rate Limits ---- */
    budget: {
        maxOptionsPerDay: 5,
        maxGenerationAttemptsPerDay: 3,
        maxDailyApiCalls: 100,
        gracefulDegradationMessage: 'הגעתם למגבלת השימוש היומית. נסו שוב מחר.',
    },

    /* ---- Deletion Policy ---- */
    deletion: {
        physicalDeleteAllowed: false,
        softDeleteField: 'status',
        archivedStatus: 'archived',
        cleanupTiming: 'post_mvp',
        cleanupOrder: ['temp_debug_files', 'unused_ui_copy'],
        approvalGranularity: 'one_by_one',
    },

    /* ---- Source Governance ---- */
    sourceGovernance: {
        allowedIngestionMethods: ['api', 'manual_entry'],
        scrapingAllowed: false,
        attributionRequired: true,
        freshnessMaxDays: 365,
        requiredMetadata: ['source_url', 'source_type', 'ingested_at'],
    },

    /* ---- Error Envelope ---- */
    errorEnvelope: {
        shape: { code: 'string', message: 'string', details: 'object|null' },
        defaultHebrewMessages: {
            generation_failed: 'שגיאה ביצירת ההצעות. נסו שוב.',
            validation_failed: 'התשובה מהמערכת לא תקינה. נסו שוב.',
            rate_limited: 'הגעתם למגבלת השימוש. נסו שוב מאוחר יותר.',
            network_error: 'שגיאת רשת. בדקו את החיבור ונסו שוב.',
            auth_required: 'נדרשת התחברות מחדש.',
        },
    },

    /* ---- UI Labels (Hebrew) ---- */
    ui: {
        suggestButton: 'הצע רעיונות ליום',
        generatingText: 'יוצר הצעות...',
        selectOptionText: 'בחרו אופציה',
        confirmModalTitle: 'לפני שמתחילים',
        appendLabel: 'הוסף לתוכן קיים',
        replaceLabel: 'החלף את תוכן היום',
        approveLabel: 'אשר',
        rejectLabel: 'דחה',
        pendingLabel: 'ממתין לאישור',
        retryLabel: 'נסו שוב',
        preferencesTitle: 'העדפות AI למסלול',
    },
});
