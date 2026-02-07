/**
 * Lord Tickets - Dynamic Exposure Tracker
 * Pure calculation functions for deposit tracking, break-even analysis, and risk alerts.
 * No DOM interaction — consumed by flight-detail.html, calendar.html, analytics.html.
 */

const Exposure = (() => {

    // ==========================================
    // Utility: Get effective amount for a milestone
    // ==========================================
    function getEffectiveAmount(milestone, totalSeats) {
        const amount = parseFloat(milestone.amount) || 0;
        if (milestone.amount_type === 'per_seat') {
            return amount * (totalSeats || 0);
        }
        return amount;
    }

    // ==========================================
    // Utility: Days between two dates
    // ==========================================
    function daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    }

    // ==========================================
    // Utility: Get today as YYYY-MM-DD
    // ==========================================
    function today() {
        return new Date().toISOString().split('T')[0];
    }

    // ==========================================
    // Core: Calculate Exposure
    // ==========================================
    /**
     * @param {Object} flight - Flight object with total_seats, cost_price, selling_price
     * @param {Array} milestones - Array of deposit_milestones rows
     * @param {Array} passengers - Array of passenger rows (active only recommended)
     * @returns {Object} Exposure data
     */
    function calculateExposure(flight, milestones, passengers) {
        // Handle no milestones case
        if (!milestones || milestones.length === 0) {
            return {
                hasMilestones: false,
                totalObligations: 0,
                depositsPaid: 0,
                depositsRemaining: 0,
                cashIn: 0,
                cashOut: 0,
                exposure: 0,
                activePassengers: 0
            };
        }

        const totalSeats = parseInt(flight?.total_seats) || 0;
        const activePassengers = (passengers || []).filter(p => p.status === 'active' || !p.status);

        // Total obligations = sum of all non-cancelled milestone effective amounts
        const activeMilestones = milestones.filter(m => m.status !== 'cancelled');
        const totalObligations = activeMilestones.reduce((sum, m) => {
            return sum + getEffectiveAmount(m, totalSeats);
        }, 0);

        // Deposits paid = sum of paid_amount across all milestones
        const depositsPaid = activeMilestones.reduce((sum, m) => {
            return sum + (parseFloat(m.paid_amount) || 0);
        }, 0);

        const depositsRemaining = totalObligations - depositsPaid;

        // Cash in = booked revenue from active passengers (fallback to selling_price)
        const flightPrice = parseFloat(flight?.selling_price) || 0;
        const cashIn = activePassengers.reduce((sum, p) => {
            const pp = parseFloat(p.price_paid);
            return sum + ((pp > 0) ? pp : flightPrice);
        }, 0);

        // Cash out = deposits already paid to airline
        const cashOut = depositsPaid;

        // Exposure = cash collected minus what we've paid out to suppliers
        // Positive = surplus (we've collected more than we've paid)
        // Negative = deficit (we've paid more than we've collected)
        const exposure = cashIn - depositsPaid;

        return {
            hasMilestones: true,
            totalObligations,
            depositsPaid,
            depositsRemaining,
            cashIn,
            cashOut,
            exposure,
            activePassengers: activePassengers.length
        };
    }

    // ==========================================
    // Core: Dynamic Break-Even
    // ==========================================
    /**
     * @param {Object} flight - Flight object
     * @param {Array} milestones - Array of deposit_milestones rows
     * @param {Array} passengers - Array of active passengers
     * @param {string} asOfDate - Date string (YYYY-MM-DD). Defaults to next milestone due date.
     * @returns {Object} Break-even data
     */
    function dynamicBreakEven(flight, milestones, passengers, asOfDate) {
        if (!milestones || milestones.length === 0) {
            return {
                hasMilestones: false,
                cumulativeDepositsDue: 0,
                avgTicketPrice: 0,
                ticketsNeeded: 0,
                ticketsSold: 0,
                gap: 0,
                asOfDate: null
            };
        }

        const totalSeats = parseInt(flight?.total_seats) || 0;
        const activePassengers = (passengers || []).filter(p => p.status === 'active' || !p.status);
        const ticketsSold = activePassengers.length;

        // If no date provided, use next pending milestone due date
        if (!asOfDate) {
            const nextPending = getNextPendingMilestone(milestones);
            asOfDate = nextPending ? nextPending.due_date : today();
        }

        // Cumulative deposits due up to asOfDate (minus what's already paid)
        const activeMilestones = milestones.filter(m => m.status !== 'cancelled');
        const cumulativeDepositsDue = activeMilestones
            .filter(m => m.due_date <= asOfDate)
            .reduce((sum, m) => {
                const effective = getEffectiveAmount(m, totalSeats);
                const paid = parseFloat(m.paid_amount) || 0;
                return sum + Math.max(0, effective - paid);
            }, 0);

        // Average ticket price
        const flightPrice = parseFloat(flight?.selling_price) || 0;
        let avgTicketPrice = flightPrice;
        if (activePassengers.length > 0) {
            const totalRevenue = activePassengers.reduce((sum, p) => {
                const pp = parseFloat(p.price_paid);
                return sum + ((pp > 0) ? pp : flightPrice);
            }, 0);
            avgTicketPrice = totalRevenue / activePassengers.length;
        }

        // Tickets needed to cover cumulative deposits
        const ticketsNeeded = avgTicketPrice > 0
            ? Math.ceil(cumulativeDepositsDue / avgTicketPrice)
            : 0;

        const gap = ticketsNeeded - ticketsSold;

        return {
            hasMilestones: true,
            cumulativeDepositsDue,
            avgTicketPrice,
            ticketsNeeded,
            ticketsSold,
            gap: Math.max(0, gap),
            asOfDate
        };
    }

    // ==========================================
    // Core: Gap Analysis
    // ==========================================
    /**
     * Finds the next unpaid/partially-paid milestone and calculates the gap.
     * @param {Object} flight - Flight object
     * @param {Array} milestones - Array of deposit_milestones rows
     * @param {Array} passengers - Array of active passengers
     * @returns {Object|null} Gap analysis data, or null if no pending milestones
     */
    function gapAnalysis(flight, milestones, passengers) {
        const nextMilestone = getNextPendingMilestone(milestones);
        if (!nextMilestone) return null;

        const totalSeats = parseInt(flight?.total_seats) || 0;
        const activePassengers = (passengers || []).filter(p => p.status === 'active' || !p.status);
        const flightPrice = parseFloat(flight?.selling_price) || 0;

        const effectiveAmount = getEffectiveAmount(nextMilestone, totalSeats);
        const alreadyPaid = parseFloat(nextMilestone.paid_amount) || 0;
        const remaining = effectiveAmount - alreadyPaid;

        // Cash in from passengers
        const cashIn = activePassengers.reduce((sum, p) => {
            return sum + (parseFloat(p.price_paid) || 0);
        }, 0);

        // Gap = what's still needed for this milestone minus cash available
        const gap = remaining - cashIn;
        const daysUntilDue = daysBetween(today(), nextMilestone.due_date);

        // Average ticket price for "tickets needed" calculation
        let avgTicketPrice = flightPrice;
        if (activePassengers.length > 0) {
            avgTicketPrice = cashIn / activePassengers.length;
        }

        const ticketsNeeded = (gap > 0 && avgTicketPrice > 0)
            ? Math.ceil(gap / avgTicketPrice)
            : 0;

        return {
            nextMilestone,
            effectiveAmount,
            alreadyPaid,
            remaining,
            cashIn,
            gap: Math.max(0, gap),
            hasGap: gap > 0,
            daysUntilDue,
            ticketsNeeded
        };
    }

    // ==========================================
    // Core: Generate Alerts
    // ==========================================
    /**
     * @param {Object} flight - Flight object
     * @param {Array} milestones - Array of deposit_milestones rows
     * @param {Array} passengers - Array of active passengers
     * @param {Object} thresholds - { critical: 3, warning: 7, info: 14 } (days)
     * @returns {Array} Array of alert objects
     */
    function generateAlerts(flight, milestones, passengers, thresholds) {
        if (!milestones || milestones.length === 0) return [];

        const defaults = { critical: 3, warning: 7, info: 14 };
        const t = { ...defaults, ...(thresholds || {}) };
        const alerts = [];
        const totalSeats = parseInt(flight?.total_seats) || 0;
        const todayStr = today();

        const activePassengers = (passengers || []).filter(p => p.status === 'active' || !p.status);
        const cashIn = activePassengers.reduce((sum, p) => {
            return sum + (parseFloat(p.price_paid) || 0);
        }, 0);

        // Check each non-cancelled, non-paid milestone
        const pendingMilestones = milestones.filter(m =>
            m.status !== 'cancelled' && m.status !== 'paid'
        );

        pendingMilestones.forEach(m => {
            const daysUntilDue = daysBetween(todayStr, m.due_date);
            const effectiveAmount = getEffectiveAmount(m, totalSeats);
            const remaining = effectiveAmount - (parseFloat(m.paid_amount) || 0);

            // Cumulative deposits due up to this milestone
            const cumulativeDue = milestones
                .filter(ms => ms.status !== 'cancelled' && ms.due_date <= m.due_date)
                .reduce((sum, ms) => {
                    return sum + getEffectiveAmount(ms, totalSeats) - (parseFloat(ms.paid_amount) || 0);
                }, 0);

            const hasNegativeBalance = cashIn < cumulativeDue;

            // Overdue
            if (daysUntilDue < 0) {
                alerts.push({
                    type: 'risk',
                    severity: 'critical',
                    message: `תשלום "${m.name}" באיחור של ${Math.abs(daysUntilDue)} ימים! סכום נותר: $${remaining.toLocaleString()}`,
                    messageEn: `Payment "${m.name}" is ${Math.abs(daysUntilDue)} days overdue! Remaining: $${remaining.toLocaleString()}`,
                    milestone: m,
                    daysUntilDue
                });
            }
            // Critical: due within critical threshold AND negative balance
            else if (daysUntilDue <= t.critical && hasNegativeBalance) {
                alerts.push({
                    type: 'risk',
                    severity: 'critical',
                    message: `תשלום "${m.name}" בעוד ${daysUntilDue} ימים, יתרה שלילית! חסרים $${(cumulativeDue - cashIn).toLocaleString()}`,
                    messageEn: `Payment "${m.name}" due in ${daysUntilDue} days with negative balance! Gap: $${(cumulativeDue - cashIn).toLocaleString()}`,
                    milestone: m,
                    daysUntilDue
                });
            }
            // Warning: due within warning threshold
            else if (daysUntilDue <= t.warning) {
                if (hasNegativeBalance) {
                    alerts.push({
                        type: 'risk',
                        severity: 'warning',
                        message: `תשלום "${m.name}" בעוד ${daysUntilDue} ימים. חסרים $${(cumulativeDue - cashIn).toLocaleString()} לכיסוי`,
                        messageEn: `Payment "${m.name}" due in ${daysUntilDue} days. Gap: $${(cumulativeDue - cashIn).toLocaleString()}`,
                        milestone: m,
                        daysUntilDue
                    });
                } else {
                    alerts.push({
                        type: 'time',
                        severity: 'warning',
                        message: `תשלום "${m.name}" ($${remaining.toLocaleString()}) בעוד ${daysUntilDue} ימים`,
                        messageEn: `Payment "${m.name}" ($${remaining.toLocaleString()}) due in ${daysUntilDue} days`,
                        milestone: m,
                        daysUntilDue
                    });
                }
            }
            // Info: due within info threshold
            else if (daysUntilDue <= t.info) {
                alerts.push({
                    type: 'time',
                    severity: 'info',
                    message: `תשלום "${m.name}" ($${remaining.toLocaleString()}) בעוד ${daysUntilDue} ימים`,
                    messageEn: `Payment "${m.name}" ($${remaining.toLocaleString()}) due in ${daysUntilDue} days`,
                    milestone: m,
                    daysUntilDue
                });
            }
        });

        // Sort by severity: critical first, then warning, then info
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return alerts;
    }

    // ==========================================
    // UI Helper: Get milestone color/status class
    // ==========================================
    /**
     * @param {Object} milestone - A single milestone object
     * @returns {Object} { color, cssClass, label, labelHe }
     */
    function getMilestoneColor(milestone) {
        if (!milestone) return { color: '#999', cssClass: 'pending', label: 'Unknown', labelHe: 'לא ידוע' };

        const daysUntilDue = daysBetween(today(), milestone.due_date);

        if (milestone.status === 'paid') {
            return { color: '#28A745', cssClass: 'paid', label: 'Paid', labelHe: 'שולם' };
        }
        if (milestone.status === 'cancelled') {
            return { color: '#999', cssClass: 'cancelled', label: 'Cancelled', labelHe: 'בוטל' };
        }
        if (milestone.status === 'partial') {
            if (daysUntilDue <= 3) {
                return { color: '#DC3545', cssClass: 'partial-urgent', label: 'Partial - Urgent', labelHe: 'חלקי - דחוף' };
            }
            return { color: '#007BFF', cssClass: 'partial', label: 'Partial', labelHe: 'חלקי' };
        }
        // pending or overdue
        if (daysUntilDue < 0) {
            return { color: '#DC3545', cssClass: 'overdue', label: 'Overdue', labelHe: 'באיחור' };
        }
        if (daysUntilDue <= 3) {
            return { color: '#DC3545', cssClass: 'due-critical', label: 'Due Soon', labelHe: 'דחוף' };
        }
        if (daysUntilDue <= 7) {
            return { color: '#FFC107', cssClass: 'due-soon', label: 'Due Soon', labelHe: 'בקרוב' };
        }
        return { color: '#6C757D', cssClass: 'pending', label: 'Pending', labelHe: 'ממתין' };
    }

    // ==========================================
    // UI Helper: Get flight-level risk status
    // ==========================================
    /**
     * Returns a risk level for a flight based on its milestones.
     * Used for inventory badges and calendar indicators.
     * @param {Array} milestones - Array of milestones for a single flight
     * @returns {Object} { level: 'green'|'amber'|'red'|'none', label, labelHe }
     */
    function getFlightRiskLevel(milestones) {
        if (!milestones || milestones.length === 0) {
            return { level: 'none', label: 'No schedule', labelHe: 'ללא לוח תשלומים' };
        }

        const pendingMilestones = milestones.filter(m =>
            m.status !== 'cancelled' && m.status !== 'paid'
        );

        if (pendingMilestones.length === 0) {
            return { level: 'green', label: 'All paid', labelHe: 'הכל שולם' };
        }

        const todayStr = today();
        let hasOverdue = false;
        let hasCritical = false;
        let hasWarning = false;

        pendingMilestones.forEach(m => {
            const daysUntilDue = daysBetween(todayStr, m.due_date);
            if (daysUntilDue < 0) hasOverdue = true;
            else if (daysUntilDue <= 3) hasCritical = true;
            else if (daysUntilDue <= 14) hasWarning = true;
        });

        if (hasOverdue || hasCritical) {
            return { level: 'red', label: 'Critical', labelHe: 'קריטי' };
        }
        if (hasWarning) {
            return { level: 'amber', label: 'Attention', labelHe: 'דורש תשומת לב' };
        }
        return { level: 'green', label: 'On track', labelHe: 'תקין' };
    }

    // ==========================================
    // Helper: Get next pending/partial milestone
    // ==========================================
    function getNextPendingMilestone(milestones) {
        if (!milestones || milestones.length === 0) return null;

        return milestones
            .filter(m => m.status === 'pending' || m.status === 'partial' || m.status === 'overdue')
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0] || null;
    }

    // ==========================================
    // Helper: Apply template to flight
    // ==========================================
    /**
     * Converts a template's milestones JSONB into concrete milestone objects.
     * @param {Object} template - deposit_templates row
     * @param {Object} flight - Flight object with departure_date, cost_price, total_seats
     * @returns {Array} Array of milestone objects ready for INSERT (without id, flight_id, created_at, updated_at)
     */
    function applyTemplate(template, flight) {
        if (!template || !template.milestones || !Array.isArray(template.milestones)) return [];

        const departureDate = new Date(flight.departure_date);
        const costPrice = parseFloat(flight.cost_price) || 0;
        const totalSeats = parseInt(flight.total_seats) || 0;
        const totalCost = costPrice * totalSeats;

        return template.milestones.map((m, index) => {
            // Calculate due date: departure_date minus days_before_departure
            const dueDate = new Date(departureDate);
            dueDate.setDate(dueDate.getDate() - (parseInt(m.days_before_departure) || 0));

            // Calculate amount from percentage
            const amountPct = parseFloat(m.amount_pct) || 0;
            let amount;
            if (m.amount_type === 'per_seat') {
                amount = (costPrice * amountPct) / 100;
            } else {
                amount = (totalCost * amountPct) / 100;
            }

            return {
                name: m.name || `תשלום ${index + 1}`,
                due_date: dueDate.toISOString().split('T')[0],
                amount_type: m.amount_type || 'global',
                amount: Math.round(amount * 100) / 100,
                status: 'pending',
                paid_amount: 0,
                sort_order: index
            };
        });
    }

    // ==========================================
    // Helper: Convert milestones to template format
    // ==========================================
    /**
     * Converts existing milestones into the JSONB format for saving as a template.
     * @param {Array} milestones - Array of deposit_milestones rows
     * @param {Object} flight - Flight object
     * @returns {Array} JSONB-ready array for deposit_templates.milestones
     */
    function milestonesToTemplate(milestones, flight) {
        if (!milestones || milestones.length === 0) return [];

        const departureDate = new Date(flight.departure_date);
        const costPrice = parseFloat(flight.cost_price) || 0;
        const totalSeats = parseInt(flight.total_seats) || 0;
        const totalCost = costPrice * totalSeats;

        return milestones
            .filter(m => m.status !== 'cancelled')
            .map(m => {
                const dueDate = new Date(m.due_date);
                const daysBefore = daysBetween(m.due_date, flight.departure_date);

                const effectiveAmount = getEffectiveAmount(m, totalSeats);
                let amountPct = 0;
                if (m.amount_type === 'per_seat' && costPrice > 0) {
                    amountPct = (parseFloat(m.amount) / costPrice) * 100;
                } else if (totalCost > 0) {
                    amountPct = (effectiveAmount / totalCost) * 100;
                }

                return {
                    name: m.name,
                    days_before_departure: Math.max(0, daysBefore),
                    amount_type: m.amount_type || 'global',
                    amount_pct: Math.round(amountPct * 100) / 100
                };
            });
    }

    // ==========================================
    // Audit Log Helper
    // ==========================================
    /**
     * Logs an action to the audit_log table via Supabase REST API.
     * @param {string} supabaseUrl - Supabase URL
     * @param {string} authToken - Access token or API key
     * @param {Object} params - { action, tableName, recordId, oldValues, newValues, userId, userEmail }
     */
    async function logAuditEvent(supabaseUrl, authToken, params) {
        try {
            const body = {
                user_id: params.userId || null,
                user_email: params.userEmail || null,
                action: params.action,
                table_name: params.tableName,
                record_id: params.recordId || null,
                old_values: params.oldValues || null,
                new_values: params.newValues || null
            };

            await fetch(`${supabaseUrl}/rest/v1/audit_log`, {
                method: 'POST',
                headers: {
                    'apikey': authToken,
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(body)
            });
        } catch (error) {
            console.error('Failed to log audit event:', error);
            // Non-blocking: don't throw, audit logging failure shouldn't break operations
        }
    }

    // ==========================================
    // Public API
    // ==========================================
    return {
        calculateExposure,
        dynamicBreakEven,
        gapAnalysis,
        generateAlerts,
        getMilestoneColor,
        getFlightRiskLevel,
        getNextPendingMilestone,
        getEffectiveAmount,
        applyTemplate,
        milestonesToTemplate,
        logAuditEvent,
        daysBetween
    };

})();
