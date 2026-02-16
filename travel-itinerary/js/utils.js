/* ================================================
   UTILITY FUNCTIONS
   ================================================ */

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Build a Google Maps search URL from a query string
 */
function buildMapsUrl(mapsQuery) {
    if (!mapsQuery) return null;
    return `https://www.google.com/maps/search/${encodeURIComponent(mapsQuery)}`;
}

/**
 * Format a date string for display (Hebrew)
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Format date range
 */
function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return '';
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Get Hebrew day of week from date string
 */
const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getHebrewDay(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return HEBREW_DAYS[date.getDay()];
    } catch {
        return '';
    }
}

/**
 * Format a fee object for display
 */
function formatFee(fee) {
    if (!fee || !fee.amount) return null;
    const currency = fee.currency === 'yen' ? '¥' : '₪';
    const perPerson = fee.perPerson ? ' לאדם' : '';
    return `${currency}${fee.amount.toLocaleString()}${perPerson}`;
}

/**
 * Calculate total costs for a day
 */
function calculateDayCosts(day) {
    if (!day || !day.items) return { costs: [], total: 0 };
    const costs = [];
    let total = 0;

    day.items.forEach(item => {
        if (item.fee && item.fee.amount) {
            costs.push({
                item: item.title,
                amount: item.fee.amount,
                currency: item.fee.currency || 'yen',
                perPerson: item.fee.perPerson || false
            });
            total += item.fee.amount;
        }
    });

    if (day.appendix) {
        day.appendix.forEach(item => {
            if (item.fee && item.fee.amount) {
                costs.push({
                    item: item.title + ' (אופציונלי)',
                    amount: item.fee.amount,
                    currency: item.fee.currency || 'yen',
                    perPerson: item.fee.perPerson || false
                });
            }
        });
    }

    return { costs, total };
}

/**
 * Copy text to clipboard with fallback
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textarea);
        return result;
    }
}

/**
 * Generate the client URL for a trip
 */
function getClientUrl(tripId) {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/trip/${tripId}`;
}

/**
 * Show a temporary toast notification
 */
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        color: white;
        z-index: 10000;
        animation: toastIn 0.3s ease, toastOut 0.3s ease 2.5s forwards;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#D32F2F' : '#FF9800'};
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

/**
 * Debounce function
 */
function debounce(fn, delay = 2000) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Generate a simple unique ID
 */
function generateId() {
    return 'd' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * City color map
 */
const CITY_COLORS = {
    'osaka': { primary: '#FF6B35', secondary: '#FF9E4A', gradient: 'linear-gradient(135deg, #FF6B35, #FF9E4A)' },
    'nara': { primary: '#4CAF50', secondary: '#8BC34A', gradient: 'linear-gradient(135deg, #4CAF50, #8BC34A)' },
    'kyoto': { primary: '#9C27B0', secondary: '#CE93D8', gradient: 'linear-gradient(135deg, #9C27B0, #CE93D8)' },
    'tokyo': { primary: '#2196F3', secondary: '#64B5F6', gradient: 'linear-gradient(135deg, #2196F3, #64B5F6)' },
    'fuji': { primary: '#0D47A1', secondary: '#42A5F5', gradient: 'linear-gradient(135deg, #0D47A1, #42A5F5)' },
    'hiroshima': { primary: '#FF5722', secondary: '#FF8A65', gradient: 'linear-gradient(135deg, #FF5722, #FF8A65)' },
    'koyasan': { primary: '#795548', secondary: '#A1887F', gradient: 'linear-gradient(135deg, #795548, #A1887F)' },
    'nagoya': { primary: '#FFC107', secondary: '#FFD54F', gradient: 'linear-gradient(135deg, #FFC107, #FFD54F)' },
    'wazuka': { primary: '#66BB6A', secondary: '#A5D6A7', gradient: 'linear-gradient(135deg, #66BB6A, #A5D6A7)' },
    'kanazawa': { primary: '#00897B', secondary: '#4DB6AC', gradient: 'linear-gradient(135deg, #00897B, #4DB6AC)' },
    'default': { primary: '#5C6BC0', secondary: '#7986CB', gradient: 'linear-gradient(135deg, #5C6BC0, #7986CB)' }
};

function getCityColor(cityEn, dayColor) {
    if (cityEn) {
        const key = cityEn.toLowerCase().replace(/[^a-z]/g, '');
        if (CITY_COLORS[key]) return CITY_COLORS[key];
    }
    if (dayColor && dayColor !== '#5C6BC0') {
        return {
            primary: dayColor,
            secondary: dayColor + '99',
            gradient: `linear-gradient(135deg, ${dayColor}, ${dayColor}99)`
        };
    }
    return CITY_COLORS['default'];
}

function getCityImage(cityEn) {
    if (!cityEn) return '';
    const key = cityEn.toLowerCase().replace(/[^a-z]/g, '');
    return CITY_IMAGES[key] || '';
}

/**
 * City banner images (Unsplash)
 */
const CITY_IMAGES = {
    'osaka': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80',
    'nara': 'https://images.unsplash.com/photo-1624601573012-efb68f3f150d?w=800&q=80',
    'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
    'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
    'fuji': 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80',
    'hiroshima': 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=800&q=80',
    'koyasan': 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
    'nagoya': 'https://images.unsplash.com/photo-1610374792793-f016b77ca51a?w=800&q=80',
    'wazuka': 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&q=80',
    'kanazawa': 'https://images.unsplash.com/photo-1606918801925-e2c914c4b503?w=800&q=80'
};

/**
 * Common emoji options for the form builder
 */
const EMOJI_OPTIONS = [
    '✈', '🚆', '🚌', '🚠', '🚶‍♂️', '🏯', '⛩', '🏨',
    '🍜', '🍣', '🍱', '🍽', '🍡', '🍳', '☕', '🍶',
    '🛍', '🎭', '🎢', '🎮', '🎨', '🎋', '🌸', '🌿',
    '🏮', '🐠', '🦌', '🐵', '🗺', '📸', '🔪', '🧠',
    '💡', '🎟', '🎉', '🏖', '🌳', '🏡', '🖼', '🗼'
];
