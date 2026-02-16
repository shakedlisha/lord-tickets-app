/* ================================================
   PDF EXPORT - Generate downloadable trip PDFs
   ================================================
   Uses html2canvas + jsPDF for high-quality PDF output.
   Loaded lazily from CDN only when user clicks export.
   ================================================ */

const PdfExport = {
    _loaded: false,

    async _loadLibraries() {
        if (this._loaded) return;

        const libs = [
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
        ];

        for (const src of libs) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        this._loaded = true;
    },

    async exportTrip(tripData, options = {}) {
        const {
            daysToExport = null,
            fileName = null,
        } = options;

        showToast('מכין PDF...', 'info');

        try {
            await this._loadLibraries();
        } catch (e) {
            console.error('Failed to load PDF libraries:', e);
            showToast('שגיאה בטעינת ספריות PDF', 'error');
            return;
        }

        const days = tripData.days || [];
        const exportDays = daysToExport
            ? days.filter((_, i) => daysToExport.includes(i))
            : days;

        if (exportDays.length === 0) {
            showToast('אין ימים לייצוא', 'error');
            return;
        }

        // Build the HTML content for PDF
        const container = document.createElement('div');
        container.id = 'pdf-render-container';
        container.style.cssText = `
            position: fixed;
            top: -9999px;
            left: 0;
            width: 794px;
            font-family: 'Heebo', sans-serif;
            direction: rtl;
            background: white;
            color: #212121;
            padding: 0;
        `;

        // Cover page
        container.innerHTML = this._buildCoverPage(tripData);

        // Day pages
        exportDays.forEach((day, idx) => {
            const dayNum = daysToExport ? daysToExport[idx] + 1 : idx + 1;
            container.innerHTML += this._buildDayPage(day, dayNum, tripData);
        });

        document.body.appendChild(container);

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10;
            const contentWidth = pageWidth - (margin * 2);

            // Render cover page
            const coverEl = container.querySelector('.pdf-cover');
            if (coverEl) {
                const coverCanvas = await html2canvas(coverEl, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    width: 794,
                });
                const coverImg = coverCanvas.toDataURL('image/jpeg', 0.95);
                const coverRatio = coverCanvas.height / coverCanvas.width;
                const coverHeight = contentWidth * coverRatio;
                pdf.addImage(coverImg, 'JPEG', margin, margin, contentWidth, Math.min(coverHeight, pageHeight - margin * 2));
            }

            // Render each day page
            const dayPages = container.querySelectorAll('.pdf-day-page');
            for (let i = 0; i < dayPages.length; i++) {
                pdf.addPage();
                const dayCanvas = await html2canvas(dayPages[i], {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    width: 794,
                });
                const dayImg = dayCanvas.toDataURL('image/jpeg', 0.92);
                const dayRatio = dayCanvas.height / dayCanvas.width;
                const dayHeight = contentWidth * dayRatio;

                if (dayHeight <= pageHeight - margin * 2) {
                    pdf.addImage(dayImg, 'JPEG', margin, margin, contentWidth, dayHeight);
                } else {
                    // Split across pages
                    const totalPages = Math.ceil(dayHeight / (pageHeight - margin * 2));
                    for (let p = 0; p < totalPages; p++) {
                        if (p > 0) pdf.addPage();
                        const yOffset = -(p * (pageHeight - margin * 2));
                        pdf.addImage(dayImg, 'JPEG', margin, margin + yOffset, contentWidth, dayHeight);
                    }
                }
            }

            const name = fileName || `${tripData.name || 'trip'}-itinerary.pdf`;
            pdf.save(name);
            showToast('PDF נוצר בהצלחה!', 'success');
        } catch (e) {
            console.error('PDF generation failed:', e);
            showToast('שגיאה ביצירת PDF', 'error');
        } finally {
            container.remove();
        }
    },

    _buildCoverPage(trip) {
        const dateRange = formatDateRange(trip.start_date, trip.end_date);
        const dayCount = trip.days?.length || 0;

        return `
            <div class="pdf-cover" style="
                padding: 60px 40px;
                text-align: center;
                min-height: 500px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 0;
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">🌸</div>
                <h1 style="font-size: 32px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">
                    ${escapeHtml(trip.name || 'מסלול הטיול')}
                </h1>
                ${trip.customers ? `
                    <p style="font-size: 18px; opacity: 0.9; margin: 0 0 24px 0;">
                        ${escapeHtml(trip.customers)}
                    </p>
                ` : ''}
                <div style="
                    background: rgba(255,255,255,0.2);
                    border-radius: 12px;
                    padding: 16px 32px;
                    margin-top: 16px;
                    display: inline-flex;
                    gap: 32px;
                    font-size: 14px;
                ">
                    <div>
                        <div style="opacity: 0.8;">תאריכים</div>
                        <div style="font-weight: 600; font-size: 16px;">${dateRange}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.8;">ימים</div>
                        <div style="font-weight: 600; font-size: 16px;">${dayCount}</div>
                    </div>
                </div>
                <p style="margin-top: 40px; font-size: 12px; opacity: 0.6;">
                    נוצר באמצעות מסלול טיול | Travel Itinerary
                </p>
            </div>
        `;
    },

    _buildDayPage(day, dayNum, trip) {
        const items = day.items || [];
        const { costs, total: costTotal } = calculateDayCosts(day);

        let itemsHtml = items.map(item => {
            const typeIcon = item.type === 'transport' ? '🚆' : item.type === 'restaurant' ? '🍜' : '📍';
            const typeBg = item.type === 'transport' ? '#E3F2FD' : item.type === 'restaurant' ? '#FFF8E1' : '#FFFFFF';
            const typeBorder = item.type === 'transport' ? '#42A5F5' : item.type === 'restaurant' ? '#FFB300' : '#E0E0E0';
            const feeText = formatFee(item.fee);

            return `
                <div style="
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                    padding: 12px 16px;
                    background: ${typeBg};
                    border: 1px solid ${typeBorder};
                    border-radius: 10px;
                    font-size: 13px;
                    line-height: 1.5;
                    page-break-inside: avoid;
                ">
                    <div style="flex-shrink: 0; font-size: 20px;">${escapeHtml(item.emoji) || typeIcon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                            <strong style="font-size: 14px;">${escapeHtml(item.title)}</strong>
                            ${item.time ? `<span style="color: #616161; font-size: 12px; white-space: nowrap;">${item.time}</span>` : ''}
                        </div>
                        ${item.description ? `<p style="color: #616161; margin: 4px 0 0 0; font-size: 12px;">${escapeHtml(item.description)}</p>` : ''}
                        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
                            ${item.bookInAdvance ? '<span style="background: #FF5252; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px;">יש להזמין מראש</span>' : ''}
                            ${feeText ? `<span style="background: #E8EAF6; color: #3F51B5; padding: 2px 8px; border-radius: 6px; font-size: 11px;">${feeText}</span>` : ''}
                            ${item.duration ? `<span style="background: #F5F5F5; color: #616161; padding: 2px 8px; border-radius: 6px; font-size: 11px;">${item.duration}</span>` : ''}
                        </div>
                        ${item.route_note ? `<p style="color: #9E9E9E; margin: 6px 0 0 0; font-size: 11px; font-style: italic;">🚶 ${escapeHtml(item.route_note)}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        let tipsHtml = '';
        if (day.tips && day.tips.length > 0) {
            tipsHtml = `
                <div style="margin-top: 16px; padding: 12px 16px; background: #F3E5F5; border-radius: 10px; border: 1px solid #CE93D8;">
                    <strong style="font-size: 13px;">💡 טיפים</strong>
                    <ul style="margin: 8px 0 0 0; padding-right: 20px; font-size: 12px; color: #616161;">
                        ${day.tips.filter(Boolean).map(t => `<li style="margin-bottom: 4px;">${escapeHtml(t)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        let costsHtml = '';
        if (costs.length > 0) {
            costsHtml = `
                <div style="margin-top: 16px; padding: 12px 16px; background: #FFF8E1; border-radius: 10px; border: 1px solid #FFB300;">
                    <strong style="font-size: 13px;">💰 עלויות</strong>
                    <div style="margin-top: 8px;">
                        ${costs.map(c => `
                            <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; color: #616161;">
                                <span>${escapeHtml(c.item)}${c.perPerson ? ' (לאדם)' : ''}</span>
                                <span>¥${c.amount.toLocaleString()}</span>
                            </div>
                        `).join('')}
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; padding-top: 6px; margin-top: 6px; border-top: 1px solid #FFB300;">
                            <span>סה״כ</span>
                            <span>¥${costTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="pdf-day-page" style="padding: 32px 40px; background: white; page-break-before: always;">
                <div style="
                    background: linear-gradient(135deg, ${day.color || '#5C6BC0'}, ${day.color ? day.color + '99' : '#7986CB'});
                    color: white;
                    padding: 20px 24px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                ">
                    <div style="font-size: 12px; opacity: 0.8;">יום ${dayNum} • ${escapeHtml(day.dayOfWeek || '')} • ${escapeHtml(day.date || '')}</div>
                    <h2 style="font-size: 22px; font-weight: 700; margin: 4px 0 0 0;">
                        ${escapeHtml(day.title) || escapeHtml(day.city)}
                    </h2>
                    <div style="font-size: 13px; opacity: 0.9; margin-top: 2px;">
                        ${escapeHtml(day.city)} ${day.cityEn ? `(${escapeHtml(day.cityEn)})` : ''}
                    </div>
                </div>

                ${day.hotel?.name ? `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: #E8F5E9; border-radius: 10px; margin-bottom: 16px; font-size: 13px;">
                        <span style="font-size: 20px;">🏨</span>
                        <div>
                            <div style="font-size: 11px; color: #616161;">מלון</div>
                            <strong>${escapeHtml(day.hotel.name)}</strong>
                        </div>
                    </div>
                ` : ''}

                ${itemsHtml}
                ${tipsHtml}
                ${costsHtml}
            </div>
        `;
    },

    async exportSingleDay(tripData, dayIndex) {
        return this.exportTrip(tripData, {
            daysToExport: [dayIndex],
            fileName: `${tripData.name || 'trip'}-day-${dayIndex + 1}.pdf`,
        });
    },
};
