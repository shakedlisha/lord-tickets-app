// Lord Tickets - Central Configuration
// Supabase anon key is safe to embed (RLS protects data, not the key)
window.LordConfig = {
    SUPABASE_URL: 'https://asqdpgxizhyazoblpzin.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzcWRwZ3hpemh5YXpvYmxwemluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTM4MDAsImV4cCI6MjA4NDA2OTgwMH0.fbGM02K2QYTDDNBr0vuvXmd1k7qv2AtRQdV13tKDl38'
};

// Auto-set in localStorage so all pages pick it up immediately
(function() {
    const url = localStorage.getItem('supabaseUrl');
    const key = localStorage.getItem('supabaseKey');
    if (!url || !key) {
        localStorage.setItem('supabaseUrl', LordConfig.SUPABASE_URL);
        localStorage.setItem('supabaseKey', LordConfig.SUPABASE_ANON_KEY);
    }
})();
