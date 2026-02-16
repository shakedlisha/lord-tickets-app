/* ================================================
   ADMIN FORM BUILDER - Edit trip itinerary
   ================================================ */

const AdminForm = {
    tripId: null,
    tripData: null,
    saveDebounced: null,
    hasUnsavedChanges: false,
    _beforeUnloadHandler: null,

    async load(tripId) {
        this.tripId = tripId;
        this.hasUnsavedChanges = false;
        this.saveDebounced = debounce(() => this.save(), 2000);

        if (this._beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this._beforeUnloadHandler);
        }
        this._beforeUnloadHandler = (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', this._beforeUnloadHandler);

        try {
            this.tripData = await fetchTrip(tripId);
            if (!this.tripData) {
                showToast('המסלול לא נמצא', 'error');
                Router.navigate('#/admin');
                return;
            }
            document.getElementById('editor-trip-name').textContent = this.tripData.name || 'עריכת מסלול';
            this.render();
            this.bindEvents();
        } catch (e) {
            console.error('Failed to load trip:', e);
            showToast('שגיאה בטעינה', 'error');
        }
    },

    render() {
        const container = document.getElementById('editor-content');
        container.innerHTML = `
            ${this.renderTripInfo()}
            ${this.renderDaysList()}
            <button class="btn btn-primary" id="btn-add-day" style="width:100%;justify-content:center;margin-top:16px;">
                <span class="material-icons-round">add</span>
                הוסף יום
            </button>
        `;
    },

    renderTripInfo() {
        const t = this.tripData;
        return `
            <div class="editor-section">
                <div class="editor-section-header">
                    <h3><span class="material-icons-round">info</span> פרטי המסלול</h3>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>שם המסלול</label>
                        <input type="text" id="trip-name" value="${escapeHtml(t.name)}" data-field="name">
                    </div>
                    <div class="form-group">
                        <label>שמות הלקוחות</label>
                        <input type="text" id="trip-customers" value="${escapeHtml(t.customers)}" data-field="customers">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>תאריך התחלה</label>
                        <input type="date" id="trip-start" value="${escapeHtml(t.start_date)}" data-field="start_date" dir="ltr">
                    </div>
                    <div class="form-group">
                        <label>תאריך סיום</label>
                        <input type="date" id="trip-end" value="${escapeHtml(t.end_date)}" data-field="end_date" dir="ltr">
                    </div>
                </div>
            </div>
        `;
    },

    renderDaysList() {
        const days = this.tripData.days || [];
        if (days.length === 0) {
            return '<div class="empty-state" style="min-height:20vh;"><span class="empty-icon">📅</span><h2>אין ימים עדיין</h2><p>לחצו "הוסף יום" כדי להתחיל לבנות את המסלול</p></div>';
        }

        return days.map((day, index) => this.renderDayCard(day, index)).join('');
    },

    renderDayCard(day, index) {
        const itemsHtml = (day.items || []).map((item, itemIdx) => this.renderItemEditor(item, index, itemIdx)).join('');
        const tipsHtml = (day.tips || []).map((tip, tipIdx) =>
            `<div class="form-group" style="display:flex;gap:8px;align-items:center;">
                <input type="text" value="${escapeHtml(tip)}" data-day="${index}" data-tip="${tipIdx}" class="tip-input">
                <button class="btn btn-danger btn-sm" data-action="remove-tip" data-day="${index}" data-tip="${tipIdx}">
                    <span class="material-icons-round">close</span>
                </button>
            </div>`
        ).join('');

        return `
            <div class="day-editor-card" data-day-index="${index}">
                <div class="day-editor-header" data-toggle-day="${index}">
                    <div class="day-editor-header-right">
                        <div class="day-editor-number">${index + 1}</div>
                        <div>
                            <strong>${escapeHtml(day.title) || `יום ${index + 1}`}</strong>
                            <span style="color:var(--text-muted);font-size:13px;margin-right:8px;">${escapeHtml(day.date)} • ${escapeHtml(day.city)}</span>
                        </div>
                    </div>
                    <div class="day-editor-header-left">
                        <button class="btn btn-ai-suggest btn-sm" data-action="ai-suggest" data-day="${index}" title="${escapeHtml(AI_CONFIG.ui.suggestButton)}">
                            <span class="material-icons-round">auto_awesome</span>
                        </button>
                        ${day._snapshotBeforeMerge ? `
                        <button class="btn btn-ghost btn-sm btn-undo-merge" data-action="undo-merge" data-day="${index}" title="בטל שינויי AI">
                            <span class="material-icons-round">undo</span>
                        </button>
                        ` : ''}
                        <button class="btn btn-ghost btn-sm" data-action="move-day-up" data-day="${index}" title="הזז למעלה">
                            <span class="material-icons-round">arrow_upward</span>
                        </button>
                        <button class="btn btn-ghost btn-sm" data-action="move-day-down" data-day="${index}" title="הזז למטה">
                            <span class="material-icons-round">arrow_downward</span>
                        </button>
                        <button class="btn btn-danger btn-sm" data-action="delete-day" data-day="${index}" title="מחק יום">
                            <span class="material-icons-round">delete</span>
                        </button>
                        <span class="material-icons-round">expand_more</span>
                    </div>
                </div>
                <div class="day-editor-body" id="day-body-${index}">
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>תאריך</label>
                            <input type="date" value="${escapeHtml(day.date)}" data-day="${index}" data-field="date" dir="ltr">
                        </div>
                        <div class="form-group">
                            <label>כותרת היום</label>
                            <input type="text" value="${escapeHtml(day.title)}" data-day="${index}" data-field="title">
                        </div>
                        <div class="form-group">
                            <label>יום בשבוע</label>
                            <input type="text" value="${escapeHtml(day.dayOfWeek)}" data-day="${index}" data-field="dayOfWeek">
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>עיר (עברית)</label>
                            <input type="text" value="${escapeHtml(day.city)}" data-day="${index}" data-field="city">
                        </div>
                        <div class="form-group">
                            <label>עיר (English)</label>
                            <input type="text" value="${escapeHtml(day.cityEn)}" data-day="${index}" data-field="cityEn" dir="ltr">
                        </div>
                        <div class="form-group">
                            <label>צבע</label>
                            <input type="color" value="${escapeHtml(day.color) || '#5C6BC0'}" data-day="${index}" data-field="color">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>מלון</label>
                            <input type="text" value="${escapeHtml(day.hotel?.name)}" data-day="${index}" data-field="hotel.name">
                        </div>
                        <div class="form-group">
                            <label>מלון - Google Maps Query</label>
                            <input type="text" value="${escapeHtml(day.hotel?.mapsQuery)}" data-day="${index}" data-field="hotel.mapsQuery" dir="ltr">
                        </div>
                    </div>

                    <h4 style="margin:16px 0 8px;">פעילויות בציר הזמן</h4>
                    <div id="items-container-${index}">
                        ${itemsHtml}
                    </div>

                    <div class="add-item-bar">
                        <button class="btn btn-primary btn-sm" data-action="add-item" data-day="${index}" data-type="activity">
                            <span class="material-icons-round">add_location</span> פעילות
                        </button>
                        <button class="btn btn-sm" data-action="add-item" data-day="${index}" data-type="transport" style="background:var(--transport-bg);color:#1565C0;border:1px solid var(--transport-border);">
                            <span class="material-icons-round">directions_transit</span> תחבורה
                        </button>
                        <button class="btn btn-sm" data-action="add-item" data-day="${index}" data-type="restaurant" style="background:var(--restaurant-bg);color:#E65100;border:1px solid var(--restaurant-border);">
                            <span class="material-icons-round">restaurant</span> מסעדה
                        </button>
                    </div>

                    <h4 style="margin:24px 0 8px;">טיפים</h4>
                    <div id="tips-container-${index}">
                        ${tipsHtml}
                    </div>
                    <button class="btn btn-ghost btn-sm" data-action="add-tip" data-day="${index}" style="margin-top:8px;">
                        <span class="material-icons-round">add</span> הוסף טיפ
                    </button>
                </div>
            </div>
        `;
    },

    renderItemEditor(item, dayIndex, itemIndex) {
        const typeLabel = { activity: 'פעילות', transport: 'תחבורה', restaurant: 'מסעדה' }[item.type] || 'פעילות';

        let extraFields = '';
        if (item.type === 'transport') {
            extraFields = `
                <div class="form-row-3">
                    <div class="form-group">
                        <label>קו/רכבת</label>
                        <input type="text" value="${escapeHtml(item.line)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="line" dir="ltr">
                    </div>
                    <div class="form-group">
                        <label>מ-</label>
                        <input type="text" value="${escapeHtml(item.from)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="from">
                    </div>
                    <div class="form-group">
                        <label>אל-</label>
                        <input type="text" value="${escapeHtml(item.to)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="to">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>משך נסיעה</label>
                        <input type="text" value="${escapeHtml(item.duration)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="duration">
                    </div>
                    <div class="form-group">
                        <label>הערה לתחבורה</label>
                        <input type="text" value="${escapeHtml(item.transportNote)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="transportNote">
                    </div>
                </div>
            `;
        }

        return `
            <div class="item-editor" data-type="${item.type}" data-day="${dayIndex}" data-item="${itemIndex}">
                <div class="item-editor-header">
                    <span class="item-type-badge ${item.type}">${typeLabel}</span>
                    <div>
                        <button class="btn btn-ghost btn-sm" data-action="move-item-up" data-day="${dayIndex}" data-item="${itemIndex}">
                            <span class="material-icons-round">arrow_upward</span>
                        </button>
                        <button class="btn btn-ghost btn-sm" data-action="move-item-down" data-day="${dayIndex}" data-item="${itemIndex}">
                            <span class="material-icons-round">arrow_downward</span>
                        </button>
                        <button class="btn btn-danger btn-sm" data-action="delete-item" data-day="${dayIndex}" data-item="${itemIndex}">
                            <span class="material-icons-round">close</span>
                        </button>
                    </div>
                </div>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>אמוג'י</label>
                        <input type="text" value="${escapeHtml(item.emoji)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="emoji" style="text-align:center;font-size:20px;">
                    </div>
                    <div class="form-group">
                        <label>שעה</label>
                        <input type="text" value="${escapeHtml(item.time)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="time" dir="ltr" placeholder="10:00">
                    </div>
                    <div class="form-group">
                        <label style="display:flex;align-items:center;gap:4px;">
                            הזמנה מראש
                            <input type="checkbox" ${item.bookInAdvance ? 'checked' : ''} data-day="${dayIndex}" data-item="${itemIndex}" data-field="bookInAdvance" style="width:auto;">
                        </label>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>שם (עברית)</label>
                        <input type="text" value="${escapeHtml(item.title)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="title">
                    </div>
                    <div class="form-group">
                        <label>שם (English)</label>
                        <input type="text" value="${escapeHtml(item.titleEn)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="titleEn" dir="ltr">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Google Maps Query</label>
                        <input type="text" value="${escapeHtml(item.mapsQuery)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="mapsQuery" dir="ltr" placeholder="Location+Name+City+Japan">
                    </div>
                    <div class="form-group">
                        <label>עלות (ין)</label>
                        <input type="number" value="${escapeHtml(item.fee?.amount)}" data-day="${dayIndex}" data-item="${itemIndex}" data-field="fee.amount" dir="ltr">
                    </div>
                </div>
                ${extraFields}
                <div class="form-group">
                    <label>תיאור</label>
                    <textarea data-day="${dayIndex}" data-item="${itemIndex}" data-field="description" rows="2">${escapeHtml(item.description)}</textarea>
                </div>
            </div>
        `;
    },

    bindEvents() {
        const container = document.getElementById('editor-content');

        container.addEventListener('input', (e) => {
            this.handleFieldChange(e.target);
            this.hasUnsavedChanges = true;
            this.saveDebounced();
        });

        container.addEventListener('change', (e) => {
            this.handleFieldChange(e.target);
            this.hasUnsavedChanges = true;
            this.saveDebounced();
        });

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) {
                const toggle = e.target.closest('[data-toggle-day]');
                if (toggle) {
                    const dayIdx = toggle.dataset.toggleDay;
                    const body = document.getElementById(`day-body-${dayIdx}`);
                    if (body) body.classList.toggle('open');
                }
                return;
            }

            const action = btn.dataset.action;
            const dayIdx = parseInt(btn.dataset.day);
            const itemIdx = parseInt(btn.dataset.item);
            const tipIdx = parseInt(btn.dataset.tip);

            switch (action) {
                case 'ai-suggest':
                    e.stopPropagation();
                    this.openAiPanel(dayIdx);
                    break;
                case 'undo-merge':
                    e.stopPropagation();
                    if (confirm('לשחזר את היום למצב שלפני שינויי ה-AI?')) {
                        this.undoLastMerge(dayIdx);
                    }
                    break;
                case 'add-item':
                    this.addItem(dayIdx, btn.dataset.type);
                    break;
                case 'delete-item':
                    this.deleteItem(dayIdx, itemIdx);
                    break;
                case 'move-item-up':
                    this.moveItem(dayIdx, itemIdx, -1);
                    break;
                case 'move-item-down':
                    this.moveItem(dayIdx, itemIdx, 1);
                    break;
                case 'add-tip':
                    this.addTip(dayIdx);
                    break;
                case 'remove-tip':
                    this.removeTip(dayIdx, tipIdx);
                    break;
                case 'move-day-up':
                    this.moveDay(dayIdx, -1);
                    break;
                case 'move-day-down':
                    this.moveDay(dayIdx, 1);
                    break;
                case 'delete-day':
                    this.deleteDay(dayIdx);
                    break;
            }
        });

        document.getElementById('btn-add-day').onclick = () => this.addDay();

        document.getElementById('btn-back-dashboard').onclick = () => {
            if (this.hasUnsavedChanges && !confirm('יש שינויים שלא נשמרו. לצאת בכל זאת?')) return;
            this.hasUnsavedChanges = false;
            if (this._beforeUnloadHandler) {
                window.removeEventListener('beforeunload', this._beforeUnloadHandler);
            }
            Router.navigate('#/admin');
        };

        document.getElementById('btn-preview').onclick = () => {
            window.open(`#/trip/${this.tripId}`, '_blank');
        };

        document.querySelectorAll('[data-field="name"], [data-field="customers"], [data-field="start_date"], [data-field="end_date"]').forEach(input => {
            input.addEventListener('input', () => this.handleTripInfoChange());
        });
    },

    handleFieldChange(el) {
        if (!el.dataset) return;

        const dayIdx = parseInt(el.dataset.day);
        const itemIdx = parseInt(el.dataset.item);
        const tipIdx = parseInt(el.dataset.tip);
        const field = el.dataset.field;

        if (!isNaN(tipIdx) && el.classList.contains('tip-input')) {
            this.tripData.days[dayIdx].tips[tipIdx] = el.value;
            return;
        }

        if (!isNaN(itemIdx) && field) {
            const item = this.tripData.days[dayIdx].items[itemIdx];
            if (field === 'bookInAdvance') {
                item.bookInAdvance = el.checked;
            } else if (field === 'fee.amount') {
                if (!item.fee) item.fee = { amount: 0, currency: 'yen', perPerson: true };
                item.fee.amount = parseInt(el.value) || 0;
            } else if (field.startsWith('hotel.')) {
                return;
            } else {
                item[field] = el.value;
            }
            return;
        }

        if (!isNaN(dayIdx) && field) {
            if (field.startsWith('hotel.')) {
                const hotelField = field.split('.')[1];
                if (!this.tripData.days[dayIdx].hotel) {
                    this.tripData.days[dayIdx].hotel = { name: '', mapsQuery: '' };
                }
                this.tripData.days[dayIdx].hotel[hotelField] = el.value;
            } else {
                this.tripData.days[dayIdx][field] = el.value;
            }
            return;
        }

        if (field === 'name' || field === 'customers' || field === 'start_date' || field === 'end_date') {
            this.tripData[field] = el.value;
        }
    },

    handleTripInfoChange() {
        const name = document.getElementById('trip-name')?.value;
        if (name) {
            document.getElementById('editor-trip-name').textContent = name;
        }
    },

    addDay() {
        if (!this.tripData.days) this.tripData.days = [];

        const dayNumber = this.tripData.days.length + 1;
        let dateStr = '';

        if (this.tripData.start_date) {
            const start = new Date(this.tripData.start_date);
            start.setDate(start.getDate() + dayNumber - 1);
            dateStr = start.toISOString().split('T')[0];
        }

        this.tripData.days.push({
            id: generateId(),
            date: dateStr,
            dayOfWeek: dateStr ? getHebrewDay(dateStr) : '',
            title: `יום ${dayNumber}`,
            city: '',
            cityEn: '',
            color: '#5C6BC0',
            hotel: { name: '', mapsQuery: '' },
            items: [],
            tips: [],
            appendix: []
        });

        this.render();
        this.bindEvents();
        this.saveDebounced();
    },

    deleteDay(dayIdx) {
        if (!confirm('בטוחים שרוצים למחוק את היום הזה?')) return;
        this.tripData.days.splice(dayIdx, 1);
        this.render();
        this.bindEvents();
        this.saveDebounced();
    },

    moveDay(dayIdx, direction) {
        const newIdx = dayIdx + direction;
        if (newIdx < 0 || newIdx >= this.tripData.days.length) return;

        const temp = this.tripData.days[dayIdx];
        this.tripData.days[dayIdx] = this.tripData.days[newIdx];
        this.tripData.days[newIdx] = temp;

        this.render();
        this.bindEvents();
        this.saveDebounced();
    },

    addItem(dayIdx, type) {
        if (!this.tripData.days[dayIdx].items) {
            this.tripData.days[dayIdx].items = [];
        }

        const newItem = {
            id: generateId(),
            type: type || 'activity',
            time: '',
            emoji: type === 'transport' ? '🚆' : type === 'restaurant' ? '🍽' : '📍',
            title: '',
            titleEn: '',
            mapsQuery: '',
            description: '',
            fee: null,
            bookInAdvance: false,
            line: null,
            from: null,
            to: null,
            duration: null,
            transportNote: null
        };

        this.tripData.days[dayIdx].items.push(newItem);
        this.render();
        this.bindEvents();

        const body = document.getElementById(`day-body-${dayIdx}`);
        if (body) body.classList.add('open');
        this.saveDebounced();
    },

    deleteItem(dayIdx, itemIdx) {
        this.tripData.days[dayIdx].items.splice(itemIdx, 1);
        this.render();
        this.bindEvents();
        const body = document.getElementById(`day-body-${dayIdx}`);
        if (body) body.classList.add('open');
        this.saveDebounced();
    },

    moveItem(dayIdx, itemIdx, direction) {
        const items = this.tripData.days[dayIdx].items;
        const newIdx = itemIdx + direction;
        if (newIdx < 0 || newIdx >= items.length) return;

        const temp = items[itemIdx];
        items[itemIdx] = items[newIdx];
        items[newIdx] = temp;

        this.render();
        this.bindEvents();
        const body = document.getElementById(`day-body-${dayIdx}`);
        if (body) body.classList.add('open');
        this.saveDebounced();
    },

    addTip(dayIdx) {
        if (!this.tripData.days[dayIdx].tips) {
            this.tripData.days[dayIdx].tips = [];
        }
        this.tripData.days[dayIdx].tips.push('');
        this.render();
        this.bindEvents();
        const body = document.getElementById(`day-body-${dayIdx}`);
        if (body) body.classList.add('open');
        this.saveDebounced();
    },

    removeTip(dayIdx, tipIdx) {
        this.tripData.days[dayIdx].tips.splice(tipIdx, 1);
        this.render();
        this.bindEvents();
        const body = document.getElementById(`day-body-${dayIdx}`);
        if (body) body.classList.add('open');
        this.saveDebounced();
    },

    openAiPanel(dayIdx) {
        const day = this.tripData.days[dayIdx];
        if (!day) return;
        if (typeof AiPanel !== 'undefined') {
            AiPanel.open(this.tripId, dayIdx, day, this.tripData);
        } else {
            showToast('מודול AI לא זמין', 'error');
        }
    },

    async mergeAiItems(dayIndex, newItems, newTips, strategy) {
        const day = this.tripData.days[dayIndex];
        if (!day) throw new Error('Day not found');

        const mergeStrategy = strategy || AI_CONFIG.merge.defaultBehavior || 'append';

        if (AI_CONFIG.merge.snapshotBeforeInsert) {
            day._snapshotBeforeMerge = JSON.parse(JSON.stringify({
                items: day.items || [],
                tips: day.tips || [],
            }));
        }

        if (!day.items) day.items = [];
        if (!day.tips) day.tips = [];

        const mappedItems = (newItems || []).map(item => ({
            id: item.id || generateId(),
            type: item.type || 'activity',
            time: item.time || '',
            emoji: item.emoji || '📍',
            title: item.title || '',
            titleEn: item.titleEn || '',
            mapsQuery: item.mapsQuery || '',
            description: item.description || '',
            fee: item.fee || null,
            bookInAdvance: item.bookInAdvance || false,
            line: item.line || null,
            from: item.from || null,
            to: item.to || null,
            duration: item.duration || null,
            transportNote: item.transportNote || null,
            why_visit: item.why_visit || '',
            best_time: item.best_time || '',
            estimated_duration: item.estimated_duration || '',
            booking_url: item.booking_url || null,
            route_note: item.route_note || '',
            _aiGenerated: true,
        }));

        if (mergeStrategy === 'replace') {
            day.items = mappedItems;
            day.tips = (newTips || []).filter(t => t && t.trim());
        } else {
            day.items = day.items.concat(mappedItems);
            const existingTips = new Set(day.tips.map(t => t.trim()));
            (newTips || []).forEach(tip => {
                if (tip && !existingTips.has(tip.trim())) {
                    day.tips.push(tip);
                }
            });
        }

        this.render();
        this.bindEvents();

        const body = document.getElementById(`day-body-${dayIndex}`);
        if (body) body.classList.add('open');

        this.hasUnsavedChanges = true;
        await this.save();
    },

    undoLastMerge(dayIndex) {
        const day = this.tripData.days[dayIndex];
        if (!day || !day._snapshotBeforeMerge) {
            showToast('אין גיבוי לשחזור', 'error');
            return;
        }

        day.items = day._snapshotBeforeMerge.items;
        day.tips = day._snapshotBeforeMerge.tips;
        delete day._snapshotBeforeMerge;

        this.render();
        this.bindEvents();

        const body = document.getElementById(`day-body-${dayIndex}`);
        if (body) body.classList.add('open');

        this.hasUnsavedChanges = true;
        this.saveDebounced();
        showToast('השינויים שוחזרו ✓');
    },

    async save() {
        const statusEl = document.getElementById('save-status');
        if (statusEl) {
            statusEl.textContent = 'שומר...';
            statusEl.className = 'save-status saving';
        }

        try {
            await updateTrip(this.tripId, {
                name: this.tripData.name,
                customers: this.tripData.customers,
                start_date: this.tripData.start_date || null,
                end_date: this.tripData.end_date || null,
                days: this.tripData.days || []
            });

            this.hasUnsavedChanges = false;
            if (statusEl) {
                statusEl.textContent = 'נשמר ✓';
                statusEl.className = 'save-status';
            }
        } catch (e) {
            console.error('Save failed:', e);
            if (statusEl) {
                statusEl.textContent = 'שגיאה בשמירה!';
                statusEl.className = 'save-status error';
            }
        }
    }
};
