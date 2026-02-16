/* ================================================
   CHECKLIST - localStorage-based visit tracking
   ================================================ */

const Checklist = {
    STORAGE_KEY: 'trip-checklist',

    /**
     * Get all checked items for a trip
     */
    getAll(tripId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
            return data[tripId] || {};
        } catch {
            return {};
        }
    },

    /**
     * Check if a specific item is checked
     */
    isChecked(tripId, itemId) {
        const items = this.getAll(tripId);
        return !!items[itemId];
    },

    /**
     * Toggle an item's checked state
     */
    toggle(tripId, itemId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
            if (!data[tripId]) data[tripId] = {};
            data[tripId][itemId] = !data[tripId][itemId];
            if (!data[tripId][itemId]) delete data[tripId][itemId];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return !!data[tripId][itemId];
        } catch {
            return false;
        }
    },

    /**
     * Count checked items for a specific day
     */
    countForDay(tripId, day) {
        if (!day || !day.items) return { checked: 0, total: 0 };

        const checkable = day.items.filter(i => i.type !== 'transport');
        const total = checkable.length;
        let checked = 0;

        checkable.forEach(item => {
            if (this.isChecked(tripId, item.id)) checked++;
        });

        return { checked, total };
    },

    /**
     * Count checked items for entire trip
     */
    countForTrip(tripId, days) {
        if (!days) return { checked: 0, total: 0 };

        let checked = 0;
        let total = 0;

        days.forEach(day => {
            const count = this.countForDay(tripId, day);
            checked += count.checked;
            total += count.total;
        });

        return { checked, total };
    },

    /**
     * Get completion percentage for a trip
     */
    getPercent(tripId, days) {
        const { checked, total } = this.countForTrip(tripId, days);
        if (total === 0) return 0;
        return Math.round((checked / total) * 100);
    }
};
