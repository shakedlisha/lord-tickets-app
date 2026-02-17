/* ================================================
   DESTINATION PLANNER
   ================================================
   Manages the trip destination breakdown:
   - Define destinations in order with nights count
   - Auto-generate day skeleton with dates and cities
   - Handle travel days between destinations
   ================================================ */

const DestinationPlanner = {

    /* ---- City presets for quick selection ---- */
    cityPresets: [
        { he: 'טוקיו', en: 'Tokyo', color: '#2196F3' },
        { he: 'קיוטו', en: 'Kyoto', color: '#9C27B0' },
        { he: 'אוסקה', en: 'Osaka', color: '#FF6B35' },
        { he: 'נארה', en: 'Nara', color: '#4CAF50' },
        { he: 'הירושימה', en: 'Hiroshima', color: '#FF5722' },
        { he: 'הקונה', en: 'Hakone', color: '#00897B' },
        { he: 'קאנאזאווה', en: 'Kanazawa', color: '#00897B' },
        { he: 'ניקו', en: 'Nikko', color: '#795548' },
        { he: 'פוג\'י', en: 'Fuji', color: '#0D47A1' },
        { he: 'קויאסן', en: 'Koyasan', color: '#795548' },
        { he: 'נאגויה', en: 'Nagoya', color: '#FFC107' },
        { he: 'ואזוקה', en: 'Wazuka', color: '#66BB6A' },
    ],

    /* ---- Render the destination planner UI ---- */
    render(tripData) {
        const destinations = tripData.destinations || [];
        const startDate = tripData.start_date || '';

        let totalNights = 0;
        destinations.forEach(d => { totalNights += (d.nights || 0) + (d.travelDay ? 1 : 0); });

        const endDateCalc = startDate ? this._addDays(startDate, totalNights) : '';

        return `
            <div class="editor-section destination-planner">
                <div class="editor-section-header">
                    <h3><span class="material-icons-round">map</span> יעדים ולילות</h3>
                    <span class="dest-total-nights">${totalNights} לילות${endDateCalc ? ` • עד ${formatDate(endDateCalc)}` : ''}</span>
                </div>

                <div class="dest-list" id="dest-list">
                    ${destinations.length === 0
                        ? '<div class="dest-empty">הוסיפו יעדים כדי לבנות את המסלול</div>'
                        : destinations.map((dest, idx) => this._renderDestRow(dest, idx, startDate, destinations)).join('')
                    }
                </div>

                <div class="dest-actions">
                    <button class="btn btn-primary" id="btn-add-dest">
                        <span class="material-icons-round">add_location</span>
                        הוסף יעד
                    </button>
                    ${destinations.length > 0 ? `
                        <button class="btn btn-success" id="btn-generate-days">
                            <span class="material-icons-round">auto_fix_high</span>
                            צור ימים אוטומטית
                        </button>
                    ` : ''}
                </div>

                ${destinations.length > 0 ? `
                    <div class="dest-presets">
                        <span class="dest-presets-label">יעדים מהירים:</span>
                        <div class="dest-preset-chips">
                            ${this.cityPresets.map(p => `
                                <button class="dest-preset-chip" data-action="add-preset" data-he="${escapeHtml(p.he)}" data-en="${escapeHtml(p.en)}" data-color="${p.color}">
                                    ${escapeHtml(p.he)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="dest-presets">
                        <span class="dest-presets-label">לחצו להוספה מהירה:</span>
                        <div class="dest-preset-chips">
                            ${this.cityPresets.map(p => `
                                <button class="dest-preset-chip" data-action="add-preset" data-he="${escapeHtml(p.he)}" data-en="${escapeHtml(p.en)}" data-color="${p.color}">
                                    ${escapeHtml(p.he)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `}
            </div>
        `;
    },

    _renderDestRow(dest, idx, startDate, allDests) {
        const nightsBefore = this._nightsBefore(allDests, idx);
        const arrivalDate = startDate ? this._addDays(startDate, nightsBefore) : '';
        const departureDate = startDate && dest.nights ? this._addDays(startDate, nightsBefore + dest.nights) : '';

        const dateRange = arrivalDate && departureDate
            ? `${formatDate(arrivalDate)} - ${formatDate(departureDate)}`
            : '';

        return `
            <div class="dest-row" data-dest-idx="${idx}">
                ${dest.travelDay ? `
                    <div class="dest-travel-day">
                        <span class="material-icons-round">directions_transit</span>
                        <span>יום נסיעה</span>
                    </div>
                ` : ''}
                <div class="dest-row-main">
                    <div class="dest-color-dot" style="background: ${dest.color || '#5C6BC0'}"></div>
                    <div class="dest-row-fields">
                        <input type="text" class="dest-input dest-city-he" value="${escapeHtml(dest.city || '')}" placeholder="עיר בעברית" data-dest="${idx}" data-dest-field="city">
                        <input type="text" class="dest-input dest-city-en" value="${escapeHtml(dest.cityEn || '')}" placeholder="City in English" dir="ltr" data-dest="${idx}" data-dest-field="cityEn">
                        <div class="dest-nights-control">
                            <button class="dest-nights-btn" data-action="dest-nights-minus" data-dest="${idx}">-</button>
                            <span class="dest-nights-value">${dest.nights || 0}</span>
                            <span class="dest-nights-label">לילות</span>
                            <button class="dest-nights-btn" data-action="dest-nights-plus" data-dest="${idx}">+</button>
                        </div>
                    </div>
                    <div class="dest-row-meta">
                        ${dateRange ? `<span class="dest-dates">${dateRange}</span>` : ''}
                    </div>
                    <div class="dest-row-actions">
                        <label class="dest-travel-toggle" title="הוסף יום נסיעה לפני יעד זה">
                            <input type="checkbox" ${dest.travelDay ? 'checked' : ''} data-action="toggle-travel-day" data-dest="${idx}">
                            <span class="material-icons-round" style="font-size:18px;">directions_transit</span>
                        </label>
                        <button class="btn btn-ghost btn-sm" data-action="move-dest-up" data-dest="${idx}" title="הזז למעלה">
                            <span class="material-icons-round">arrow_upward</span>
                        </button>
                        <button class="btn btn-ghost btn-sm" data-action="move-dest-down" data-dest="${idx}" title="הזז למטה">
                            <span class="material-icons-round">arrow_downward</span>
                        </button>
                        <button class="btn btn-danger btn-sm" data-action="delete-dest" data-dest="${idx}" title="מחק יעד">
                            <span class="material-icons-round">close</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /* ---- Bind events for the destination planner ---- */
    bindEvents(tripData, onChangeCallback) {
        const addBtn = document.getElementById('btn-add-dest');
        if (addBtn) {
            addBtn.onclick = () => {
                this.addDestination(tripData);
                onChangeCallback();
            };
        }

        const generateBtn = document.getElementById('btn-generate-days');
        if (generateBtn) {
            generateBtn.onclick = () => {
                const count = this.generateDays(tripData);
                if (count > 0) {
                    showToast(`נוצרו ${count} ימים בהצלחה!`, 'success');
                }
                onChangeCallback();
            };
        }

        // Preset chips
        document.querySelectorAll('[data-action="add-preset"]').forEach(chip => {
            chip.onclick = () => {
                this.addDestination(tripData, {
                    city: chip.dataset.he,
                    cityEn: chip.dataset.en,
                    color: chip.dataset.color,
                    nights: 2,
                });
                onChangeCallback();
            };
        });

        // Destination field changes
        document.querySelectorAll('[data-dest-field]').forEach(input => {
            input.addEventListener('input', () => {
                const idx = parseInt(input.dataset.dest);
                const field = input.dataset.destField;
                if (tripData.destinations && tripData.destinations[idx]) {
                    tripData.destinations[idx][field] = input.value;

                    // Auto-match preset color
                    if (field === 'cityEn') {
                        const preset = this.cityPresets.find(p => p.en.toLowerCase() === input.value.toLowerCase());
                        if (preset) {
                            tripData.destinations[idx].color = preset.color;
                        }
                    }
                }
            });
        });

        // Nights +/- buttons
        document.querySelectorAll('[data-action="dest-nights-plus"]').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.dest);
                if (tripData.destinations?.[idx]) {
                    tripData.destinations[idx].nights = (tripData.destinations[idx].nights || 0) + 1;
                    onChangeCallback();
                }
            };
        });

        document.querySelectorAll('[data-action="dest-nights-minus"]').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.dest);
                if (tripData.destinations?.[idx] && tripData.destinations[idx].nights > 0) {
                    tripData.destinations[idx].nights--;
                    onChangeCallback();
                }
            };
        });

        // Travel day toggle
        document.querySelectorAll('[data-action="toggle-travel-day"]').forEach(cb => {
            cb.onchange = () => {
                const idx = parseInt(cb.dataset.dest);
                if (tripData.destinations?.[idx]) {
                    tripData.destinations[idx].travelDay = cb.checked;
                    onChangeCallback();
                }
            };
        });

        // Move/delete
        document.querySelectorAll('[data-action="move-dest-up"]').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.dest);
                this.moveDestination(tripData, idx, -1);
                onChangeCallback();
            };
        });

        document.querySelectorAll('[data-action="move-dest-down"]').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.dest);
                this.moveDestination(tripData, idx, 1);
                onChangeCallback();
            };
        });

        document.querySelectorAll('[data-action="delete-dest"]').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.dest);
                if (confirm('למחוק את היעד?')) {
                    this.deleteDestination(tripData, idx);
                    onChangeCallback();
                }
            };
        });
    },

    /* ---- Data operations ---- */

    addDestination(tripData, preset = null) {
        if (!tripData.destinations) tripData.destinations = [];

        tripData.destinations.push({
            city: preset?.city || '',
            cityEn: preset?.cityEn || '',
            color: preset?.color || '#5C6BC0',
            nights: preset?.nights || 2,
            travelDay: false,
        });
    },

    deleteDestination(tripData, idx) {
        if (tripData.destinations) {
            tripData.destinations.splice(idx, 1);
        }
    },

    moveDestination(tripData, idx, direction) {
        const dests = tripData.destinations;
        if (!dests) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= dests.length) return;
        const temp = dests[idx];
        dests[idx] = dests[newIdx];
        dests[newIdx] = temp;
    },

    /* ---- Generate days from destinations ---- */

    generateDays(tripData) {
        const destinations = tripData.destinations || [];
        const startDate = tripData.start_date;

        if (destinations.length === 0) {
            showToast('הוסיפו לפחות יעד אחד', 'error');
            return 0;
        }

        if (!startDate) {
            showToast('הגדירו תאריך התחלה', 'error');
            return 0;
        }

        // Confirm if days already exist
        if (tripData.days && tripData.days.length > 0) {
            if (!confirm(`יש כבר ${tripData.days.length} ימים. ליצור מחדש? (הימים הקיימים יוחלפו)`)) {
                return 0;
            }
        }

        const newDays = [];
        let currentDate = new Date(startDate);
        let dayNumber = 1;

        destinations.forEach((dest, destIdx) => {
            // Travel day before this destination
            if (dest.travelDay && destIdx > 0) {
                const prevDest = destinations[destIdx - 1];
                const dateStr = currentDate.toISOString().split('T')[0];

                newDays.push({
                    id: generateId(),
                    date: dateStr,
                    dayOfWeek: getHebrewDay(dateStr),
                    title: `נסיעה מ${prevDest.city || prevDest.cityEn} ל${dest.city || dest.cityEn}`,
                    city: '',
                    cityEn: '',
                    color: '#9E9E9E',
                    hotel: { name: '', mapsQuery: '' },
                    items: [{
                        id: generateId(),
                        type: 'transport',
                        emoji: '🚅',
                        time: '',
                        title: `${prevDest.city || prevDest.cityEn} → ${dest.city || dest.cityEn}`,
                        titleEn: `${prevDest.cityEn || prevDest.city} to ${dest.cityEn || dest.city}`,
                        description: '',
                        mapsQuery: '',
                        line: '',
                        from: prevDest.cityEn || prevDest.city,
                        to: dest.cityEn || dest.city,
                        duration: '',
                    }],
                    tips: [],
                    appendix: [],
                    _destIndex: destIdx,
                    _isTravel: true,
                });

                currentDate.setDate(currentDate.getDate() + 1);
                dayNumber++;
            }

            // Days in this destination
            const nights = dest.nights || 1;
            for (let n = 0; n < nights; n++) {
                const dateStr = currentDate.toISOString().split('T')[0];

                newDays.push({
                    id: generateId(),
                    date: dateStr,
                    dayOfWeek: getHebrewDay(dateStr),
                    title: `${dest.city || dest.cityEn} - יום ${n + 1}`,
                    city: dest.city || '',
                    cityEn: dest.cityEn || '',
                    color: dest.color || '#5C6BC0',
                    hotel: { name: '', mapsQuery: '' },
                    items: [],
                    tips: [],
                    appendix: [],
                    _destIndex: destIdx,
                });

                currentDate.setDate(currentDate.getDate() + 1);
                dayNumber++;
            }
        });

        // Update end date
        if (newDays.length > 0) {
            const lastDate = newDays[newDays.length - 1].date;
            tripData.end_date = lastDate;
        }

        tripData.days = newDays;
        return newDays.length;
    },

    /* ---- Helpers ---- */

    _nightsBefore(destinations, idx) {
        let total = 0;
        for (let i = 0; i < idx; i++) {
            total += (destinations[i].nights || 0);
            if (destinations[i].travelDay && i > 0) total++;
        }
        if (destinations[idx]?.travelDay && idx > 0) total++;
        return total;
    },

    _addDays(dateStr, days) {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    },
};
