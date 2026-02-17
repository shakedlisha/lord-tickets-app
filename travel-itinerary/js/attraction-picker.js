/* ================================================
   ATTRACTION PICKER
   ================================================
   Per-day attraction selection from the database.
   Shows ranked attractions for the day's city,
   grouped by area/neighborhood.
   ================================================ */

const AttractionPicker = {

    _cache: {},

    /* ---- Category icons ---- */
    categoryIcons: {
        activity: '🏛️',
        temple: '⛩️',
        shrine: '⛩️',
        nature: '🌿',
        park: '🌳',
        museum: '🖼️',
        shopping: '🛍️',
        market: '🏪',
        restaurant: '🍜',
        cafe: '☕',
        food: '🍱',
        nightlife: '🌃',
        entertainment: '🎭',
        onsen: '♨️',
        viewpoint: '🗼',
        transport: '🚆',
        default: '📍',
    },

    /* ---- Render the picker for a specific day ---- */
    render(day, dayIndex, tripData) {
        const city = day.cityEn || day.city;
        if (!city) {
            return `
                <div class="attraction-picker">
                    <div class="attraction-picker-header">
                        <h4><span class="material-icons-round">place</span> בחירת אטרקציות</h4>
                    </div>
                    <p style="color:var(--text-muted);text-align:center;padding:var(--space-lg);">
                        הגדירו עיר ליום זה כדי לראות אטרקציות
                    </p>
                </div>
            `;
        }

        const attractions = this._cache[city.toLowerCase()] || [];
        const selectedIds = this._getSelectedIds(day);
        const usedInOtherDays = this._getUsedInOtherDays(tripData, dayIndex);
        const selectedCount = selectedIds.size;

        if (attractions.length === 0) {
            return `
                <div class="attraction-picker">
                    <div class="attraction-picker-header">
                        <h4><span class="material-icons-round">place</span> אטרקציות - ${escapeHtml(city)}</h4>
                        <button class="btn btn-primary btn-sm" data-action="load-attractions" data-day="${dayIndex}">
                            <span class="material-icons-round">refresh</span>
                            טען אטרקציות
                        </button>
                    </div>
                    <p style="color:var(--text-muted);text-align:center;padding:var(--space-md);">
                        לחצו "טען אטרקציות" כדי לטעון מהמאגר
                    </p>
                </div>
            `;
        }

        // Group by area
        const grouped = this._groupByArea(attractions);
        const rankedGroups = this._rankAttractions(grouped, day, selectedIds, usedInOtherDays);

        let html = `
            <div class="attraction-picker">
                <div class="attraction-picker-header">
                    <h4><span class="material-icons-round">place</span> אטרקציות - ${escapeHtml(city)}</h4>
                    <span class="attraction-picker-count"><strong>${selectedCount}</strong> נבחרו</span>
                </div>
        `;

        for (const [area, items] of Object.entries(rankedGroups)) {
            html += `
                <div class="attraction-area-group">
                    <div class="attraction-area-header">${escapeHtml(area)} (${items.length})</div>
                    <div class="attraction-grid">
                        ${items.map(attr => this._renderAttractionCard(attr, dayIndex, selectedIds, usedInOtherDays)).join('')}
                    </div>
                </div>
            `;
        }

        if (selectedCount >= 2) {
            html += `
                <button class="btn-arrange-day" data-action="arrange-day" data-day="${dayIndex}">
                    <span class="material-icons-round">auto_fix_high</span>
                    סדר את היום אוטומטית (${selectedCount} אטרקציות)
                </button>
            `;
        }

        html += '</div>';
        return html;
    },

    _renderAttractionCard(attr, dayIndex, selectedIds, usedInOtherDays) {
        const isSelected = selectedIds.has(attr.id);
        const usedDay = usedInOtherDays.get(attr.id);
        const icon = this.categoryIcons[attr.category] || this.categoryIcons.default;

        return `
            <label class="attraction-pick-card ${isSelected ? 'selected' : ''} ${usedDay !== undefined ? 'used-other-day' : ''}">
                <input type="checkbox"
                    class="attraction-pick-checkbox"
                    data-action="toggle-attraction"
                    data-day="${dayIndex}"
                    data-attraction-id="${attr.id}"
                    ${isSelected ? 'checked' : ''}>
                <div class="attraction-pick-info">
                    <div class="attraction-pick-name">
                        <span class="category-icon">${icon}</span>
                        ${escapeHtml(attr.name)}
                        ${attr.name_en ? `<span style="color:var(--text-muted);font-size:0.75rem;">(${escapeHtml(attr.name_en)})</span>` : ''}
                    </div>
                    ${attr.description ? `<div class="attraction-pick-desc">${escapeHtml(attr.description)}</div>` : ''}
                    <div class="attraction-pick-badges">
                        ${attr.estimated_duration ? `<span class="attraction-pick-badge">⏱ ${escapeHtml(attr.estimated_duration)}</span>` : ''}
                        ${attr.estimated_cost ? `<span class="attraction-pick-badge">¥${attr.estimated_cost.toLocaleString()}</span>` : ''}
                        ${attr.area ? `<span class="attraction-pick-badge">📍 ${escapeHtml(attr.area)}</span>` : ''}
                    </div>
                    ${usedDay !== undefined ? `<div class="attraction-pick-used">כבר ביום ${usedDay + 1}</div>` : ''}
                </div>
            </label>
        `;
    },

    /* ---- Load attractions for a city ---- */
    async loadForCity(city) {
        const key = city.toLowerCase();
        if (this._cache[key] && this._cache[key].length > 0) {
            return this._cache[key];
        }

        try {
            const attractions = await fetchAttractions({ city_en: city, status: 'approved' });
            this._cache[key] = attractions || [];
            return this._cache[key];
        } catch (e) {
            console.error('Failed to load attractions for', city, e);
            return [];
        }
    },

    /* ---- Grouping & Ranking ---- */

    _groupByArea(attractions) {
        const groups = {};
        attractions.forEach(attr => {
            const area = attr.area || attr.city_en || 'כללי';
            if (!groups[area]) groups[area] = [];
            groups[area].push(attr);
        });
        return groups;
    },

    _rankAttractions(grouped, day, selectedIds, usedInOtherDays) {
        const ranked = {};

        for (const [area, items] of Object.entries(grouped)) {
            ranked[area] = items.sort((a, b) => {
                const aScore = this._scoreAttraction(a, selectedIds, usedInOtherDays);
                const bScore = this._scoreAttraction(b, selectedIds, usedInOtherDays);
                return bScore - aScore;
            });
        }

        return ranked;
    },

    _scoreAttraction(attr, selectedIds, usedInOtherDays) {
        let score = 50;

        // Selected items get boosted to top
        if (selectedIds.has(attr.id)) score += 100;

        // Penalize items used in other days
        if (usedInOtherDays.has(attr.id)) score -= 30;

        // Boost popular categories
        if (['temple', 'shrine', 'viewpoint', 'museum'].includes(attr.category)) score += 10;

        // Boost items with more data filled in
        if (attr.description) score += 5;
        if (attr.estimated_duration) score += 3;
        if (attr.why_visit) score += 5;

        return score;
    },

    /* ---- Selection helpers ---- */

    _getSelectedIds(day) {
        const ids = new Set();
        (day.items || []).forEach(item => {
            if (item._attractionId) ids.add(item._attractionId);
        });
        // Also check _selectedAttractions array
        (day._selectedAttractions || []).forEach(id => ids.add(id));
        return ids;
    },

    _getUsedInOtherDays(tripData, currentDayIndex) {
        const used = new Map();
        (tripData.days || []).forEach((day, idx) => {
            if (idx === currentDayIndex) return;
            (day.items || []).forEach(item => {
                if (item._attractionId) used.set(item._attractionId, idx);
            });
            (day._selectedAttractions || []).forEach(id => used.set(id, idx));
        });
        return used;
    },

    /* ---- Toggle attraction selection ---- */

    toggleAttraction(tripData, dayIndex, attractionId) {
        const day = tripData.days[dayIndex];
        if (!day) return;

        if (!day._selectedAttractions) day._selectedAttractions = [];

        const idx = day._selectedAttractions.indexOf(attractionId);
        if (idx >= 0) {
            day._selectedAttractions.splice(idx, 1);
        } else {
            day._selectedAttractions.push(attractionId);
        }
    },

    /* ---- Convert selected attractions to day items ---- */

    buildDayItems(tripData, dayIndex) {
        const day = tripData.days[dayIndex];
        if (!day) return [];

        const selectedIds = day._selectedAttractions || [];
        const city = (day.cityEn || day.city || '').toLowerCase();
        const attractions = this._cache[city] || [];

        return selectedIds
            .map(id => attractions.find(a => a.id === id))
            .filter(Boolean)
            .map(attr => ({
                id: generateId(),
                type: attr.category === 'restaurant' || attr.category === 'food' || attr.category === 'cafe' ? 'restaurant' : 'activity',
                emoji: this.categoryIcons[attr.category] || '📍',
                time: '',
                title: attr.name || '',
                titleEn: attr.name_en || '',
                description: attr.description || '',
                mapsQuery: attr.name_en ? `${attr.name_en} ${attr.city_en || ''} Japan` : '',
                fee: attr.estimated_cost ? { amount: attr.estimated_cost, currency: 'yen', perPerson: true } : null,
                duration: attr.estimated_duration || '',
                bookInAdvance: attr.booking_required || false,
                booking_url: attr.booking_url || '',
                why_visit: attr.why_visit || '',
                route_note: '',
                _attractionId: attr.id,
            }));
    },
};
