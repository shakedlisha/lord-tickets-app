/* ================================================
   AI PANEL - Day generation wizard
   ================================================
   3-step flow: Preferences → City Options → Day Plan Preview
   ================================================ */

const AiPanel = {
    tripId: null,
    dayIndex: null,
    dayData: null,
    tripData: null,
    currentStep: 1,
    preferences: null,
    selectedOption: null,
    generatedPlan: null,
    generationAttempts: 0,
    _apiCallsToday: 0,
    _apiCallsDate: null,

    /* ---- Public Entry Point ---- */

    async open(tripId, dayIndex, dayData, tripData) {
        this.tripId = tripId;
        this.dayIndex = dayIndex;
        this.dayData = dayData;
        this.tripData = tripData;
        this.currentStep = 1;
        this.selectedOption = null;
        this.generatedPlan = null;
        this.generationAttempts = 0;

        try {
            this.preferences = await getAiPreferences(tripId);
        } catch (e) {
            console.error('Failed to load AI preferences:', e);
            this.preferences = { ...AI_CONFIG.preferences.defaults };
        }

        this._showModal();
        this._renderStep();
    },

    close() {
        const modal = document.getElementById('ai-panel-modal');
        if (modal) modal.classList.add('hidden');
        this.tripId = null;
        this.dayIndex = null;
        this.dayData = null;
        this.tripData = null;
        this.selectedOption = null;
        this.generatedPlan = null;
    },

    /* ---- Modal Shell ---- */

    _showModal() {
        const modal = document.getElementById('ai-panel-modal');
        modal.classList.remove('hidden');
        modal.innerHTML = `
            <div class="ai-modal-container">
                <div class="ai-modal-header">
                    <div class="ai-modal-header-right">
                        <h3>✨ ${escapeHtml(AI_CONFIG.ui.suggestButton)}</h3>
                    </div>
                    <button class="btn-close-ai" id="ai-close-btn">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div id="ai-steps-bar"></div>
                <div class="ai-modal-body" id="ai-modal-body"></div>
                <div class="ai-modal-footer" id="ai-modal-footer"></div>
            </div>
        `;

        document.getElementById('ai-close-btn').onclick = () => this.close();

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    },

    /* ---- Budget Tracking ---- */

    _checkBudget() {
        const today = new Date().toDateString();
        if (this._apiCallsDate !== today) {
            this._apiCallsDate = today;
            this._apiCallsToday = 0;
        }
        if (this._apiCallsToday >= AI_CONFIG.budget.maxDailyApiCalls) {
            return false;
        }
        return true;
    },

    _trackApiCall() {
        const today = new Date().toDateString();
        if (this._apiCallsDate !== today) {
            this._apiCallsDate = today;
            this._apiCallsToday = 0;
        }
        this._apiCallsToday++;
    },

    _renderStepBar() {
        const steps = [
            { num: 1, label: 'העדפות' },
            { num: 2, label: 'בחירת אופציה' },
            { num: 3, label: 'תצוגה מקדימה' },
        ];

        const bar = document.getElementById('ai-steps-bar');
        if (!bar) return;

        bar.innerHTML = `
            <div class="ai-steps">
                ${steps.map((s, i) => `
                    <div class="ai-step ${s.num === this.currentStep ? 'active' : ''} ${s.num < this.currentStep ? 'completed' : ''}">
                        <span class="ai-step-number">${s.num < this.currentStep ? '✓' : s.num}</span>
                        <span>${s.label}</span>
                    </div>
                    ${i < steps.length - 1 ? `<div class="ai-step-divider ${s.num < this.currentStep ? 'completed' : ''}"></div>` : ''}
                `).join('')}
            </div>
        `;
    },

    _renderStep() {
        this._renderStepBar();
        switch (this.currentStep) {
            case 1: this._renderPreferences(); break;
            case 2: this._renderCityOptions(); break;
            case 3: this._renderDayPreview(); break;
        }
    },

    /* ---- Step 1: Preferences ---- */

    _renderPreferences() {
        const body = document.getElementById('ai-modal-body');
        const footer = document.getElementById('ai-modal-footer');
        const p = this.preferences;
        const day = this.dayData;

        const hasCity = !!(day.city || day.cityEn);

        body.innerHTML = `
            <div class="ai-day-context">
                <div class="ai-day-context-icon">📍</div>
                <div class="ai-day-context-info">
                    <strong>יום ${this.dayIndex + 1}: ${escapeHtml(day.title || '')}</strong>
                    <span>${escapeHtml(day.city || 'לא צוינה עיר')} ${day.date ? '• ' + escapeHtml(day.date) : ''}</span>
                </div>
            </div>

            <div class="ai-prefs-form">
                <div class="ai-prefs-section ai-city-section ${hasCity ? '' : 'ai-city-required'}">
                    <label>עיר / יעד <span style="color:var(--danger)">*</span></label>
                    <div style="display:flex;gap:8px;">
                        <input type="text" class="ai-prefs-input" id="ai-city-he" placeholder="שם בעברית (למשל: טוקיו)" value="${escapeHtml(day.city || '')}" style="flex:1;">
                        <input type="text" class="ai-prefs-input" id="ai-city-en" placeholder="English name (e.g. Tokyo)" value="${escapeHtml(day.cityEn || '')}" dir="ltr" style="flex:1;">
                    </div>
                    ${!hasCity ? '<div class="ai-city-hint">⚠️ חובה למלא עיר כדי לקבל הצעות</div>' : ''}
                </div>

                <div class="ai-prefs-section">
                    <label>קצב הטיול</label>
                    <div class="ai-prefs-radio-group">
                        <input type="radio" name="ai-pace" value="relaxed" id="pace-relaxed" class="ai-prefs-radio" ${p.pace === 'relaxed' ? 'checked' : ''}>
                        <label for="pace-relaxed" class="ai-prefs-radio-label">🧘 רגוע</label>
                        <input type="radio" name="ai-pace" value="balanced" id="pace-balanced" class="ai-prefs-radio" ${p.pace === 'balanced' ? 'checked' : ''}>
                        <label for="pace-balanced" class="ai-prefs-radio-label">⚖️ מאוזן</label>
                        <input type="radio" name="ai-pace" value="intense" id="pace-intense" class="ai-prefs-radio" ${p.pace === 'intense' ? 'checked' : ''}>
                        <label for="pace-intense" class="ai-prefs-radio-label">🔥 אינטנסיבי</label>
                    </div>
                </div>

                <div class="ai-prefs-section">
                    <label>תקציב</label>
                    <div class="ai-prefs-radio-group">
                        <input type="radio" name="ai-budget" value="low" id="budget-low" class="ai-prefs-radio" ${p.budget === 'low' ? 'checked' : ''}>
                        <label for="budget-low" class="ai-prefs-radio-label">💰 חסכוני</label>
                        <input type="radio" name="ai-budget" value="medium" id="budget-medium" class="ai-prefs-radio" ${p.budget === 'medium' ? 'checked' : ''}>
                        <label for="budget-medium" class="ai-prefs-radio-label">💳 בינוני</label>
                        <input type="radio" name="ai-budget" value="high" id="budget-high" class="ai-prefs-radio" ${p.budget === 'high' ? 'checked' : ''}>
                        <label for="budget-high" class="ai-prefs-radio-label">💎 פרימיום</label>
                    </div>
                </div>

                <div class="ai-prefs-section">
                    <label>תחומי עניין</label>
                    <div class="ai-prefs-checkbox-group">
                        ${this._renderInterestCheckboxes(p.interests || [])}
                    </div>
                </div>

                <div class="ai-prefs-section">
                    <label>תחבורה מועדפת</label>
                    <div class="ai-prefs-radio-group">
                        <input type="radio" name="ai-transport" value="public" id="transport-public" class="ai-prefs-radio" ${p.transportPreference === 'public' ? 'checked' : ''}>
                        <label for="transport-public" class="ai-prefs-radio-label">🚆 תחבורה ציבורית</label>
                        <input type="radio" name="ai-transport" value="walking" id="transport-walking" class="ai-prefs-radio" ${p.transportPreference === 'walking' ? 'checked' : ''}>
                        <label for="transport-walking" class="ai-prefs-radio-label">🚶 הליכה</label>
                        <input type="radio" name="ai-transport" value="mixed" id="transport-mixed" class="ai-prefs-radio" ${p.transportPreference === 'mixed' ? 'checked' : ''}>
                        <label for="transport-mixed" class="ai-prefs-radio-label">🔀 משולב</label>
                    </div>
                </div>

                <div class="ai-prefs-row">
                    <div class="ai-prefs-section">
                        <label>מקסימום הליכה (ק"מ)</label>
                        <input type="number" class="ai-prefs-input" id="ai-max-walking" value="${p.maxWalkingKm || 12}" min="1" max="30" dir="ltr">
                    </div>
                    <div class="ai-prefs-section">
                        <label>שעות פעילות</label>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <input type="time" class="ai-prefs-input" id="ai-start-time" value="${p.startTime || '08:30'}" dir="ltr">
                            <span style="color:var(--text-muted);">–</span>
                            <input type="time" class="ai-prefs-input" id="ai-end-time" value="${p.endTime || '21:00'}" dir="ltr">
                        </div>
                    </div>
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button class="btn btn-ghost" id="ai-cancel-btn">ביטול</button>
            <button class="btn btn-primary" id="ai-next-btn">
                <span class="material-icons-round">auto_awesome</span>
                ${escapeHtml(AI_CONFIG.ui.generatingText.replace('...', ''))} הצעות
            </button>
        `;

        document.getElementById('ai-cancel-btn').onclick = () => this.close();
        document.getElementById('ai-next-btn').onclick = () => this._onPreferencesConfirm();
    },

    _renderInterestCheckboxes(selected) {
        const interests = [
            { value: 'culture', label: '🏛️ תרבות', },
            { value: 'food', label: '🍜 אוכל' },
            { value: 'nature', label: '🌿 טבע' },
            { value: 'shopping', label: '🛍️ קניות' },
            { value: 'nightlife', label: '🌃 חיי לילה' },
            { value: 'art', label: '🎨 אמנות' },
            { value: 'history', label: '📜 היסטוריה' },
            { value: 'adventure', label: '🧗 הרפתקאות' },
        ];

        return interests.map(i => `
            <input type="checkbox" class="ai-prefs-checkbox" id="interest-${i.value}" value="${i.value}" ${selected.includes(i.value) ? 'checked' : ''}>
            <label for="interest-${i.value}" class="ai-prefs-checkbox-label">${i.label}</label>
        `).join('');
    },

    async _onPreferencesConfirm() {
        // Read city from the form inputs
        const cityHe = (document.getElementById('ai-city-he')?.value || '').trim();
        const cityEn = (document.getElementById('ai-city-en')?.value || '').trim();

        if (!cityHe && !cityEn) {
            const hint = document.querySelector('.ai-city-hint');
            if (hint) {
                hint.style.animation = 'none';
                void hint.offsetHeight;
                hint.style.animation = 'shake 0.4s ease';
            }
            document.getElementById('ai-city-he')?.focus();
            return;
        }

        // Save city back to day data so it persists
        this.dayData.city = cityHe || this.dayData.city;
        this.dayData.cityEn = cityEn || this.dayData.cityEn;

        // Also update the trip data so AdminForm can save it
        if (this.tripData?.days?.[this.dayIndex]) {
            this.tripData.days[this.dayIndex].city = this.dayData.city;
            this.tripData.days[this.dayIndex].cityEn = this.dayData.cityEn;
        }

        const prefs = this._collectPreferences();
        this.preferences = prefs;

        try {
            await saveAiPreferences(this.tripId, prefs);
        } catch (e) {
            console.error('Failed to save preferences:', e);
        }

        this.currentStep = 2;
        this._renderStep();
        await this._fetchCityOptions();
    },

    _collectPreferences() {
        const pace = document.querySelector('input[name="ai-pace"]:checked')?.value || 'balanced';
        const budget = document.querySelector('input[name="ai-budget"]:checked')?.value || 'medium';
        const transportPreference = document.querySelector('input[name="ai-transport"]:checked')?.value || 'public';
        const maxWalkingKm = parseInt(document.getElementById('ai-max-walking')?.value) || 12;
        const startTime = document.getElementById('ai-start-time')?.value || '08:30';
        const endTime = document.getElementById('ai-end-time')?.value || '21:00';

        const interests = [];
        document.querySelectorAll('.ai-prefs-checkbox:checked').forEach(cb => {
            interests.push(cb.value);
        });

        return { pace, budget, interests, transportPreference, maxWalkingKm, startTime, endTime, foodPreferences: this.preferences.foodPreferences || [] };
    },

    /* ---- Ranking ---- */

    _rankAttractions(attractions) {
        const weights = AI_CONFIG.ranking.sourceWeights;

        return [...attractions].sort((a, b) => {
            const weightA = weights[a.source_type] || weights.ai_generated || 0;
            const weightB = weights[b.source_type] || weights.ai_generated || 0;

            if (a.source_type === 'manual' || a.source_type === 'manual_approved') {
                return -1;
            }
            if (b.source_type === 'manual' || b.source_type === 'manual_approved') {
                return 1;
            }

            return weightB - weightA;
        });
    },

    _prepareAttractionPayload(attractions) {
        const ranked = this._rankAttractions(attractions);
        return ranked.map((a, idx) => ({
            name: a.name,
            name_en: a.name_en || '',
            why_visit: a.why_visit || '',
            category: a.category || '',
            priority: idx + 1,
            source: a.source_type || 'unknown',
            isManualMustDo: a.source_type === 'manual',
        }));
    },

    /* ---- Step 2: City Options ---- */

    async _fetchCityOptions() {
        const body = document.getElementById('ai-modal-body');
        const footer = document.getElementById('ai-modal-footer');

        if (!this._checkBudget()) {
            this._showError(AI_CONFIG.budget.gracefulDegradationMessage);
            return;
        }

        body.innerHTML = `
            <div class="ai-loading">
                <div class="ai-loading-spinner"></div>
                <div class="ai-loading-text">${escapeHtml(AI_CONFIG.ui.generatingText)}</div>
                <div class="ai-loading-sub">מחפש הצעות ל${escapeHtml(this.dayData.city || this.dayData.cityEn || 'היום')}...</div>
            </div>
        `;
        footer.innerHTML = '';

        try {
            let approvedAttractions = [];
            try {
                const cityFilter = this.dayData.cityEn || this.dayData.city;
                if (cityFilter) {
                    approvedAttractions = await fetchAttractions({ status: 'approved', city_en: cityFilter });
                }
            } catch (e) {
                console.warn('Could not fetch approved attractions:', e);
            }

            this._trackApiCall();
            const result = await invokeAiFunction('cityOptions', {
                city: this.dayData.city,
                city_en: this.dayData.cityEn,
                date: this.dayData.date,
                dayOfWeek: this.dayData.dayOfWeek,
                preferences: this.preferences,
                approvedAttractions: this._prepareAttractionPayload(approvedAttractions),
            });

            if (result.options && result.options.length > 0) {
                this._renderOptionsCards(result.options);
            } else {
                this._showError('לא התקבלו הצעות. נסו שוב.');
            }
        } catch (e) {
            console.error('cityOptions error:', e);
            this._showError(e.message || AI_CONFIG.errorEnvelope.defaultHebrewMessages.generation_failed);
        }
    },

    _renderCityOptions() {
        // This is called when navigating back to step 2 — re-fetch
        this._fetchCityOptions();
    },

    _renderOptionsCards(options) {
        const body = document.getElementById('ai-modal-body');
        const footer = document.getElementById('ai-modal-footer');

        const vibeLabels = {
            cultural: 'תרבות',
            nature: 'טבע',
            urban: 'עירוני',
            food: 'אוכל',
            shopping: 'קניות',
            mixed: 'מגוון',
        };

        body.innerHTML = `
            <div class="ai-day-context">
                <div class="ai-day-context-icon">🗺️</div>
                <div class="ai-day-context-info">
                    <strong>${escapeHtml(AI_CONFIG.ui.selectOptionText)}</strong>
                    <span>בחרו את הקונספט שמתאים לכם ליום ${this.dayIndex + 1}</span>
                </div>
            </div>
            <div class="ai-options-grid" id="ai-options-grid">
                ${options.map((opt, i) => `
                    <div class="ai-option-card" data-option-index="${i}">
                        ${opt.vibe ? `<span class="ai-option-vibe ${escapeHtml(opt.vibe)}">${escapeHtml(vibeLabels[opt.vibe] || opt.vibe)}</span>` : ''}
                        <div class="ai-option-title">${escapeHtml(opt.title)}</div>
                        <div class="ai-option-description">${escapeHtml(opt.description)}</div>
                        ${opt.areas && opt.areas.length ? `
                            <div class="ai-option-tags">
                                ${opt.areas.map(a => `<span class="ai-option-tag">${escapeHtml(a)}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="ai-option-meta">
                            ${opt.highlight_count ? `<span>📍 ${opt.highlight_count} אטרקציות</span>` : ''}
                            ${opt.food_count ? `<span>🍽️ ${opt.food_count} מסעדות</span>` : ''}
                            ${opt.estimated_walking_km ? `<span>🚶 ${opt.estimated_walking_km} ק"מ</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        footer.innerHTML = `
            <button class="btn btn-ghost" id="ai-back-btn">
                <span class="material-icons-round">arrow_forward</span>
                חזרה
            </button>
            <button class="btn btn-primary" id="ai-generate-plan-btn" disabled>
                <span class="material-icons-round">auto_awesome</span>
                בנה תוכנית יום
            </button>
        `;

        this._cachedOptions = options;
        this.selectedOption = null;

        document.getElementById('ai-back-btn').onclick = () => {
            this.currentStep = 1;
            this._renderStep();
        };

        const generateBtn = document.getElementById('ai-generate-plan-btn');
        generateBtn.onclick = () => this._onOptionSelected();

        document.getElementById('ai-options-grid').addEventListener('click', (e) => {
            const card = e.target.closest('.ai-option-card');
            if (!card) return;

            document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            const idx = parseInt(card.dataset.optionIndex);
            this.selectedOption = this._cachedOptions[idx];
            generateBtn.disabled = false;
        });
    },

    async _onOptionSelected() {
        if (!this.selectedOption) return;

        this.currentStep = 3;
        this._renderStepBar();
        await this._fetchDayPlan();
    },

    /* ---- Step 3: Day Plan Preview ---- */

    async _fetchDayPlan() {
        const body = document.getElementById('ai-modal-body');
        const footer = document.getElementById('ai-modal-footer');
        this.generationAttempts++;

        if (!this._checkBudget()) {
            this._showError(AI_CONFIG.budget.gracefulDegradationMessage);
            return;
        }

        body.innerHTML = `
            <div class="ai-loading">
                <div class="ai-loading-spinner"></div>
                <div class="ai-loading-text">בונה תוכנית יום...</div>
                <div class="ai-loading-sub">יוצר מסלול מפורט על בסיס "${escapeHtml(this.selectedOption.title)}"</div>
            </div>
        `;
        footer.innerHTML = '';

        try {
            let approvedAttractions = [];
            try {
                const cityFilter = this.dayData.cityEn || this.dayData.city;
                if (cityFilter) {
                    approvedAttractions = await fetchAttractions({ status: 'approved', city_en: cityFilter });
                }
            } catch (e) {
                console.warn('Could not fetch approved attractions:', e);
            }

            this._trackApiCall();
            const result = await invokeAiFunction('dayPlan', {
                city: this.dayData.city,
                city_en: this.dayData.cityEn,
                date: this.dayData.date,
                dayOfWeek: this.dayData.dayOfWeek,
                selectedOption: this.selectedOption,
                preferences: this.preferences,
                approvedAttractions: this._prepareAttractionPayload(approvedAttractions),
                hotel: this.dayData.hotel,
            });

            if (result.items && result.items.length > 0) {
                this.generatedPlan = result;
                this._renderPlanPreview(result);
            } else {
                this._showError('לא התקבלה תוכנית. נסו שוב.');
            }
        } catch (e) {
            console.error('dayPlan error:', e);
            this._showError(e.message || AI_CONFIG.errorEnvelope.defaultHebrewMessages.generation_failed);
        }
    },

    _renderDayPreview() {
        if (this.generatedPlan) {
            this._renderPlanPreview(this.generatedPlan);
        } else {
            this._fetchDayPlan();
        }
    },

    _renderPlanPreview(plan) {
        const body = document.getElementById('ai-modal-body');
        const footer = document.getElementById('ai-modal-footer');

        const itemsHtml = (plan.items || []).map(item => {
            const badges = [];
            if (item.fee && item.fee.amount) {
                const symbol = item.fee.currency === 'yen' ? '¥' : '₪';
                badges.push(`<span class="ai-preview-badge cost">${symbol}${item.fee.amount}</span>`);
            }
            if (item.estimated_duration) {
                badges.push(`<span class="ai-preview-badge duration">⏱ ${escapeHtml(item.estimated_duration)}</span>`);
            }
            if (item.bookInAdvance) {
                badges.push(`<span class="ai-preview-badge booking">🎫 הזמנה מראש</span>`);
            }

            return `
                <div class="ai-preview-item" data-type="${escapeHtml(item.type || 'activity')}">
                    <div class="ai-preview-item-time">
                        <span class="emoji">${escapeHtml(item.emoji || '📍')}</span>
                        <span class="time">${escapeHtml(item.time || '')}</span>
                    </div>
                    <div class="ai-preview-item-content">
                        <div class="ai-preview-item-title">${escapeHtml(item.title)}</div>
                        ${item.titleEn ? `<div class="ai-preview-item-title-en">${escapeHtml(item.titleEn)}</div>` : ''}
                        ${item.description ? `<div class="ai-preview-item-desc">${escapeHtml(item.description)}</div>` : ''}
                        ${badges.length ? `<div class="ai-preview-item-badges">${badges.join('')}</div>` : ''}
                        ${item.route_note ? `<div class="ai-preview-route-note">🚶 ${escapeHtml(item.route_note)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const tipsHtml = plan.tips && plan.tips.length ? `
            <div class="ai-preview-tips">
                <h4>💡 טיפים ליום</h4>
                <ul>
                    ${plan.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
                </ul>
            </div>
        ` : '';

        body.innerHTML = `
            <div class="ai-day-context">
                <div class="ai-day-context-icon">✅</div>
                <div class="ai-day-context-info">
                    <strong>תצוגה מקדימה - ${escapeHtml(this.selectedOption.title)}</strong>
                    <span>${plan.items.length} פריטים • יום ${this.dayIndex + 1}</span>
                </div>
            </div>
            <div class="ai-preview-timeline">
                ${itemsHtml}
            </div>
            ${tipsHtml}
        `;

        const canRetry = this.generationAttempts < AI_CONFIG.budget.maxGenerationAttemptsPerDay;

        footer.innerHTML = `
            <div style="display:flex;gap:8px;">
                <button class="btn btn-ghost" id="ai-back-options-btn">
                    <span class="material-icons-round">arrow_forward</span>
                    חזרה לאופציות
                </button>
                ${canRetry ? `
                    <button class="btn btn-secondary" id="ai-regenerate-btn">
                        <span class="material-icons-round">refresh</span>
                        ${escapeHtml(AI_CONFIG.ui.retryLabel)}
                    </button>
                ` : ''}
            </div>
            <button class="btn btn-primary" id="ai-confirm-merge-btn">
                <span class="material-icons-round">check</span>
                ${escapeHtml(AI_CONFIG.ui.appendLabel)}
            </button>
        `;

        document.getElementById('ai-back-options-btn').onclick = () => {
            this.currentStep = 2;
            this.generatedPlan = null;
            this._renderStep();
        };

        if (canRetry) {
            document.getElementById('ai-regenerate-btn').onclick = () => {
                this.generatedPlan = null;
                this._fetchDayPlan();
            };
        }

        document.getElementById('ai-confirm-merge-btn').onclick = () => this._onConfirmMerge();
    },

    /* ---- Merge into Trip ---- */

    async _onConfirmMerge() {
        if (!this.generatedPlan || !this.generatedPlan.items) return;

        const day = this.dayData;
        const hasExistingItems = day.items && day.items.length > 0;

        if (hasExistingItems && AI_CONFIG.merge.conflictPolicy === 'prompt_user') {
            this._showMergeStrategyModal();
        } else {
            await this._executeMerge('append');
        }
    },

    _showMergeStrategyModal() {
        const body = document.getElementById('ai-modal-body');
        const footer = document.getElementById('ai-modal-footer');
        const existingCount = (this.dayData.items || []).length;

        body.innerHTML = `
            <div class="ai-day-context">
                <div class="ai-day-context-icon">⚠️</div>
                <div class="ai-day-context-info">
                    <strong>ליום הזה כבר יש ${existingCount} פריטים</strong>
                    <span>איך תרצו להוסיף את התוכן החדש?</span>
                </div>
            </div>
            <div class="ai-merge-options">
                <div class="ai-merge-option selected" data-strategy="append">
                    <div class="ai-merge-option-icon">➕</div>
                    <div class="ai-merge-option-content">
                        <strong>${escapeHtml(AI_CONFIG.ui.appendLabel)}</strong>
                        <span>הפריטים החדשים יתווספו בסוף הרשימה הקיימת</span>
                    </div>
                </div>
                <div class="ai-merge-option" data-strategy="replace">
                    <div class="ai-merge-option-icon">🔄</div>
                    <div class="ai-merge-option-content">
                        <strong>${escapeHtml(AI_CONFIG.ui.replaceLabel)}</strong>
                        <span>התוכן הקיים יוחלף בתוכן החדש (גיבוי אוטומטי)</span>
                    </div>
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button class="btn btn-ghost" id="ai-merge-cancel-btn">
                <span class="material-icons-round">arrow_forward</span>
                חזרה לתצוגה מקדימה
            </button>
            <button class="btn btn-primary" id="ai-merge-confirm-btn">
                <span class="material-icons-round">check</span>
                אישור
            </button>
        `;

        let selectedStrategy = 'append';

        document.querySelectorAll('.ai-merge-option').forEach(opt => {
            opt.onclick = () => {
                document.querySelectorAll('.ai-merge-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedStrategy = opt.dataset.strategy;
            };
        });

        document.getElementById('ai-merge-cancel-btn').onclick = () => {
            this._renderPlanPreview(this.generatedPlan);
        };

        document.getElementById('ai-merge-confirm-btn').onclick = () => {
            this._executeMerge(selectedStrategy);
        };
    },

    async _executeMerge(strategy) {
        const footer = document.getElementById('ai-modal-footer');
        const body = document.getElementById('ai-modal-body');

        body.innerHTML = `
            <div class="ai-loading">
                <div class="ai-loading-spinner"></div>
                <div class="ai-loading-text">שומר שינויים...</div>
            </div>
        `;
        footer.innerHTML = '';

        try {
            if (typeof AdminForm !== 'undefined' && AdminForm.mergeAiItems) {
                await AdminForm.mergeAiItems(
                    this.dayIndex,
                    this.generatedPlan.items,
                    this.generatedPlan.tips || [],
                    strategy
                );
            }

            showToast('התוכנית נוספה בהצלחה! ✨', 'success');
            this.close();
        } catch (e) {
            console.error('Merge failed:', e);
            showToast('שגיאה בהוספת התוכנית', 'error');
            this._renderPlanPreview(this.generatedPlan);
        }
    },

    /* ---- Error Display ---- */

    _showError(message) {
        const body = document.getElementById('ai-modal-body');
        const footer = document.getElementById('ai-modal-footer');

        body.innerHTML = `
            <div class="ai-error">
                <div class="ai-error-icon">⚠️</div>
                <div class="ai-error-message">${escapeHtml(message)}</div>
            </div>
        `;

        footer.innerHTML = `
            <button class="btn btn-ghost" id="ai-error-back-btn">
                <span class="material-icons-round">arrow_forward</span>
                חזרה
            </button>
            <button class="btn btn-primary" id="ai-error-retry-btn">
                <span class="material-icons-round">refresh</span>
                ${escapeHtml(AI_CONFIG.ui.retryLabel)}
            </button>
        `;

        document.getElementById('ai-error-back-btn').onclick = () => {
            if (this.currentStep > 1) {
                this.currentStep--;
                this._renderStep();
            } else {
                this.close();
            }
        };

        document.getElementById('ai-error-retry-btn').onclick = () => {
            if (this.currentStep === 2) {
                this._fetchCityOptions();
            } else if (this.currentStep === 3) {
                this._fetchDayPlan();
            }
        };
    },
};
