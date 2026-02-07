// Lord Tickets - Document Generation System
// Generates professional receipts, invoices, and passenger lists

(function() {
    'use strict';
    
    // Company info (can be customized)
    const companyInfo = {
        name: 'Lord Tickets',
        tagline: 'סוכנות נסיעות',
        phone: '',
        email: '',
        address: '',
        logo: '✈️'
    };
    
    // Hebrew labels
    const labels = {
        receipt: 'קבלה',
        invoice: 'חשבונית',
        passengerList: 'רשימת נוסעים',
        flightDetails: 'פרטי טיסה',
        passenger: 'נוסע',
        date: 'תאריך',
        documentNo: 'מספר מסמך',
        destination: 'יעד',
        outbound: 'טיסת הלוך',
        return: 'טיסת חזור',
        hotel: 'מלון',
        price: 'מחיר',
        total: 'סה"כ',
        currency: 'מטבע',
        paymentMethod: 'אמצעי תשלום',
        agent: 'סוכן',
        phone: 'טלפון',
        email: 'אימייל',
        notes: 'הערות',
        thankYou: 'תודה שבחרתם ב-Lord Tickets!',
        signature: 'חתימה',
        printed: 'הודפס בתאריך'
    };
    
    // Generate unique document number
    function generateDocNumber(type) {
        const prefix = type === 'receipt' ? 'RCP' : type === 'invoice' ? 'INV' : 'LST';
        const date = new Date();
        const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`;
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}-${dateStr}-${random}`;
    }
    
    // Format date in Hebrew style
    function formatDate(date) {
        if (!date) date = new Date();
        if (typeof date === 'string') date = new Date(date);
        return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
    }
    
    // Format currency
    function formatCurrency(amount, currency = 'EUR') {
        const symbols = { EUR: '€', USD: '$', ILS: '₪', GBP: '£' };
        return `${symbols[currency] || currency}${parseFloat(amount || 0).toLocaleString()}`;
    }
    
    // Base document styles
    const baseStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Heebo', Arial, sans-serif;
            direction: rtl;
            padding: 40px;
            background: white;
            color: #333;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .document {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #1a365d;
            padding: 30px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #d4af37;
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        
        .logo-section {
            text-align: right;
        }
        
        .logo {
            font-size: 2.5rem;
            margin-bottom: 5px;
        }
        
        .company-name {
            font-size: 1.8rem;
            font-weight: 700;
            color: #1a365d;
        }
        
        .company-tagline {
            color: #d4af37;
            font-size: 1rem;
        }
        
        .doc-info {
            text-align: left;
            direction: ltr;
        }
        
        .doc-type {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1a365d;
            margin-bottom: 10px;
        }
        
        .doc-number {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 5px;
        }
        
        .doc-date {
            font-size: 0.9rem;
            color: #666;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1a365d;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px 30px;
        }
        
        .info-item {
            display: flex;
            gap: 10px;
        }
        
        .info-label {
            font-weight: 500;
            color: #666;
            min-width: 80px;
        }
        
        .info-value {
            color: #333;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: right;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background: #1a365d;
            color: white;
            font-weight: 600;
        }
        
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .total-row {
            font-weight: 700;
            font-size: 1.1rem;
            background: #f5f5f5 !important;
        }
        
        .total-row td {
            border-top: 2px solid #1a365d;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
        }
        
        .thank-you {
            font-size: 1.1rem;
            color: #d4af37;
            font-weight: 600;
            margin-bottom: 15px;
        }
        
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
        }
        
        .signature-box {
            width: 200px;
            text-align: center;
        }
        
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 50px;
            padding-top: 5px;
            font-size: 0.9rem;
            color: #666;
        }
        
        .printed-date {
            text-align: center;
            font-size: 0.8rem;
            color: #999;
            margin-top: 20px;
        }
        
        .v-mark {
            color: #28a745;
            font-weight: bold;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 8rem;
            color: rgba(212, 175, 55, 0.1);
            pointer-events: none;
            z-index: -1;
        }
        
        @media print {
            body { padding: 0; }
            .document { border: none; }
            .no-print { display: none; }
        }
    `;
    
    // Generate Receipt HTML
    function generateReceipt(passenger, flight, options = {}) {
        const docNumber = options.docNumber || generateDocNumber('receipt');
        const date = options.date || new Date();
        
        return `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>קבלה - ${passenger.first_name} ${passenger.last_name}</title>
                <style>${baseStyles}</style>
            </head>
            <body>
                <div class="watermark">${companyInfo.logo}</div>
                <div class="document">
                    <div class="header">
                        <div class="logo-section">
                            <div class="logo">${companyInfo.logo}</div>
                            <div class="company-name">${companyInfo.name}</div>
                            <div class="company-tagline">${companyInfo.tagline}</div>
                        </div>
                        <div class="doc-info">
                            <div class="doc-type">${labels.receipt}</div>
                            <div class="doc-number">${labels.documentNo}: ${docNumber}</div>
                            <div class="doc-date">${labels.date}: ${formatDate(date)}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">פרטי הלקוח</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">שם:</span>
                                <span class="info-value"><strong>${passenger.first_name} ${passenger.last_name}</strong></span>
                            </div>
                            ${passenger.phone ? `
                            <div class="info-item">
                                <span class="info-label">${labels.phone}:</span>
                                <span class="info-value">${passenger.phone}</span>
                            </div>` : ''}
                            ${passenger.crm_id ? `
                            <div class="info-item">
                                <span class="info-label">מזהה CRM:</span>
                                <span class="info-value">${passenger.crm_id}</span>
                            </div>` : ''}
                            ${passenger.agent_name ? `
                            <div class="info-item">
                                <span class="info-label">${labels.agent}:</span>
                                <span class="info-value">${passenger.agent_name}</span>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">${labels.flightDetails}</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">${labels.destination}:</span>
                                <span class="info-value"><strong>${flight.destination || '-'}</strong></span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">תאריכים:</span>
                                <span class="info-value">${formatDate(flight.departure_date)} - ${formatDate(flight.return_date)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">${labels.outbound}:</span>
                                <span class="info-value">${passenger.has_outbound !== false ? '✓ כלול' : '✗ לא כלול'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">${labels.return}:</span>
                                <span class="info-value">${passenger.has_return !== false ? '✓ כלול' : '✗ לא כלול'}</span>
                            </div>
                            ${passenger.hotel_name ? `
                            <div class="info-item">
                                <span class="info-label">${labels.hotel}:</span>
                                <span class="info-value">${passenger.hotel_name}</span>
                            </div>` : ''}
                            ${passenger.hotel_booking_ref ? `
                            <div class="info-item">
                                <span class="info-label">אישור מלון:</span>
                                <span class="info-value">${passenger.hotel_booking_ref}</span>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">פרטי תשלום</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>פריט</th>
                                    <th>פרטים</th>
                                    <th>${labels.price}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>חבילת נסיעה - ${flight.destination}</td>
                                    <td>${formatDate(flight.departure_date)} - ${formatDate(flight.return_date)}</td>
                                    <td>${formatCurrency(passenger.price_paid, passenger.currency)}</td>
                                </tr>
                                <tr class="total-row">
                                    <td colspan="2">${labels.total}</td>
                                    <td>${formatCurrency(passenger.price_paid, passenger.currency)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    ${passenger.booking_ref ? `
                    <div class="section">
                        <div class="info-item">
                            <span class="info-label">מספר הזמנה:</span>
                            <span class="info-value"><strong>${passenger.booking_ref}</strong></span>
                        </div>
                    </div>` : ''}
                    
                    <div class="footer">
                        <div class="thank-you">${labels.thankYou}</div>
                        <div class="signature-section">
                            <div class="signature-box">
                                <div class="signature-line">חתימת הלקוח</div>
                            </div>
                            <div class="signature-box">
                                <div class="signature-line">חתימת הסוכן</div>
                            </div>
                        </div>
                        <div class="printed-date">${labels.printed}: ${formatDate(new Date())} ${new Date().toLocaleTimeString('he-IL')}</div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
    }
    
    // Generate Invoice HTML
    function generateInvoice(passengers, flight, options = {}) {
        const docNumber = options.docNumber || generateDocNumber('invoice');
        const date = options.date || new Date();
        
        // Calculate totals by currency
        const totals = {};
        passengers.forEach(p => {
            const currency = p.currency || 'EUR';
            if (!totals[currency]) totals[currency] = 0;
            totals[currency] += parseFloat(p.price_paid || 0);
        });
        
        const passengerRows = passengers.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${p.first_name} ${p.last_name}</td>
                <td>${p.has_outbound !== false ? '✓' : '-'}</td>
                <td>${p.has_return !== false ? '✓' : '-'}</td>
                <td>${p.hotel_name || '-'}</td>
                <td>${formatCurrency(p.price_paid, p.currency)}</td>
            </tr>
        `).join('');
        
        const totalRows = Object.entries(totals).map(([currency, amount]) => `
            <tr class="total-row">
                <td colspan="5">${labels.total} (${currency})</td>
                <td>${formatCurrency(amount, currency)}</td>
            </tr>
        `).join('');
        
        return `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>חשבונית - ${flight.destination}</title>
                <style>${baseStyles}</style>
            </head>
            <body>
                <div class="watermark">${companyInfo.logo}</div>
                <div class="document">
                    <div class="header">
                        <div class="logo-section">
                            <div class="logo">${companyInfo.logo}</div>
                            <div class="company-name">${companyInfo.name}</div>
                            <div class="company-tagline">${companyInfo.tagline}</div>
                        </div>
                        <div class="doc-info">
                            <div class="doc-type">${labels.invoice}</div>
                            <div class="doc-number">${labels.documentNo}: ${docNumber}</div>
                            <div class="doc-date">${labels.date}: ${formatDate(date)}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">${labels.flightDetails}</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">${labels.destination}:</span>
                                <span class="info-value"><strong>${flight.destination || '-'}</strong></span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">תאריכים:</span>
                                <span class="info-value">${formatDate(flight.departure_date)} - ${formatDate(flight.return_date)}</span>
                            </div>
                            ${flight.flight_code ? `
                            <div class="info-item">
                                <span class="info-label">קוד טיסה:</span>
                                <span class="info-value">${flight.flight_code}</span>
                            </div>` : ''}
                            <div class="info-item">
                                <span class="info-label">מספר נוסעים:</span>
                                <span class="info-value">${passengers.length}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">רשימת נוסעים</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>שם מלא</th>
                                    <th>הלוך</th>
                                    <th>חזור</th>
                                    <th>${labels.hotel}</th>
                                    <th>${labels.price}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${passengerRows}
                                ${totalRows}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <div class="thank-you">${labels.thankYou}</div>
                        <div class="signature-section">
                            <div class="signature-box">
                                <div class="signature-line">אישור הלקוח</div>
                            </div>
                            <div class="signature-box">
                                <div class="signature-line">חתימת ${companyInfo.name}</div>
                            </div>
                        </div>
                        <div class="printed-date">${labels.printed}: ${formatDate(new Date())} ${new Date().toLocaleTimeString('he-IL')}</div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
    }
    
    // Generate Passenger List HTML
    function generatePassengerList(passengers, flight, options = {}) {
        const docNumber = options.docNumber || generateDocNumber('list');
        const date = options.date || new Date();
        
        // Count stats
        const outboundCount = passengers.filter(p => p.has_outbound !== false).length;
        const returnCount = passengers.filter(p => p.has_return !== false).length;
        
        const passengerRows = passengers.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${p.first_name} ${p.last_name}</strong></td>
                <td>${p.phone || '-'}</td>
                <td class="v-mark">${p.has_outbound !== false ? '✓' : '-'}</td>
                <td class="v-mark">${p.has_return !== false ? '✓' : '-'}</td>
                <td>${p.hotel_name || '-'}</td>
                <td>${p.hotel_booking_ref || '-'}</td>
                <td>${p.agent_name || '-'}</td>
            </tr>
        `).join('');
        
        return `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>רשימת נוסעים - ${flight.destination}</title>
                <style>
                    ${baseStyles}
                    
                    .stats-bar {
                        display: flex;
                        gap: 30px;
                        background: #f5f5f5;
                        padding: 15px 20px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    
                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .stat-label {
                        color: #666;
                    }
                    
                    .stat-value {
                        font-weight: 700;
                        color: #1a365d;
                        font-size: 1.2rem;
                    }
                    
                    table {
                        font-size: 12px;
                    }
                    
                    th, td {
                        padding: 10px 12px;
                    }
                </style>
            </head>
            <body>
                <div class="document">
                    <div class="header">
                        <div class="logo-section">
                            <div class="logo">${companyInfo.logo}</div>
                            <div class="company-name">${companyInfo.name}</div>
                            <div class="company-tagline">${companyInfo.tagline}</div>
                        </div>
                        <div class="doc-info">
                            <div class="doc-type">${labels.passengerList}</div>
                            <div class="doc-number">${labels.documentNo}: ${docNumber}</div>
                            <div class="doc-date">${labels.date}: ${formatDate(date)}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">${labels.flightDetails}</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">${labels.destination}:</span>
                                <span class="info-value"><strong>${flight.destination || '-'}</strong></span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">תאריכים:</span>
                                <span class="info-value">${formatDate(flight.departure_date)} - ${formatDate(flight.return_date)}</span>
                            </div>
                            ${flight.airline ? `
                            <div class="info-item">
                                <span class="info-label">חברת תעופה:</span>
                                <span class="info-value">${flight.airline}</span>
                            </div>` : ''}
                            ${flight.flight_code ? `
                            <div class="info-item">
                                <span class="info-label">קוד טיסה:</span>
                                <span class="info-value">${flight.flight_code}</span>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="stats-bar">
                            <div class="stat-item">
                                <span class="stat-label">סה"כ נוסעים:</span>
                                <span class="stat-value">${passengers.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">טיסת הלוך:</span>
                                <span class="stat-value">${outboundCount}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">טיסת חזור:</span>
                                <span class="stat-value">${returnCount}</span>
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>שם מלא</th>
                                    <th>טלפון</th>
                                    <th>הלוך</th>
                                    <th>חזור</th>
                                    <th>מלון</th>
                                    <th>אישור מלון</th>
                                    <th>סוכן</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${passengerRows}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <div class="printed-date">${labels.printed}: ${formatDate(new Date())} ${new Date().toLocaleTimeString('he-IL')}</div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
    }
    
    // Generate Hotel List (grouped by hotel) - Enhanced with check-in/out dates
    function generateHotelList(passengers, flight, options = {}) {
        const docNumber = options.docNumber || generateDocNumber('list');
        
        // Group by hotel
        const hotels = {};
        passengers.forEach(p => {
            const hotelName = p.hotel_name || 'ללא מלון';
            if (!hotels[hotelName]) hotels[hotelName] = [];
            hotels[hotelName].push(p);
        });
        
        // Calculate nights
        const checkIn = new Date(flight.departure_date);
        const checkOut = new Date(flight.return_date);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        
        const hotelSections = Object.entries(hotels).map(([hotelName, guests]) => `
            <div class="hotel-section">
                <div class="hotel-header">
                    <h4>🏨 ${hotelName}</h4>
                    <div class="hotel-stats">
                        <span class="guest-count">${guests.length} אורחים</span>
                    </div>
                </div>
                <div class="hotel-dates">
                    <span><strong>Check-in:</strong> ${formatDate(flight.departure_date)}</span>
                    <span><strong>Check-out:</strong> ${formatDate(flight.return_date)}</span>
                    <span><strong>לילות:</strong> ${nights}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>שם אורח</th>
                            <th>טלפון</th>
                            <th>מס׳ אישור</th>
                            <th>קבוצת חדר</th>
                            <th>בקשות מיוחדות</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${guests.map((p, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${p.first_name} ${p.last_name}</strong></td>
                                <td>${p.phone || '-'}</td>
                                <td>${p.hotel_booking_ref || '-'}</td>
                                <td>${p.room_group_name || '-'}</td>
                                <td>${p.special_notes || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('');
        
        // Summary stats
        const totalGuests = passengers.length;
        const hotelCount = Object.keys(hotels).filter(h => h !== 'ללא מלון').length;
        
        return `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>רשימת מלונות - ${flight.destination}</title>
                <style>
                    ${baseStyles}
                    
                    .manifest-type {
                        display: inline-block;
                        background: #6f42c1;
                        color: white;
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-weight: 600;
                        margin-bottom: 10px;
                    }
                    
                    .stats-bar {
                        display: flex;
                        gap: 30px;
                        background: #f5f5f5;
                        padding: 15px 20px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    
                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .stat-label { color: #666; }
                    .stat-value { font-weight: 700; color: #1a365d; font-size: 1.2rem; }
                    
                    .hotel-section {
                        margin-bottom: 30px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        overflow: hidden;
                    }
                    
                    .hotel-header {
                        background: #1a365d;
                        color: white;
                        padding: 12px 15px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .hotel-header h4 {
                        margin: 0;
                        font-size: 1.1rem;
                    }
                    
                    .guest-count {
                        background: #d4af37;
                        color: #1a365d;
                        padding: 3px 12px;
                        border-radius: 15px;
                        font-weight: 600;
                        font-size: 0.9rem;
                    }
                    
                    .hotel-dates {
                        background: #f8f9fa;
                        padding: 10px 15px;
                        display: flex;
                        gap: 25px;
                        font-size: 0.9rem;
                        border-bottom: 1px solid #ddd;
                    }
                    
                    table { font-size: 12px; margin: 0; }
                    th, td { padding: 10px 12px; }
                </style>
            </head>
            <body>
                <div class="document">
                    <div class="header">
                        <div class="logo-section">
                            <div class="logo">${companyInfo.logo}</div>
                            <div class="company-name">${companyInfo.name}</div>
                        </div>
                        <div class="doc-info">
                            <div class="manifest-type">🏨 לספק מלונות</div>
                            <div class="doc-type">רשימת אורחים</div>
                            <div class="doc-number">${labels.documentNo}: ${docNumber}</div>
                            <div class="doc-date">${labels.date}: ${formatDate()}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">פרטי הקבוצה</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">${labels.destination}:</span>
                                <span class="info-value"><strong>${flight.destination}</strong></span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Check-in:</span>
                                <span class="info-value">${formatDate(flight.departure_date)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Check-out:</span>
                                <span class="info-value">${formatDate(flight.return_date)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">מספר לילות:</span>
                                <span class="info-value">${nights}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="stats-bar">
                            <div class="stat-item">
                                <span class="stat-label">סה"כ אורחים:</span>
                                <span class="stat-value">${totalGuests}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">מלונות:</span>
                                <span class="stat-value">${hotelCount}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${hotelSections}
                    
                    <div class="footer">
                        <div class="printed-date">${labels.printed}: ${formatDate(new Date())} ${new Date().toLocaleTimeString('he-IL')}</div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
    }
    
    // Open document in new window
    function openDocument(html) {
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    }
    
    // Print single passenger receipt
    function printReceipt(passenger, flight) {
        const html = generateReceipt(passenger, flight);
        openDocument(html);
    }
    
    // Print invoice for multiple passengers
    function printInvoice(passengers, flight) {
        const html = generateInvoice(passengers, flight);
        openDocument(html);
    }
    
    // Print passenger list
    function printPassengerList(passengers, flight) {
        const html = generatePassengerList(passengers, flight);
        openDocument(html);
    }
    
    // Print hotel list
    function printHotelList(passengers, flight) {
        const html = generateHotelList(passengers, flight);
        openDocument(html);
    }
    
    // ==========================================
    // SUPPLIER MANIFESTS
    // ==========================================
    
    // Generate Airline Manifest (for check-in / ground handling)
    // Options: { leg: 'outbound' | 'return' | 'both' }
    function generateAirlineManifest(passengers, flight, options = {}) {
        const leg = options.leg || 'both';
        const docNumber = options.docNumber || generateDocNumber('list');
        
        // Filter by leg
        let filteredPassengers = passengers;
        let legTitle = 'כל הנוסעים';
        
        if (leg === 'outbound') {
            filteredPassengers = passengers.filter(p => p.has_outbound !== false);
            legTitle = 'טיסת הלוך';
        } else if (leg === 'return') {
            filteredPassengers = passengers.filter(p => p.has_return !== false);
            legTitle = 'טיסת חזור';
        }
        
        const passengerRows = filteredPassengers.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${p.first_name} ${p.last_name}</strong></td>
                <td>${p.phone || '-'}</td>
                <td class="v-mark">${p.has_outbound !== false ? '✓' : '-'}</td>
                <td class="v-mark">${p.has_return !== false ? '✓' : '-'}</td>
                <td>${p.booking_ref || '-'}</td>
                <td>${p.special_notes || '-'}</td>
            </tr>
        `).join('');
        
        return `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>מניפסט טיסה - ${flight.destination} - ${legTitle}</title>
                <style>
                    ${baseStyles}
                    
                    .manifest-type {
                        display: inline-block;
                        background: #d4af37;
                        color: #1a365d;
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-weight: 600;
                        margin-bottom: 10px;
                    }
                    
                    .stats-bar {
                        display: flex;
                        gap: 30px;
                        background: #f5f5f5;
                        padding: 15px 20px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    
                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .stat-label { color: #666; }
                    .stat-value { font-weight: 700; color: #1a365d; font-size: 1.2rem; }
                    
                    table { font-size: 12px; }
                    th, td { padding: 10px 12px; }
                </style>
            </head>
            <body>
                <div class="document">
                    <div class="header">
                        <div class="logo-section">
                            <div class="logo">${companyInfo.logo}</div>
                            <div class="company-name">${companyInfo.name}</div>
                        </div>
                        <div class="doc-info">
                            <div class="manifest-type">${legTitle}</div>
                            <div class="doc-type">מניפסט טיסה</div>
                            <div class="doc-number">${labels.documentNo}: ${docNumber}</div>
                            <div class="doc-date">${labels.date}: ${formatDate()}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">${labels.flightDetails}</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">${labels.destination}:</span>
                                <span class="info-value"><strong>${flight.destination}</strong></span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">תאריך ${leg === 'return' ? 'חזור' : 'יציאה'}:</span>
                                <span class="info-value">${formatDate(leg === 'return' ? flight.return_date : flight.departure_date)}</span>
                            </div>
                            ${flight.airline ? `
                            <div class="info-item">
                                <span class="info-label">חברת תעופה:</span>
                                <span class="info-value">${flight.airline}</span>
                            </div>` : ''}
                            ${flight.flight_code ? `
                            <div class="info-item">
                                <span class="info-label">קוד טיסה:</span>
                                <span class="info-value">${flight.flight_code}</span>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="stats-bar">
                            <div class="stat-item">
                                <span class="stat-label">סה"כ נוסעים ברשימה:</span>
                                <span class="stat-value">${filteredPassengers.length}</span>
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>שם מלא</th>
                                    <th>טלפון</th>
                                    <th>הלוך</th>
                                    <th>חזור</th>
                                    <th>מס׳ הזמנה / PNR</th>
                                    <th>הערות</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${passengerRows}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <div class="printed-date">${labels.printed}: ${formatDate(new Date())} ${new Date().toLocaleTimeString('he-IL')}</div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
    }
    
    // Print airline manifest
    function printAirlineManifest(passengers, flight, options = {}) {
        const html = generateAirlineManifest(passengers, flight, options);
        openDocument(html);
    }
    
    // Generate Transport Manifest (for bus companies)
    // Sorted by hotel for efficient pickup route
    function generateTransportManifest(passengers, flight, options = {}) {
        const docNumber = options.docNumber || generateDocNumber('list');
        const transportType = options.transportType || 'הסעות';
        
        // Sort by hotel name for efficient pickup route
        const sortedPassengers = [...passengers].sort((a, b) => {
            const hotelA = (a.hotel_name || 'ללא מלון').toLowerCase();
            const hotelB = (b.hotel_name || 'ללא מלון').toLowerCase();
            return hotelA.localeCompare(hotelB, 'he');
        });
        
        // Count by hotel for summary
        const hotelCounts = {};
        sortedPassengers.forEach(p => {
            const hotel = p.hotel_name || 'ללא מלון';
            hotelCounts[hotel] = (hotelCounts[hotel] || 0) + 1;
        });
        
        const passengerRows = sortedPassengers.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${p.first_name} ${p.last_name}</strong></td>
                <td>${p.phone || '-'}</td>
                <td>${p.hotel_name || 'ללא מלון'}</td>
                <td>${p.special_notes || '-'}</td>
            </tr>
        `).join('');
        
        const hotelSummary = Object.entries(hotelCounts).map(([hotel, count]) => `
            <div class="stat-item">
                <span class="stat-label">${hotel}:</span>
                <span class="stat-value">${count}</span>
            </div>
        `).join('');
        
        return `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>רשימת ${transportType} - ${flight.destination}</title>
                <style>
                    ${baseStyles}
                    
                    .manifest-type {
                        display: inline-block;
                        background: #28a745;
                        color: white;
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-weight: 600;
                        margin-bottom: 10px;
                    }
                    
                    .stats-bar {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 20px;
                        background: #f5f5f5;
                        padding: 15px 20px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    
                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .stat-label { color: #666; }
                    .stat-value { font-weight: 700; color: #1a365d; }
                    
                    .total-stat .stat-value { font-size: 1.3rem; color: #28a745; }
                    
                    table { font-size: 12px; }
                    th, td { padding: 10px 12px; }
                    
                    .hotel-divider {
                        background: #e9ecef !important;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="document">
                    <div class="header">
                        <div class="logo-section">
                            <div class="logo">${companyInfo.logo}</div>
                            <div class="company-name">${companyInfo.name}</div>
                        </div>
                        <div class="doc-info">
                            <div class="manifest-type">🚌 ${transportType}</div>
                            <div class="doc-type">רשימת איסוף</div>
                            <div class="doc-number">${labels.documentNo}: ${docNumber}</div>
                            <div class="doc-date">${labels.date}: ${formatDate()}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">${labels.flightDetails}</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">${labels.destination}:</span>
                                <span class="info-value"><strong>${flight.destination}</strong></span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">תאריך:</span>
                                <span class="info-value">${formatDate(flight.departure_date)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">סיכום לפי נקודות איסוף</h3>
                        <div class="stats-bar">
                            <div class="stat-item total-stat">
                                <span class="stat-label">סה"כ נוסעים:</span>
                                <span class="stat-value">${sortedPassengers.length}</span>
                            </div>
                            ${hotelSummary}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">רשימת נוסעים (ממוין לפי נקודת איסוף)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>שם מלא</th>
                                    <th>טלפון</th>
                                    <th>נקודת איסוף / מלון</th>
                                    <th>הערות</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${passengerRows}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <div class="printed-date">${labels.printed}: ${formatDate(new Date())} ${new Date().toLocaleTimeString('he-IL')}</div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
    }
    
    // Print transport manifest
    function printTransportManifest(passengers, flight, options = {}) {
        const html = generateTransportManifest(passengers, flight, options);
        openDocument(html);
    }
    
    // ==========================================
    // EXCEL EXPORT
    // ==========================================
    
    // Export data to Excel file
    // columns: array of { key: 'fieldName', header: 'Hebrew Header' }
    function exportToExcel(data, columns, filename) {
        // Ensure XLSX is loaded
        if (typeof XLSX === 'undefined') {
            alert('שגיאה: ספריית Excel לא נטענה. נסה לרענן את הדף.');
            return;
        }
        
        // Create header row
        const headers = columns.map(c => c.header);
        
        // Create data rows
        const rows = data.map(item => 
            columns.map(c => {
                const value = item[c.key];
                if (value === true) return '✓';
                if (value === false) return '-';
                if (value === null || value === undefined) return '';
                return value;
            })
        );
        
        // Combine headers and data
        const wsData = [headers, ...rows];
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Auto-size columns
        const colWidths = columns.map((col, i) => {
            const headerLen = col.header.length;
            const maxDataLen = Math.max(...rows.map(row => String(row[i] || '').length));
            return { wch: Math.max(headerLen, maxDataLen, 10) + 2 };
        });
        ws['!cols'] = colWidths;
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'רשימה');
        
        // Generate filename with date
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
        const fullFilename = `${filename}-${dateStr}.xlsx`;
        
        // Download
        XLSX.writeFile(wb, fullFilename);
    }
    
    // Export passenger list to Excel
    function exportPassengerListToExcel(passengers, flight) {
        const columns = [
            { key: '_index', header: '#' },
            { key: 'first_name', header: 'שם פרטי' },
            { key: 'last_name', header: 'שם משפחה' },
            { key: 'phone', header: 'טלפון' },
            { key: 'has_outbound', header: 'הלוך' },
            { key: 'has_return', header: 'חזור' },
            { key: 'hotel_name', header: 'מלון' },
            { key: 'hotel_booking_ref', header: 'אישור מלון' },
            { key: 'agent_name', header: 'סוכן' }
        ];
        
        const data = passengers.map((p, i) => ({ ...p, _index: i + 1 }));
        exportToExcel(data, columns, `passengers-${flight.destination}`);
    }
    
    // Export airline manifest to Excel
    function exportAirlineManifestToExcel(passengers, flight, options = {}) {
        const leg = options.leg || 'both';
        
        let filteredPassengers = passengers;
        let legName = 'all';
        
        if (leg === 'outbound') {
            filteredPassengers = passengers.filter(p => p.has_outbound !== false);
            legName = 'outbound';
        } else if (leg === 'return') {
            filteredPassengers = passengers.filter(p => p.has_return !== false);
            legName = 'return';
        }
        
        const columns = [
            { key: '_index', header: '#' },
            { key: 'first_name', header: 'שם פרטי' },
            { key: 'last_name', header: 'שם משפחה' },
            { key: 'phone', header: 'טלפון' },
            { key: 'has_outbound', header: 'הלוך' },
            { key: 'has_return', header: 'חזור' },
            { key: 'booking_ref', header: 'מס׳ הזמנה / PNR' },
            { key: 'special_notes', header: 'הערות' }
        ];
        
        const data = filteredPassengers.map((p, i) => ({ ...p, _index: i + 1 }));
        exportToExcel(data, columns, `airline-manifest-${legName}-${flight.destination}`);
    }
    
    // Export hotel list to Excel
    function exportHotelListToExcel(passengers, flight) {
        const columns = [
            { key: '_index', header: '#' },
            { key: 'first_name', header: 'שם פרטי' },
            { key: 'last_name', header: 'שם משפחה' },
            { key: 'phone', header: 'טלפון' },
            { key: 'hotel_name', header: 'מלון' },
            { key: 'hotel_booking_ref', header: 'מס׳ אישור' },
            { key: 'room_group_name', header: 'קבוצת חדר' },
            { key: 'special_notes', header: 'בקשות מיוחדות' }
        ];
        
        // Sort by hotel name
        const sortedPassengers = [...passengers].sort((a, b) => {
            const hotelA = (a.hotel_name || 'ללא מלון').toLowerCase();
            const hotelB = (b.hotel_name || 'ללא מלון').toLowerCase();
            return hotelA.localeCompare(hotelB, 'he');
        });
        
        const data = sortedPassengers.map((p, i) => ({ ...p, _index: i + 1 }));
        exportToExcel(data, columns, `hotel-list-${flight.destination}`);
    }
    
    // Export transport manifest to Excel
    function exportTransportManifestToExcel(passengers, flight) {
        const columns = [
            { key: '_index', header: '#' },
            { key: 'first_name', header: 'שם פרטי' },
            { key: 'last_name', header: 'שם משפחה' },
            { key: 'phone', header: 'טלפון' },
            { key: 'hotel_name', header: 'נקודת איסוף / מלון' },
            { key: 'special_notes', header: 'הערות' }
        ];
        
        // Sort by hotel name for efficient pickup route
        const sortedPassengers = [...passengers].sort((a, b) => {
            const hotelA = (a.hotel_name || 'ללא מלון').toLowerCase();
            const hotelB = (b.hotel_name || 'ללא מלון').toLowerCase();
            return hotelA.localeCompare(hotelB, 'he');
        });
        
        const data = sortedPassengers.map((p, i) => ({ ...p, _index: i + 1 }));
        exportToExcel(data, columns, `transport-${flight.destination}`);
    }
    
    // Expose to global scope
    window.LordDocs = {
        // Original functions
        generateReceipt,
        generateInvoice,
        generatePassengerList,
        generateHotelList,
        printReceipt,
        printInvoice,
        printPassengerList,
        printHotelList,
        openDocument,
        generateDocNumber,
        formatDate,
        formatCurrency,
        
        // Supplier manifests
        generateAirlineManifest,
        printAirlineManifest,
        generateTransportManifest,
        printTransportManifest,
        
        // Excel exports
        exportToExcel,
        exportPassengerListToExcel,
        exportAirlineManifestToExcel,
        exportHotelListToExcel,
        exportTransportManifestToExcel
    };
})();
