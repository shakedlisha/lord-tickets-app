-- ================================================
-- Migration 002: AI Preferences + Attraction Catalog
-- ================================================
-- Safe additive migration. Does NOT modify existing data.
-- All new columns have defaults so old trips keep working.
-- ================================================

-- 1. Add ai_preferences JSONB to trips (safe default)
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN trips.ai_preferences IS 'Trip-level AI generation preferences (pace, interests, budget, constraints)';

-- 2. Attraction catalog table
CREATE TABLE IF NOT EXISTS attractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,
    name_en TEXT,
    city TEXT NOT NULL,
    city_en TEXT,
    country TEXT DEFAULT 'Japan',
    place_id TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,

    -- Content
    description TEXT,
    category TEXT DEFAULT 'activity',
    emoji TEXT DEFAULT '📍',
    estimated_duration TEXT,
    estimated_cost INTEGER,
    cost_currency TEXT DEFAULT 'yen',
    booking_required BOOLEAN DEFAULT false,
    booking_url TEXT,
    opening_hours TEXT,
    best_time TEXT,
    why_visit TEXT,

    -- Source & Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    source_type TEXT CHECK (source_type IN ('manual', 'ai_generated', 'reddit', 'blog', 'other')),
    source_url TEXT,
    source_note TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE attractions IS 'Candidate attractions with pending/approved workflow for must-do ranking';

-- 3. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attractions_user_status ON attractions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_attractions_city ON attractions(city_en);
CREATE INDEX IF NOT EXISTS idx_attractions_place_id ON attractions(place_id) WHERE place_id IS NOT NULL;

-- 4. Deduplication helper: unique constraint on user + place_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_attractions_user_place ON attractions(user_id, place_id)
WHERE place_id IS NOT NULL;

-- 5. Auto-update updated_at trigger (reuse pattern from 001)
CREATE OR REPLACE FUNCTION update_attractions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_attractions_updated_at ON attractions;
CREATE TRIGGER trigger_attractions_updated_at
    BEFORE UPDATE ON attractions
    FOR EACH ROW
    EXECUTE FUNCTION update_attractions_updated_at();

-- ================================================
-- RLS Policies
-- ================================================

-- Enable RLS on attractions
ALTER TABLE attractions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only see their own attractions
CREATE POLICY attractions_select_own ON attractions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Authenticated users can insert their own attractions
CREATE POLICY attractions_insert_own ON attractions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own attractions
CREATE POLICY attractions_update_own ON attractions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- No delete policy (soft delete only via status = 'archived')
-- Physical deletion is blocked by absence of DELETE policy.

-- Ensure trips RLS still allows ai_preferences read/write
-- (trips already has RLS from 001, the new column is included automatically)
