-- ================================================
-- TRAVEL ITINERARY - Supabase Migration
-- ================================================
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)
-- ================================================

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'מסלול חדש',
    customers TEXT DEFAULT '',
    start_date DATE,
    end_date DATE,
    days JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- Index for faster lookups by id (already primary key, but explicit)
CREATE INDEX IF NOT EXISTS idx_trips_id ON trips(id);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can READ any trip (clients access via shareable link)
CREATE POLICY "Public read access"
    ON trips
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can INSERT their own trips
CREATE POLICY "Authenticated users can create trips"
    ON trips
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own trips
CREATE POLICY "Users can update own trips"
    ON trips
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE their own trips
CREATE POLICY "Users can delete own trips"
    ON trips
    FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
