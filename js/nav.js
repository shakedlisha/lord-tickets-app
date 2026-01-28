// Lord Tickets - Navigation Component
// Include this script in all pages to add the top navigation bar

(function() {
    'use strict';
    
    // Role labels in Hebrew
    const roleLabels = {
        admin: 'מנהל',
        manager: 'מנהל צוות',
        agent: 'סוכן'
    };
    
    // Navigation HTML
    function getNavHTML(currentPage) {
        const userRole = localStorage.getItem('userRole') || 'agent';
        const userName = localStorage.getItem('userName') || 'אורח';
        const isDemo = JSON.parse(localStorage.getItem('userSession') || '{}').demo;
        
        const roleLabel = roleLabels[userRole] || userRole;
        const displayRole = isDemo ? 'מצב הדגמה' : roleLabel;
        
        // Determine which nav items to show based on role
        const showUsersLink = userRole === 'admin' || userRole === 'manager';
        
        return `
            <nav class="lord-nav">
                <div class="nav-brand">
                    <span class="nav-logo">✈️</span>
                    <span class="nav-title">Lord Tickets</span>
                </div>
                <div class="nav-links">
                    <a href="inventory.html" class="nav-link ${currentPage === 'inventory' ? 'active' : ''}">
                        <span class="material-icons">flight</span>
                        מלאי טיסות
                    </a>
                    ${showUsersLink ? `
                        <a href="analytics.html" class="nav-link ${currentPage === 'analytics' ? 'active' : ''}">
                            <span class="material-icons">analytics</span>
                            לוח בקרה
                        </a>
                        <a href="users.html" class="nav-link ${currentPage === 'users' ? 'active' : ''}">
                            <span class="material-icons">people</span>
                            ניהול משתמשים
                        </a>
                    ` : ''}
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
    }
    
    // Logout function
    function logout() {
        // Clear all auth-related localStorage
        localStorage.removeItem('userSession');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userCommission');
        
        // Redirect to login
        window.location.href = 'login.html';
    }
    
    // Check if user is authenticated
    function checkAuth() {
        const session = localStorage.getItem('userSession');
        if (!session) {
            window.location.href = 'login.html';
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
        escapeHtml
    };
})();
