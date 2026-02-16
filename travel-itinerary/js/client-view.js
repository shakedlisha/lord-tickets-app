/* ================================================
   CLIENT VIEW - Public itinerary display
   ================================================ */

const ClientView = {
    tripId: null,
    tripData: null,
    currentDayIndex: 0,

    async load(tripId, dayId) {
        this.tripId = tripId;

        try {
            this.tripData = await fetchTrip(tripId);

            if (!this.tripData) {
                document.getElementById('trip-not-found').style.display = '';
                return;
            }

            this.renderHeader();
            this.renderDayNav();

            const startIdx = dayId
                ? Math.max(0, this.tripData.days.findIndex(d => d.id === dayId))
                : 0;

            this.selectDay(startIdx);
            Sakura.init('sakura-container');

            if (this.isSakuraSeason()) {
                document.getElementById('sakura-banner').style.display = '';
            }

        } catch (e) {
            console.error('Failed to load trip:', e);
            document.getElementById('trip-not-found').style.display = '';
        }
    },

    isSakuraSeason() {
        if (!this.tripData?.start_date) return false;
        const start = new Date(this.tripData.start_date);
        const month = start.getMonth();
        return month >= 2 && month <= 4;
    },

    renderHeader() {
        const t = this.tripData;
        document.getElementById('trip-title').textContent = t.name || 'מסלול הטיול';
        document.getElementById('trip-subtitle').textContent =
            (t.customers ? escapeHtml(t.customers) + ' • ' : '') +
            formatDateRange(t.start_date, t.end_date);

        this.updateTripProgress();
    },

    updateTripProgress() {
        const days = this.tripData.days || [];
        const percent = Checklist.getPercent(this.tripId, days);

        document.getElementById('progress-percent').textContent = percent + '%';

        const circle = document.getElementById('progress-ring-fill');
        if (circle) {
            const circumference = 2 * Math.PI * 20;
            const offset = circumference - (percent / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    },

    renderDayNav() {
        const days = this.tripData.days || [];
        const scroll = document.getElementById('day-nav-scroll');

        scroll.innerHTML = days.map((day, index) => `
            <div class="day-tab ${index === this.currentDayIndex ? 'active' : ''}" data-day-index="${index}">
                <span class="day-tab-number">יום ${index + 1}</span>
                <span class="day-tab-city">${escapeHtml(day.city)}</span>
                <span class="day-tab-date">${escapeHtml(day.date)}</span>
            </div>
        `).join('');

        scroll.querySelectorAll('.day-tab').forEach(tab => {
            tab.onclick = () => {
                const idx = parseInt(tab.dataset.dayIndex);
                this.selectDay(idx);
            };
        });
    },

    selectDay(index) {
        const days = this.tripData.days || [];
        if (index < 0 || index >= days.length) return;

        this.currentDayIndex = index;
        const day = days[index];

        document.querySelectorAll('.day-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });

        const activeTab = document.querySelector('.day-tab.active');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        this.renderDayContent(day, index);

        window.scrollTo({ top: 0, behavior: 'smooth' });

        const dayId = day.id || `day-${index}`;
        const newHash = `#/trip/${this.tripId}/${dayId}`;
        if (window.location.hash !== newHash) {
            history.replaceState(null, '', newHash);
        }
    },

    renderDayContent(day, dayIndex) {
        const container = document.getElementById('day-content');
        const cityColor = getCityColor(day.cityEn, day.color);
        const cityImage = day.bannerImage || getCityImage(day.cityEn);
        const { checked, total } = Checklist.countForDay(this.tripId, day);
        const progressPercent = total > 0 ? Math.round((checked / total) * 100) : 0;
        const { costs, total: costTotal } = calculateDayCosts(day);

        let html = '';

        html += `
            <div class="city-banner" style="background-image: url('${cityImage}'); ${!cityImage ? `background: ${cityColor.gradient};` : ''}">
                <div class="city-banner-content">
                    <div class="city-banner-day">יום ${dayIndex + 1} • ${escapeHtml(day.dayOfWeek)} • ${escapeHtml(day.date)}</div>
                    <h2 class="city-banner-title">${escapeHtml(day.title) || escapeHtml(day.city)}</h2>
                    <div class="city-banner-subtitle">${escapeHtml(day.city)} ${day.cityEn ? `(${escapeHtml(day.cityEn)})` : ''}</div>
                </div>
            </div>
        `;

        if (total > 0) {
            html += `
                <div class="day-progress">
                    <div class="day-progress-bar">
                        <div class="day-progress-fill" style="width:${progressPercent}%;background:${cityColor.primary};"></div>
                    </div>
                    <span class="day-progress-text">ביקרתם ב-${checked} מתוך ${total}</span>
                </div>
            `;
        }

        if (day.hotel && day.hotel.name) {
            const hotelUrl = day.hotel.mapsQuery ? buildMapsUrl(day.hotel.mapsQuery) : null;
            html += `
                <div class="hotel-card">
                    <span class="hotel-card-icon">🏨</span>
                    <div>
                        <div class="hotel-card-label">מלון</div>
                        <div class="hotel-card-name">
                            ${hotelUrl
                                ? `<a href="${hotelUrl}" target="_blank" rel="noopener">${escapeHtml(day.hotel.name)}</a>`
                                : escapeHtml(day.hotel.name)
                            }
                        </div>
                    </div>
                </div>
            `;
        }

        if (day.items && day.items.length > 0) {
            html += '<div class="timeline">';
            day.items.forEach(item => {
                html += this.renderTimelineItem(item, day);
            });
            html += '</div>';
        }

        if (day.tips && day.tips.length > 0) {
            html += '<div class="tips-section">';
            day.tips.forEach(tip => {
                if (tip) {
                    html += `
                        <div class="tip-card">
                            <span class="tip-icon">💡</span>
                            <span class="tip-text">${escapeHtml(tip)}</span>
                        </div>
                    `;
                }
            });
            html += '</div>';
        }

        if (costs.length > 0) {
            html += `
                <div class="cost-summary">
                    <h3>💰 סיכום עלויות</h3>
                    ${costs.map(c => `
                        <div class="cost-row">
                            <span>${escapeHtml(c.item)}${c.perPerson ? ' (לאדם)' : ''}</span>
                            <span class="cost-amount">¥${c.amount.toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="cost-row total">
                        <span>סה״כ</span>
                        <span class="cost-amount">¥${costTotal.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }

        if (day.appendix && day.appendix.length > 0) {
            html += `
                <div class="appendix-section">
                    <button class="appendix-toggle" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open');">
                        <span class="material-icons-round">expand_more</span>
                        פעילויות נוספות (${day.appendix.length})
                    </button>
                    <div class="appendix-content">
                        <div class="timeline" style="padding-right:0;">
                            ${day.appendix.map(item => this.renderAppendixItem(item)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        this.bindCheckboxes();
    },

    renderTimelineItem(item, day) {
        const isChecked = Checklist.isChecked(this.tripId, item.id);
        const mapsUrl = item.mapsQuery ? buildMapsUrl(item.mapsQuery) : null;
        const feeText = formatFee(item.fee);
        const cardClass = item.type === 'transport' ? 'transport' : item.type === 'restaurant' ? 'restaurant' : '';
        const isCheckable = item.type !== 'transport';

        let titleHtml = escapeHtml(item.title);
        if (mapsUrl) {
            titleHtml = `<a href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>`;
        }

        let detailsHtml = '';
        if (item.type === 'transport' && (item.line || item.from || item.to)) {
            detailsHtml = `
                <div class="transport-details">
                    ${item.line ? `<span><strong>${escapeHtml(item.line)}</strong></span>` : ''}
                    <div class="transport-route">
                        ${item.from ? `<span>${escapeHtml(item.from)}</span>` : ''}
                        ${item.from && item.to ? '<span class="material-icons-round">arrow_back</span>' : ''}
                        ${item.to ? `<span>${escapeHtml(item.to)}</span>` : ''}
                    </div>
                </div>
            `;
        }

        let badgesHtml = '';
        if (feeText || item.bookInAdvance || item.duration) {
            badgesHtml = '<div class="card-badges">';
            if (item.bookInAdvance) {
                badgesHtml += '<span class="badge badge-booking">יש להזמין מראש</span>';
            }
            if (feeText) {
                badgesHtml += `<span class="badge badge-fee">${feeText}</span>`;
            }
            if (item.duration) {
                badgesHtml += `<span class="badge badge-duration">${item.duration}</span>`;
            }
            badgesHtml += '</div>';
        }

        return `
            <div class="timeline-item ${isChecked ? 'checked' : ''}" data-item-id="${item.id}">
                <div class="timeline-dot"></div>
                <div class="timeline-card ${cardClass}">
                    <div class="card-header">
                        <div class="card-header-right">
                            <span class="card-emoji">${escapeHtml(item.emoji) || '📍'}</span>
                            <div>
                                ${item.time ? `<span class="card-time">${item.time}</span>` : ''}
                                <div class="card-title">${titleHtml}</div>
                            </div>
                        </div>
                        ${isCheckable ? `
                            <div class="card-checkbox">
                                <input type="checkbox" ${isChecked ? 'checked' : ''} data-check-id="${item.id}" title="סמן כביקרתי">
                            </div>
                        ` : ''}
                    </div>
                    ${detailsHtml}
                    ${item.description ? `<p class="card-description">${escapeHtml(item.description)}</p>` : ''}
                    ${badgesHtml}
                    ${item.transportNote ? `<p class="card-description" style="margin-top:8px;font-style:italic;">${escapeHtml(item.transportNote)}</p>` : ''}
                </div>
            </div>
        `;
    },

    renderAppendixItem(item) {
        const mapsUrl = item.mapsQuery ? buildMapsUrl(item.mapsQuery) : null;
        const feeText = formatFee(item.fee);

        let titleHtml = escapeHtml(item.title);
        if (mapsUrl) {
            titleHtml = `<a href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>`;
        }

        return `
            <div class="timeline-card" style="margin-bottom:12px;">
                <div class="card-header">
                    <div class="card-header-right">
                        <span class="card-emoji">${escapeHtml(item.emoji) || '📌'}</span>
                        <div>
                            <div class="card-title">${titleHtml}</div>
                        </div>
                    </div>
                </div>
                ${item.description ? `<p class="card-description">${escapeHtml(item.description)}</p>` : ''}
                ${feeText ? `<div class="card-badges"><span class="badge badge-fee">${feeText}</span></div>` : ''}
            </div>
        `;
    },

    bindCheckboxes() {
        document.querySelectorAll('[data-check-id]').forEach(checkbox => {
            checkbox.onchange = () => {
                const itemId = checkbox.dataset.checkId;
                Checklist.toggle(this.tripId, itemId);

                const timelineItem = checkbox.closest('.timeline-item');
                if (timelineItem) {
                    timelineItem.classList.toggle('checked', checkbox.checked);
                }

                this.updateDayProgress();
                this.updateTripProgress();
            };
        });
    },

    updateDayProgress() {
        const day = this.tripData.days[this.currentDayIndex];
        const { checked, total } = Checklist.countForDay(this.tripId, day);
        const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

        const fill = document.querySelector('.day-progress-fill');
        const text = document.querySelector('.day-progress-text');

        if (fill) fill.style.width = percent + '%';
        if (text) text.textContent = `ביקרתם ב-${checked} מתוך ${total}`;
    }
};
