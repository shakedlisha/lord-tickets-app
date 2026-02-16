/* ================================================
   ADMIN DASHBOARD - Trip list, CRUD operations
   ================================================ */

const AdminDashboard = {
    trips: [],

    async load() {
        const grid = document.getElementById('trips-grid');
        const empty = document.getElementById('no-trips');
        if (grid) grid.innerHTML = '<div class="dashboard-loading"><div class="loading-spinner"></div><p>טוען מסלולים...</p></div>';
        if (empty) empty.style.display = 'none';

        try {
            this.trips = await fetchTrips();
            this.render();
        } catch (e) {
            console.error('Failed to load trips:', e);
            if (grid) grid.innerHTML = '';
            showToast('שגיאה בטעינת המסלולים', 'error');
        }
        this.bindEvents();
    },

    render() {
        const grid = document.getElementById('trips-grid');
        const empty = document.getElementById('no-trips');

        if (!this.trips || this.trips.length === 0) {
            grid.innerHTML = '';
            empty.style.display = '';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = this.trips.map(trip => this.renderTripCard(trip)).join('');
        this.bindCardEvents();
    },

    renderTripCard(trip) {
        const dayCount = trip.days ? trip.days.length : 0;
        const dateRange = trip.start_date && trip.end_date
            ? formatDateRange(trip.start_date, trip.end_date)
            : 'תאריכים לא הוגדרו';

        return `
            <div class="trip-card" data-trip-id="${escapeHtml(trip.id)}">
                <div class="trip-card-header">
                    <div>
                        <div class="trip-card-title">${escapeHtml(trip.name) || 'מסלול ללא שם'}</div>
                        <div class="trip-card-customers">${escapeHtml(trip.customers)}</div>
                    </div>
                </div>
                <div class="trip-card-meta">
                    <span>
                        <span class="material-icons-round">calendar_today</span>
                        ${dateRange}
                    </span>
                    <span>
                        <span class="material-icons-round">map</span>
                        ${dayCount} ימים
                    </span>
                </div>
                <div class="trip-card-actions">
                    <button class="btn btn-primary btn-sm" data-action="edit" data-id="${trip.id}">
                        <span class="material-icons-round">edit</span>
                        עריכה
                    </button>
                    <button class="btn btn-secondary btn-sm" data-action="copy-link" data-id="${trip.id}">
                        <span class="material-icons-round">link</span>
                        העתק קישור
                    </button>
                    <button class="btn btn-ghost btn-sm" data-action="duplicate" data-id="${trip.id}">
                        <span class="material-icons-round">content_copy</span>
                        שכפל
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${trip.id}">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </div>
        `;
    },

    bindEvents() {
        const newBtn = document.getElementById('btn-new-trip');
        if (newBtn) {
            newBtn.onclick = () => this.createNewTrip();
        }

        const attractionsBtn = document.getElementById('btn-attractions');
        if (attractionsBtn) {
            attractionsBtn.onclick = () => Router.navigate('#/admin/attractions');
        }

        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                await signOut();
                Router.navigate('#/admin');
            };
        }
    },

    bindCardEvents() {
        document.querySelectorAll('.trip-card-actions button').forEach(btn => {
            btn.onclick = (e) => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                switch (action) {
                    case 'edit':
                        Router.navigate(`#/admin/edit/${id}`);
                        break;
                    case 'copy-link':
                        this.copyLink(id);
                        break;
                    case 'duplicate':
                        this.duplicateTripAction(id);
                        break;
                    case 'delete':
                        this.deleteTripAction(id);
                        break;
                }
            };
        });
    },

    async createNewTrip() {
        try {
            const trip = await createTrip({
                name: 'מסלול חדש',
                customers: '',
                start_date: null,
                end_date: null
            });
            Router.navigate(`#/admin/edit/${trip.id}`);
            showToast('מסלול חדש נוצר!');
        } catch (e) {
            console.error('Failed to create trip:', e);
            showToast('שגיאה ביצירת מסלול', 'error');
        }
    },

    async copyLink(tripId) {
        const url = getClientUrl(tripId);
        const success = await copyToClipboard(url);
        if (success) {
            showToast('הקישור הועתק! 📋');
        } else {
            showToast('שגיאה בהעתקה', 'error');
        }
    },

    async duplicateTripAction(tripId) {
        try {
            await duplicateTrip(tripId);
            showToast('המסלול שוכפל!');
            this.load();
        } catch (e) {
            console.error('Failed to duplicate:', e);
            showToast('שגיאה בשכפול', 'error');
        }
    },

    async deleteTripAction(tripId) {
        if (!confirm('בטוחים שרוצים למחוק את המסלול?')) return;

        try {
            await deleteTrip(tripId);
            showToast('המסלול נמחק');
            this.load();
        } catch (e) {
            console.error('Failed to delete:', e);
            showToast('שגיאה במחיקה', 'error');
        }
    }
};
