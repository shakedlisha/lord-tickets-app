/* ================================================
   HASH-BASED ROUTER
   ================================================
   Routes:
     #/admin              -> Login (if not authenticated) or Dashboard
     #/admin/edit/:id     -> Form Builder for a specific trip
     #/admin/attractions  -> Attractions management
     #/trip/:id           -> Client view (public, no auth)
     #/trip/:id/:day      -> Client view deep-linked to a day
   ================================================ */

const Router = {
    currentView: null,
    currentRoute: null,

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    handleRoute() {
        const hash = window.location.hash || '#/admin';
        const parts = hash.replace('#/', '').split('/');

        this.hideAllViews();
        this.hideLoading();

        if (parts[0] === 'trip' && parts[1]) {
            this.showView('view-trip');
            this.currentRoute = {
                page: 'trip',
                tripId: parts[1],
                dayId: parts[2] || null
            };
            if (typeof ClientView !== 'undefined') {
                ClientView.load(parts[1], parts[2] || null);
            }
        } else if (parts[0] === 'admin') {
            if (parts[1] === 'edit' && parts[2]) {
                this.currentRoute = {
                    page: 'editor',
                    tripId: parts[2]
                };
                this.checkAuthThen(() => {
                    this.showView('view-editor');
                    if (typeof AdminForm !== 'undefined') {
                        AdminForm.load(parts[2]);
                    }
                });
            } else if (parts[1] === 'attractions') {
                this.currentRoute = { page: 'attractions' };
                this.checkAuthThen(() => {
                    this.showView('view-attractions');
                    if (typeof AdminAttractions !== 'undefined') {
                        AdminAttractions.load();
                    }
                });
            } else {
                this.currentRoute = { page: 'dashboard' };
                this.checkAuthThen(() => {
                    this.showView('view-dashboard');
                    if (typeof AdminDashboard !== 'undefined') {
                        AdminDashboard.load();
                    }
                });
            }
        } else {
            window.location.hash = '#/admin';
        }
    },

    async checkAuthThen(callback) {
        try {
            const session = await getSession();
            if (session) {
                callback();
            } else {
                this.showView('view-login');
                this.currentRoute = { page: 'login' };
            }
        } catch (e) {
            console.error('Auth check failed:', e);
            this.showView('view-login');
        }
    },

    showView(viewId) {
        const view = document.getElementById(viewId);
        if (view) {
            view.style.display = '';
            this.currentView = viewId;
        }
    },

    hideAllViews() {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    },

    hideLoading() {
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';
        const app = document.getElementById('app');
        if (app) app.style.display = '';
    },

    navigate(hash) {
        window.location.hash = hash;
    }
};

/* ---- Initialize on DOM Ready ---- */
document.addEventListener('DOMContentLoaded', () => {
    let sb;
    try {
        sb = initSupabase();
    } catch (e) {
        console.error('Supabase init failed:', e);
        sb = null;
    }

    if (!sb) {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = '';
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        const errDiv = document.createElement('div');
        errDiv.className = 'empty-state';
        errDiv.style.minHeight = '100vh';
        errDiv.innerHTML = `
            <span class="empty-icon">⚙️</span>
            <h2>הגדרת Supabase נדרשת</h2>
            <p>עדכנו את הקובץ <code dir="ltr">js/supabase-config.js</code> עם פרטי הפרויקט שלכם</p>
            <br>
            <p dir="ltr" style="font-size:13px;color:#999;">
                1. Go to supabase.com &rarr; Create project<br>
                2. Settings &rarr; API &rarr; Copy URL and anon key<br>
                3. Paste into js/supabase-config.js<br>
                4. Run the SQL migration from supabase/001_create_tables.sql
            </p>
        `;
        document.getElementById('app').appendChild(errDiv);
        return;
    }

    Router.init();

    /* ---- Login Form Handler ---- */
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');

            btn.disabled = true;
            btn.textContent = 'מתחבר...';
            errorEl.style.display = 'none';

            try {
                await signIn(email, password);
                Router.navigate('#/admin');
            } catch (err) {
                errorEl.textContent = 'שגיאה בהתחברות. בדקו אימייל וסיסמה.';
                errorEl.style.display = '';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-icons-round">login</span> התחבר';
            }
        });
    }
});
