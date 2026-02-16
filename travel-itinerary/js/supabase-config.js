/* ================================================
   SUPABASE CONFIG
   ================================================
   Replace these with your Supabase project credentials.
   
   To set up:
   1. Go to https://supabase.com and create a new project (or use existing)
   2. Go to Settings > API
   3. Copy the "Project URL" and "anon public" key
   4. Run the SQL migration from /supabase/001_create_tables.sql in the SQL Editor
   5. Create an admin user in Authentication > Users
   ================================================ */

const SUPABASE_URL = 'https://yestitkcxqjtkaddzyvn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inllc3RpdGtjeHFqdGthZGR6eXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzQ1ODcsImV4cCI6MjA4NjgxMDU4N30.CWifzr0LN7nVHwV7vsITawDtTf4zK19UNiVtr8CYucc';

let supabase;

function initSupabase() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('Supabase not configured. Please update js/supabase-config.js with your credentials.');
        return null;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
}

function getSupabase() {
    return supabase;
}

/* ---- Auth Helpers ---- */

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/* ---- Trips CRUD ---- */

async function fetchTrips() {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('trips')
        .select('id, name, customers, start_date, end_date, days, created_at, updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
}

async function fetchTrip(tripId) {
    const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

    if (error) throw error;
    return data;
}

async function createTrip(tripData) {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('trips')
        .insert({
            ...tripData,
            user_id: session.user.id,
            days: []
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function updateTrip(tripId, updates) {
    const { data, error } = await supabase
        .from('trips')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', tripId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function deleteTrip(tripId) {
    const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

    if (error) throw error;
}

async function duplicateTrip(tripId) {
    const original = await fetchTrip(tripId);
    if (!original) throw new Error('Trip not found');

    const session = await getSession();
    const { data, error } = await supabase
        .from('trips')
        .insert({
            name: original.name + ' (עותק)',
            customers: original.customers,
            start_date: original.start_date,
            end_date: original.end_date,
            days: original.days,
            user_id: session.user.id
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/* ---- AI Preferences ---- */

async function getAiPreferences(tripId) {
    const { data, error } = await supabase
        .from('trips')
        .select('ai_preferences')
        .eq('id', tripId)
        .single();

    if (error) throw error;
    return data?.ai_preferences || AI_CONFIG.preferences.defaults;
}

async function saveAiPreferences(tripId, preferences) {
    const { data, error } = await supabase
        .from('trips')
        .update({ ai_preferences: preferences, updated_at: new Date().toISOString() })
        .eq('id', tripId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/* ---- Attractions CRUD ---- */

async function fetchAttractions(filters = {}) {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    let query = supabase
        .from('attractions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.city_en) query = query.eq('city_en', filters.city_en);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function createAttraction(attractionData) {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('attractions')
        .insert({ ...attractionData, user_id: session.user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function updateAttractionStatus(attractionId, newStatus) {
    const { data, error } = await supabase
        .from('attractions')
        .update({ status: newStatus })
        .eq('id', attractionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/* ---- AI Edge Function Invoke ---- */

async function invokeAiFunction(action, payload) {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const fnUrl = `${SUPABASE_URL}/functions/v1/itinerary-ai`;
    const body = JSON.stringify({ action, ...payload });

    const response = await fetch(fnUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body,
    });

    let data;
    try {
        data = await response.json();
    } catch (e) {
        console.error('AI function: failed to parse response', e);
        throw new Error(AI_CONFIG.errorEnvelope.defaultHebrewMessages.generation_failed);
    }

    if (!response.ok) {
        console.error('AI function error:', response.status, data);
        const code = data?.error?.code || 'generation_failed';
        const msg = AI_CONFIG.errorEnvelope.defaultHebrewMessages[code]
            || data?.error?.message
            || AI_CONFIG.errorEnvelope.defaultHebrewMessages.generation_failed;
        throw new Error(msg);
    }

    if (data?.error) {
        const code = data.error.code || 'generation_failed';
        const msg = AI_CONFIG.errorEnvelope.defaultHebrewMessages[code]
            || AI_CONFIG.errorEnvelope.defaultHebrewMessages.generation_failed;
        throw new Error(msg);
    }

    return data;
}
