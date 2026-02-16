/* ================================================
   ADMIN ATTRACTIONS - Manage attraction candidates
   ================================================
   View/approve/reject attractions discovered by AI
   or added manually. Approved attractions become
   "must-do" items for AI day generation.
   ================================================ */

const AdminAttractions = {
    attractions: [],
    currentFilter: 'all',
    cityFilter: '',

    async load() {
        const container = document.getElementById('attractions-content');
        if (container) {
            container.innerHTML = `
                <div class="dashboard-loading">
                    <div class="loading-spinner"></div>
                    <p>טוען אטרקציות...</p>
                </div>
            `;
        }

        const backBtn = document.getElementById('btn-back-from-attractions');
        if (backBtn) {
            backBtn.onclick = () => Router.navigate('#/admin');
        }

        try {
            this.attractions = await fetchAttractions();
            this.render();
        } catch (e) {
            console.error('Failed to load attractions:', e);
            if (container) container.innerHTML = '';
            showToast('שגיאה בטעינת אטרקציות', 'error');
        }
    },

    render() {
        const container = document.getElementById('attractions-content');
        if (!container) return;

        const filtered = this._getFilteredAttractions();
        const cities = this._getUniqueCities();

        const statusCounts = {
            all: this.attractions.length,
            pending: this.attractions.filter(a => a.status === 'pending').length,
            approved: this.attractions.filter(a => a.status === 'approved').length,
            rejected: this.attractions.filter(a => a.status === 'rejected').length,
        };

        container.innerHTML = `
            <div class="attractions-toolbar">
                <div class="attractions-filters">
                    <button class="btn attractions-filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                        הכל <span class="filter-count">${statusCounts.all}</span>
                    </button>
                    <button class="btn attractions-filter-btn ${this.currentFilter === 'pending' ? 'active' : ''}" data-filter="pending">
                        ⏳ ממתין <span class="filter-count">${statusCounts.pending}</span>
                    </button>
                    <button class="btn attractions-filter-btn ${this.currentFilter === 'approved' ? 'active' : ''}" data-filter="approved">
                        ✅ מאושר <span class="filter-count">${statusCounts.approved}</span>
                    </button>
                    <button class="btn attractions-filter-btn ${this.currentFilter === 'rejected' ? 'active' : ''}" data-filter="rejected">
                        ❌ נדחה <span class="filter-count">${statusCounts.rejected}</span>
                    </button>
                </div>
                <div class="attractions-toolbar-right">
                    ${cities.length > 1 ? `
                        <select id="attractions-city-filter" class="attractions-city-select">
                            <option value="">כל הערים</option>
                            ${cities.map(c => `<option value="${escapeHtml(c)}" ${this.cityFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                        </select>
                    ` : ''}
                    <button class="btn btn-primary btn-sm" id="btn-add-attraction">
                        <span class="material-icons-round">add_location</span>
                        הוסף אטרקציה
                    </button>
                </div>
            </div>

            ${filtered.length === 0 ? `
                <div class="empty-state" style="min-height:30vh;">
                    <span class="empty-icon">🗺️</span>
                    <h2>אין אטרקציות ${this.currentFilter !== 'all' ? 'בסטטוס הזה' : 'עדיין'}</h2>
                    <p>אטרקציות יתווספו אוטומטית כשתשתמשו ב-AI ליצירת ימים, או הוסיפו ידנית</p>
                </div>
            ` : `
                <div class="attractions-grid">
                    ${filtered.map(a => this._renderAttractionCard(a)).join('')}
                </div>
            `}
        `;

        this._bindEvents();
    },

    _renderAttractionCard(attraction) {
        const a = attraction;
        const statusLabels = {
            pending: `<span class="attraction-status pending">⏳ ${escapeHtml(AI_CONFIG.ui.pendingLabel)}</span>`,
            approved: '<span class="attraction-status approved">✅ מאושר</span>',
            rejected: '<span class="attraction-status rejected">❌ נדחה</span>',
        };

        const sourceLabels = {
            manual: '✍️ ידני',
            ai_generated: '🤖 AI',
            reddit_blog: '📰 רדיט/בלוג',
            api: '🔌 API',
        };

        return `
            <div class="attraction-card" data-id="${escapeHtml(a.id)}" data-status="${escapeHtml(a.status)}">
                <div class="attraction-card-header">
                    <div class="attraction-card-emoji">${escapeHtml(a.emoji || '📍')}</div>
                    <div class="attraction-card-info">
                        <div class="attraction-card-name">${escapeHtml(a.name)}</div>
                        ${a.name_en ? `<div class="attraction-card-name-en">${escapeHtml(a.name_en)}</div>` : ''}
                    </div>
                    ${statusLabels[a.status] || ''}
                </div>

                <div class="attraction-card-meta">
                    <span class="attraction-meta-item">📍 ${escapeHtml(a.city || '')}${a.city_en ? ` (${escapeHtml(a.city_en)})` : ''}</span>
                    ${a.category ? `<span class="attraction-meta-item">🏷️ ${escapeHtml(a.category)}</span>` : ''}
                    ${a.source_type ? `<span class="attraction-meta-item">${sourceLabels[a.source_type] || escapeHtml(a.source_type)}</span>` : ''}
                </div>

                ${a.why_visit ? `<div class="attraction-card-desc">${escapeHtml(a.why_visit)}</div>` : ''}
                ${a.description ? `<div class="attraction-card-desc">${escapeHtml(a.description)}</div>` : ''}

                <div class="attraction-card-details">
                    ${a.estimated_duration ? `<span class="attraction-detail">⏱ ${escapeHtml(a.estimated_duration)}</span>` : ''}
                    ${a.estimated_cost ? `<span class="attraction-detail">💰 ${a.cost_currency === 'yen' ? '¥' : '₪'}${escapeHtml(String(a.estimated_cost))}</span>` : ''}
                    ${a.booking_required ? '<span class="attraction-detail booking">🎫 הזמנה מראש</span>' : ''}
                    ${a.best_time ? `<span class="attraction-detail">🕐 ${escapeHtml(a.best_time)}</span>` : ''}
                </div>

                <div class="attraction-card-actions">
                    ${a.status === 'pending' ? `
                        <button class="btn btn-approve btn-sm" data-action="approve" data-id="${escapeHtml(a.id)}">
                            <span class="material-icons-round">check_circle</span>
                            ${escapeHtml(AI_CONFIG.ui.approveLabel)}
                        </button>
                        <button class="btn btn-reject btn-sm" data-action="reject" data-id="${escapeHtml(a.id)}">
                            <span class="material-icons-round">cancel</span>
                            ${escapeHtml(AI_CONFIG.ui.rejectLabel)}
                        </button>
                    ` : ''}
                    ${a.status === 'approved' ? `
                        <button class="btn btn-reject btn-sm" data-action="reject" data-id="${escapeHtml(a.id)}">
                            <span class="material-icons-round">cancel</span>
                            הסר אישור
                        </button>
                    ` : ''}
                    ${a.status === 'rejected' ? `
                        <button class="btn btn-approve btn-sm" data-action="approve" data-id="${escapeHtml(a.id)}">
                            <span class="material-icons-round">check_circle</span>
                            אשר מחדש
                        </button>
                    ` : ''}
                    ${a.source_url ? `
                        <a href="${escapeHtml(a.source_url)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">
                            <span class="material-icons-round">open_in_new</span>
                            מקור
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    },

    _getFilteredAttractions() {
        let list = this.attractions;
        if (this.currentFilter !== 'all') {
            list = list.filter(a => a.status === this.currentFilter);
        }
        if (this.cityFilter) {
            list = list.filter(a => a.city_en === this.cityFilter || a.city === this.cityFilter);
        }
        return list;
    },

    _getUniqueCities() {
        const cities = new Set();
        this.attractions.forEach(a => {
            if (a.city_en) cities.add(a.city_en);
            else if (a.city) cities.add(a.city);
        });
        return Array.from(cities).sort();
    },

    _bindEvents() {
        document.querySelectorAll('.attractions-filter-btn').forEach(btn => {
            btn.onclick = () => {
                this.currentFilter = btn.dataset.filter;
                this.render();
            };
        });

        const citySelect = document.getElementById('attractions-city-filter');
        if (citySelect) {
            citySelect.onchange = () => {
                this.cityFilter = citySelect.value;
                this.render();
            };
        }

        const addBtn = document.getElementById('btn-add-attraction');
        if (addBtn) {
            addBtn.onclick = () => this._showAddModal();
        }

        document.querySelectorAll('.attraction-card-actions button[data-action]').forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'approve') this._updateStatus(id, 'approved');
                if (action === 'reject') this._updateStatus(id, 'rejected');
            };
        });
    },

    async _updateStatus(attractionId, newStatus) {
        try {
            await updateAttractionStatus(attractionId, newStatus);
            const idx = this.attractions.findIndex(a => a.id === attractionId);
            if (idx !== -1) {
                this.attractions[idx].status = newStatus;
            }
            this.render();
            const label = newStatus === 'approved' ? 'אושר' : 'נדחה';
            showToast(`האטרקציה ${label} ✓`);
        } catch (e) {
            console.error('Failed to update status:', e);
            showToast('שגיאה בעדכון סטטוס', 'error');
        }
    },

    _showAddModal() {
        const modal = document.getElementById('ai-panel-modal');
        modal.classList.remove('hidden');
        modal.innerHTML = `
            <div class="ai-modal-container">
                <div class="ai-modal-header">
                    <div class="ai-modal-header-right">
                        <h3>📍 הוספת אטרקציה ידנית</h3>
                    </div>
                    <button class="btn-close-ai" id="add-attraction-close">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="ai-modal-body">
                    <div class="ai-prefs-form">
                        <div class="ai-prefs-row">
                            <div class="ai-prefs-section">
                                <label>שם (עברית) *</label>
                                <input type="text" class="ai-prefs-input" id="add-attr-name" placeholder="מקדש סנסו-ג'י">
                            </div>
                            <div class="ai-prefs-section">
                                <label>שם (English)</label>
                                <input type="text" class="ai-prefs-input" id="add-attr-name-en" placeholder="Senso-ji Temple" dir="ltr">
                            </div>
                        </div>
                        <div class="ai-prefs-row">
                            <div class="ai-prefs-section">
                                <label>עיר (עברית) *</label>
                                <input type="text" class="ai-prefs-input" id="add-attr-city" placeholder="טוקיו">
                            </div>
                            <div class="ai-prefs-section">
                                <label>עיר (English)</label>
                                <input type="text" class="ai-prefs-input" id="add-attr-city-en" placeholder="Tokyo" dir="ltr">
                            </div>
                        </div>
                        <div class="ai-prefs-row">
                            <div class="ai-prefs-section">
                                <label>קטגוריה</label>
                                <select class="ai-prefs-input" id="add-attr-category">
                                    <option value="activity">פעילות</option>
                                    <option value="temple">מקדש</option>
                                    <option value="museum">מוזיאון</option>
                                    <option value="park">פארק/גן</option>
                                    <option value="market">שוק</option>
                                    <option value="restaurant">מסעדה</option>
                                    <option value="shopping">קניות</option>
                                    <option value="viewpoint">תצפית</option>
                                    <option value="experience">חוויה</option>
                                    <option value="other">אחר</option>
                                </select>
                            </div>
                            <div class="ai-prefs-section">
                                <label>אמוג'י</label>
                                <input type="text" class="ai-prefs-input" id="add-attr-emoji" value="📍" style="text-align:center;font-size:20px;">
                            </div>
                        </div>
                        <div class="ai-prefs-section">
                            <label>למה לבקר</label>
                            <textarea class="ai-prefs-input" id="add-attr-why" rows="2" placeholder="תיאור קצר למה כדאי לבקר כאן"></textarea>
                        </div>
                        <div class="ai-prefs-row">
                            <div class="ai-prefs-section">
                                <label>משך ביקור משוער</label>
                                <input type="text" class="ai-prefs-input" id="add-attr-duration" placeholder="שעה וחצי">
                            </div>
                            <div class="ai-prefs-section">
                                <label>עלות משוערת (ין)</label>
                                <input type="number" class="ai-prefs-input" id="add-attr-cost" placeholder="0" dir="ltr">
                            </div>
                        </div>
                        <div class="ai-prefs-row">
                            <div class="ai-prefs-section">
                                <label>זמן מומלץ לביקור</label>
                                <input type="text" class="ai-prefs-input" id="add-attr-best-time" placeholder="בוקר מוקדם">
                            </div>
                            <div class="ai-prefs-section">
                                <label>קישור להזמנה</label>
                                <input type="url" class="ai-prefs-input" id="add-attr-booking-url" placeholder="https://..." dir="ltr">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ai-modal-footer">
                    <button class="btn btn-ghost" id="add-attraction-cancel">ביטול</button>
                    <button class="btn btn-primary" id="add-attraction-save">
                        <span class="material-icons-round">add_location</span>
                        הוסף אטרקציה
                    </button>
                </div>
            </div>
        `;

        document.getElementById('add-attraction-close').onclick = () => modal.classList.add('hidden');
        document.getElementById('add-attraction-cancel').onclick = () => modal.classList.add('hidden');
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

        document.getElementById('add-attraction-save').onclick = async () => {
            const name = document.getElementById('add-attr-name').value.trim();
            const city = document.getElementById('add-attr-city').value.trim();

            if (!name || !city) {
                showToast('שם ועיר הם שדות חובה', 'error');
                return;
            }

            const saveBtn = document.getElementById('add-attraction-save');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="material-icons-round">hourglass_top</span> שומר...';

            try {
                const newAttraction = await createAttraction({
                    name,
                    name_en: document.getElementById('add-attr-name-en').value.trim() || null,
                    city,
                    city_en: document.getElementById('add-attr-city-en').value.trim() || null,
                    category: document.getElementById('add-attr-category').value,
                    emoji: document.getElementById('add-attr-emoji').value.trim() || '📍',
                    why_visit: document.getElementById('add-attr-why').value.trim() || null,
                    estimated_duration: document.getElementById('add-attr-duration').value.trim() || null,
                    estimated_cost: parseInt(document.getElementById('add-attr-cost').value) || null,
                    cost_currency: 'yen',
                    best_time: document.getElementById('add-attr-best-time').value.trim() || null,
                    booking_url: document.getElementById('add-attr-booking-url').value.trim() || null,
                    source_type: 'manual',
                    status: 'approved',
                });

                this.attractions.unshift(newAttraction);
                modal.classList.add('hidden');
                this.render();
                showToast('האטרקציה נוספה! ✓');
            } catch (e) {
                console.error('Failed to create attraction:', e);
                showToast('שגיאה בהוספת אטרקציה', 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span class="material-icons-round">add_location</span> הוסף אטרקציה';
            }
        };
    },
};
