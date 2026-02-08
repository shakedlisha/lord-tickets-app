// Lord Tickets - Navigation Component
// Include this script in all pages to add the top navigation bar
// Supports two app contexts: Flights and Tickets (Events)

(function() {
    'use strict';
    
    // Role labels in Hebrew
    const roleLabels = {
        admin: 'מנהל',
        manager: 'מנהל צוות',
        agent: 'סוכן',
        guest: 'אורח'
    };
    
    // App contexts
    const APP_FLIGHTS = 'flights';
    const APP_TICKETS = 'tickets';
    
    // Detect current app context from URL
    function detectAppContext() {
        const page = window.location.pathname.split('/').pop() || '';
        if (page.startsWith('tickets-') || page === 'ticket-detail.html') {
            return APP_TICKETS;
        }
        return APP_FLIGHTS;
    }
    
    // Get current app context
    function getAppContext() {
        return detectAppContext();
    }
    
    // Navigation HTML
    function getNavHTML(currentPage) {
        const userRole = localStorage.getItem('userRole') || 'agent';
        const userName = localStorage.getItem('userName') || 'אורח';
        const isDemo = JSON.parse(localStorage.getItem('userSession') || '{}').demo;
        
        const roleLabel = roleLabels[userRole] || userRole;
        const displayRole = isDemo ? 'מצב הדגמה' : roleLabel;
        
        // Determine which nav items to show based on role
        const showAdminLinks = userRole === 'admin' || userRole === 'manager';
        const isGuest = userRole === 'guest';
        
        const appContext = detectAppContext();
        const isFlights = appContext === APP_FLIGHTS;
        const isTickets = appContext === APP_TICKETS;
        
        const appLogo = isTickets ? '🎫' : '✈️';
        const appTitle = isTickets ? 'Lord Tickets - אירועים' : 'Lord Tickets';
        
        // Build nav links based on context
        let navLinks = '';
        
        if (isFlights) {
            // FLIGHTS nav links (original)
            navLinks = `
                <a href="inventory.html" class="nav-link ${currentPage === 'inventory' ? 'active' : ''}">
                    <span class="material-icons">flight</span>
                    מלאי טיסות
                </a>
                ${!isGuest ? `
                    <a href="calendar.html" class="nav-link ${currentPage === 'calendar' ? 'active' : ''}">
                        <span class="material-icons">calendar_month</span>
                        לוח שנה
                    </a>
                ` : ''}
                <a href="quote.html" class="nav-link ${currentPage === 'quote' ? 'active' : ''}">
                    <span class="material-icons">receipt_long</span>
                    מחולל הצעות
                </a>
                ${showAdminLinks ? `
                    <a href="analytics.html" class="nav-link ${currentPage === 'analytics' ? 'active' : ''}">
                        <span class="material-icons">analytics</span>
                        לוח בקרה
                    </a>
                    <a href="reports.html" class="nav-link ${currentPage === 'reports' ? 'active' : ''}">
                        <span class="material-icons">assessment</span>
                        דוחות
                    </a>
                    <a href="users.html" class="nav-link ${currentPage === 'users' ? 'active' : ''}">
                        <span class="material-icons">people</span>
                        ניהול משתמשים
                    </a>
                ` : ''}
            `;
        } else {
            // TICKETS nav links
            navLinks = `
                <a href="tickets-inventory.html" class="nav-link ${currentPage === 'tickets-inventory' ? 'active' : ''}">
                    <span class="material-icons">confirmation_number</span>
                    מלאי כרטיסים
                </a>
                ${!isGuest ? `
                    <a href="tickets-calendar.html" class="nav-link ${currentPage === 'tickets-calendar' ? 'active' : ''}">
                        <span class="material-icons">calendar_month</span>
                        לוח אירועים
                    </a>
                ` : ''}
                <a href="tickets-sales.html" class="nav-link ${currentPage === 'tickets-sales' ? 'active' : ''}">
                    <span class="material-icons">point_of_sale</span>
                    מכירות
                </a>
                ${showAdminLinks ? `
                    <a href="tickets-analytics.html" class="nav-link ${currentPage === 'tickets-analytics' ? 'active' : ''}">
                        <span class="material-icons">analytics</span>
                        לוח בקרה
                    </a>
                    <a href="tickets-reports.html" class="nav-link ${currentPage === 'tickets-reports' ? 'active' : ''}">
                        <span class="material-icons">assessment</span>
                        דוחות
                    </a>
                    <a href="users.html" class="nav-link ${currentPage === 'users' ? 'active' : ''}">
                        <span class="material-icons">people</span>
                        ניהול משתמשים
                    </a>
                ` : ''}
            `;
        }
        
        // App switcher dropdown items
        const switchTarget = isFlights ? 'tickets-inventory.html' : 'inventory.html';
        const switchLabel = isFlights ? '🎫 אירועים וכרטיסים' : '✈️ טיסות';
        
        return `
            <nav class="lord-nav">
                <div class="nav-brand">
                    <div class="app-switcher" onclick="LordNav.toggleAppMenu(event)">
                        <span class="nav-logo">${appLogo}</span>
                        <span class="nav-title">${appTitle}</span>
                        <span class="material-icons app-switcher-arrow">expand_more</span>
                        <div class="app-switcher-menu" id="appSwitcherMenu">
                            <a href="inventory.html" class="app-switcher-item ${isFlights ? 'active' : ''}">
                                <span>✈️</span>
                                <span>טיסות</span>
                            </a>
                            <a href="tickets-inventory.html" class="app-switcher-item ${isTickets ? 'active' : ''}">
                                <span>🎫</span>
                                <span>אירועים וכרטיסים</span>
                            </a>
                        </div>
                    </div>
                </div>
                <div class="nav-links">
                    ${navLinks}
                </div>
                <div class="nav-user">
                    <div class="user-info">
                        <span class="user-name">${escapeHtml(userName)}</span>
                        <span class="user-role">${displayRole}</span>
                    </div>
                    <button class="nav-logout-btn" onclick="LordNav.logout()" title="התנתק">
                        <span class="material-icons">logout</span>
                    </button>
                </div>
            </nav>
        `;
    }
    
    // Navigation CSS
    const navCSS = `
        .lord-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, #1B365D 0%, #0F1F3A 100%);
            padding: 0 30px;
            height: 60px;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .nav-brand {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        /* App Switcher */
        .app-switcher {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 8px;
            transition: background 0.2s;
            position: relative;
            user-select: none;
        }
        
        .app-switcher:hover {
            background: rgba(255,255,255,0.1);
        }
        
        .app-switcher-arrow {
            font-size: 1.2rem;
            color: rgba(255,255,255,0.6);
            transition: transform 0.2s;
        }
        
        .app-switcher.open .app-switcher-arrow {
            transform: rotate(180deg);
        }
        
        .app-switcher-menu {
            display: none;
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            background: white;
            border-radius: 10px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            min-width: 220px;
            overflow: hidden;
            z-index: 1001;
        }
        
        .app-switcher-menu.show {
            display: block;
        }
        
        .app-switcher-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 18px;
            text-decoration: none;
            color: #1B365D;
            font-weight: 500;
            font-size: 0.95rem;
            transition: background 0.15s;
        }
        
        .app-switcher-item:hover {
            background: #f5f5f5;
        }
        
        .app-switcher-item.active {
            background: rgba(212, 175, 55, 0.12);
            color: #1B365D;
            font-weight: 600;
        }
        
        .app-switcher-item.active::after {
            content: '✓';
            margin-right: auto;
            margin-left: 8px;
            color: #D4AF37;
            font-weight: 700;
        }
        
        .nav-logo {
            font-size: 1.5rem;
        }
        
        .nav-title {
            font-size: 1.3rem;
            font-weight: 700;
            color: #D4AF37;
        }
        
        .nav-links {
            display: flex;
            gap: 5px;
        }
        
        .nav-link {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 20px;
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            font-size: 0.95rem;
            font-weight: 500;
            border-radius: 8px;
            transition: all 0.2s;
        }
        
        .nav-link:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        
        .nav-link.active {
            background: rgba(212, 175, 55, 0.2);
            color: #D4AF37;
        }
        
        .nav-link .material-icons {
            font-size: 1.2rem;
        }
        
        .nav-user {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .user-info {
            text-align: left;
            direction: ltr;
        }
        
        .user-name {
            display: block;
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
        }
        
        .user-role {
            display: block;
            color: #D4AF37;
            font-size: 0.75rem;
        }
        
        .nav-logout-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 8px;
            color: rgba(255,255,255,0.8);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .nav-logout-btn:hover {
            background: rgba(220, 53, 69, 0.8);
            color: white;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
            .lord-nav {
                padding: 0 15px;
                height: 55px;
            }
            
            .nav-title {
                display: none;
            }
            
            .app-switcher-arrow {
                display: none;
            }
            
            .nav-link span:not(.material-icons) {
                display: none;
            }
            
            .nav-link {
                padding: 10px 12px;
            }
            
            .user-info {
                display: none;
            }
        }
    `;
    
    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Toggle app switcher menu
    function toggleAppMenu(event) {
        event.stopPropagation();
        const switcher = event.currentTarget;
        const menu = switcher.querySelector('.app-switcher-menu');
        const isOpen = menu.classList.contains('show');
        
        // Close menu
        if (isOpen) {
            menu.classList.remove('show');
            switcher.classList.remove('open');
        } else {
            menu.classList.add('show');
            switcher.classList.add('open');
        }
    }
    
    // Initialize navigation
    function init(currentPage) {
        // Add CSS
        const style = document.createElement('style');
        style.textContent = navCSS;
        document.head.appendChild(style);
        
        // Add nav HTML at the beginning of body
        const navContainer = document.createElement('div');
        navContainer.innerHTML = getNavHTML(currentPage);
        document.body.insertBefore(navContainer.firstElementChild, document.body.firstChild);
        
        // Close app switcher on outside click
        document.addEventListener('click', function(e) {
            const menu = document.getElementById('appSwitcherMenu');
            const switcher = document.querySelector('.app-switcher');
            if (menu && !e.target.closest('.app-switcher')) {
                menu.classList.remove('show');
                if (switcher) switcher.classList.remove('open');
            }
        });
    }
    
    // Logout function
    function logout() {
        // Clear all auth-related localStorage
        localStorage.removeItem('userSession');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userCommission');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expires_at');
        localStorage.removeItem('userIsActive');
        
        // Redirect to login
        window.location.href = 'index.html';
    }
    
    // Check if user is authenticated and active
    function checkAuth() {
        const session = localStorage.getItem('userSession');
        if (!session) {
            window.location.href = 'index.html';
            return false;
        }
        
        // Check if user is marked as inactive (pending approval)
        const isActive = localStorage.getItem('userIsActive');
        if (isActive === 'false') {
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    }
    
    // Get current user role
    function getRole() {
        return localStorage.getItem('userRole') || 'agent';
    }
    
    // Check if user has specific role(s)
    function hasRole(...roles) {
        const userRole = getRole();
        return roles.includes(userRole);
    }
    
    // Check if user can perform action
    function canManageUsers() {
        return hasRole('admin', 'manager');
    }
    
    function canDeletePassengers() {
        return hasRole('admin', 'manager');
    }
    
    function canSeeCosts() {
        return hasRole('admin', 'manager');
    }
    
    function canExportData() {
        return hasRole('admin', 'manager');
    }
    
    function canManageFlights() {
        return hasRole('admin', 'manager');
    }
    
    function canManageTickets() {
        return hasRole('admin', 'manager');
    }
    
    // Expose to global scope
    window.LordNav = {
        init,
        logout,
        checkAuth,
        getRole,
        hasRole,
        canManageUsers,
        canDeletePassengers,
        canSeeCosts,
        canExportData,
        canManageFlights,
        canManageTickets,
        getAppContext,
        toggleAppMenu,
        escapeHtml
    };
})();
